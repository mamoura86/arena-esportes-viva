import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));

async function notifyClassEnrollment(details: {
  code: string; name: string; email: string; sport: string;
  category: string; mainClass: string; planType: string; amount?: number;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "CT Viva Esportes";
  if (!apiKey || !fromEmail) {
    console.warn("Notificação de matrícula não enviada: configuração Brevo ausente.");
    return;
  }
  const recipients = [...new Set([process.env.BOOKING_MANAGER_EMAIL, details.email]
    .filter((email): email is string => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
  if (!recipients.length) return;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Matrícula confirmada — CT Viva Esportes</h2>
    <p><b>Código:</b> ${escapeHtml(details.code)}</p>
    <p><b>Aluno:</b> ${escapeHtml(details.name)}</p>
    <p><b>Modalidade:</b> ${escapeHtml(details.sport)}</p>
    <p><b>Categoria:</b> ${escapeHtml(details.category)}</p>
    <p><b>Turma:</b> ${escapeHtml(details.mainClass)}</p>
    <p><b>Plano:</b> ${escapeHtml(details.planType)}</p>
    ${typeof details.amount === "number" && Number.isFinite(details.amount) ? `<p><b>Valor:</b> R$ ${details.amount.toFixed(2).replace(".", ",")}</p>` : ""}
    <p>Consulte a arena para informações sobre o pagamento.</p>
  </div>`;
  const results = await Promise.allSettled(recipients.map(async (to) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject: `Matrícula confirmada — ${details.code}`,
        htmlContent: html,
      }),
    });
    if (!response.ok) {
      console.error("Brevo rejeitou notificação de matrícula:", to, response.status);
    }
  }));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Falha na notificação de matrícula:", recipients[index], result.reason);
    }
  });
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Schedule = {
  id: string;
  sport: string;
  category: string;
  class_name: string | null;
  class_time: string;
  day_of_week: number;
  active: boolean;
};

function getClassGroups(schedules: Schedule[]) {
  const groups = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    if (!schedule.active || !schedule.sport || !schedule.category || !schedule.class_time) continue;
    const key = JSON.stringify([schedule.sport, schedule.category, schedule.class_name ?? "", schedule.class_time.slice(0, 5)]);
    groups.set(key, [...(groups.get(key) ?? []), schedule]);
  }
  return [...groups.values()].map(entries => {
    const first = entries[0];
    const days = [...new Set(entries.map(entry => Number(entry.day_of_week)))].sort((a, b) => a - b);
    const label = `${days.map(day => DAY_NAMES[day]).filter(Boolean).join(" e ")} às ${Number(first.class_time.slice(0, 2))}h`;
    return { sport: first.sport, category: first.category, label, days };
  });
}

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return errorResponse("Serviço temporariamente indisponível.", 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Dados inválidos.", 400);
  const input = body as Record<string, unknown>;
  const name = typeof input.customerName === "string" ? input.customerName.trim() : "";
  const phone = typeof input.customerPhone === "string" ? input.customerPhone.replace(/\D/g, "") : "";
  const email = typeof input.customerEmail === "string" ? input.customerEmail.trim().toLowerCase() : "";
  const sport = input.sport;
  const category = input.category;
  const mainClass = input.mainClass;
  const planType = input.planType;
  // A página envia IDs das aulas extras, não nomes de dias.
  const extraDays = input.extraDays ?? [];

  if (name.length < 3 || name.length > 120 || !/^\d{10,11}$/.test(phone)) {
    return errorResponse("Nome ou WhatsApp inválido.", 400);
  }
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return errorResponse("E-mail inválido.", 400);
  }
  if (typeof sport !== "string" || typeof category !== "string" || typeof mainClass !== "string" ||
      !sport.trim() || !category.trim() || !mainClass.trim()) {
    return errorResponse("Modalidade, categoria ou turma inválida.", 400);
  }
  if (planType !== "mensal" && planType !== "trimestral" && planType !== "semestral") {
    return errorResponse("Plano inválido.", 400);
  }
  if (!Array.isArray(extraDays) || extraDays.length > 2 ||
      extraDays.some(day => typeof day !== "string") || new Set(extraDays).size !== extraDays.length) {
    return errorResponse("Dias extras inválidos.", 400);
  }
  if (input.couponCode != null && input.couponCode !== "") {
    return errorResponse("Matrículas com cupom ainda não estão disponíveis. Remova o cupom e tente novamente.", 400);
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Confirma a turma no cadastro ativo, usando o mesmo agrupamento da página do cliente.
  const { data: schedules, error: scheduleError } = await db.from("class_schedules")
    .select("id, sport, category, class_name, class_time, day_of_week, active")
    .eq("active", true)
    .eq("sport", sport);
  if (scheduleError) {
    console.error("Erro ao validar turma:", scheduleError.message);
    return errorResponse("Não foi possível validar as turmas disponíveis.", 503);
  }
  const groups = getClassGroups(((schedules ?? []) as Schedule[]).filter(item => item.category === category));
  const selectedGroup = groups.find(group => group.label === mainClass);
  if (!selectedGroup) return errorResponse("Turma indisponível ou não cadastrada.", 400);
  const extraSchedules = extraDays.map(id => (schedules ?? []).find(schedule => schedule.id === id));
  if (extraSchedules.some(schedule => !schedule || selectedGroup.days.includes(Number(schedule.day_of_week))) ||
      new Set(extraSchedules.map(schedule => schedule!.day_of_week)).size !== extraSchedules.length) {
    return errorResponse("Turmas extras inválidas ou com dias repetidos.", 400);
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 15; attempt++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = `AULA-${Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("")}`;
    const { data, error } = await db.rpc("create_class_enrollment_with_email", {
      p_code: code,
      p_student_name: name,
      p_student_phone: phone,
      p_sport: sport,
      p_category: category,
      p_main_class: mainClass,
      p_plan_type: planType,
      p_extra_days: extraDays,
      p_student_email: email || null,
    });
    if (error) {
      if (error.code === "23505") continue;
      console.error("Erro ao criar matrícula:", error.code, error.message);
      if (/sem vagas/i.test(error.message)) return errorResponse("Esta turma ficou sem vagas. Nenhuma matrícula foi criada.", 409);
      if (/capacidade|preco|configura/i.test(error.message)) return errorResponse("Não foi possível validar a configuração da turma.", 503);
      return errorResponse("Não foi possível registrar a matrícula.", 500);
    }
    // Envia somente depois da confirmação da matrícula; falha de e-mail não desfaz o cadastro.
    try {
      await notifyClassEnrollment({
        code, name, email, sport, category, mainClass, planType,
        amount: typeof data?.total_price === "number" ? data.total_price : undefined,
      });
    } catch (notificationError) {
      console.error("Matrícula criada; falha na notificação:", notificationError);
    }
    return NextResponse.json({ success: true, code, amount: data?.total_price },
      { status: 201, headers: { "Cache-Control": "no-store" } });
  }
  return errorResponse("Não foi possível gerar um código disponível. Tente novamente.", 503);
}
