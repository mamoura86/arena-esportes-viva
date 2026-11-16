
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));

async function notifyClassCancellation(enrollment: {
  code: string;
  student_name: string | null;
  student_email: string | null;
  sport: string | null;
  category: string | null;
  days_selected: string | null;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "CT Viva Esportes";
  if (!apiKey || !fromEmail) {
    console.warn("Notificação de matrícula não enviada: configuração Brevo ausente.");
    return;
  }
  const recipients = [...new Set([
    process.env.BOOKING_MANAGER_EMAIL, enrollment.student_email,
  ].filter((email): email is string =>
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ))];
  if (!recipients.length) return;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Matrícula cancelada — CT Viva Esportes</h2>
    <p><b>Código:</b> ${escapeHtml(enrollment.code)}</p>
    <p><b>Aluno:</b> ${escapeHtml(enrollment.student_name ?? "Aluno")}</p>
    <p><b>Modalidade:</b> ${escapeHtml(enrollment.sport ?? "")}</p>
    <p><b>Categoria:</b> ${escapeHtml(enrollment.category ?? "")}</p>
    <p><b>Turma:</b> ${escapeHtml(enrollment.days_selected ?? "")}</p>
    <p>O cancelamento da matrícula foi confirmado.</p>
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
        subject: `Matrícula cancelada — ${enrollment.code}`,
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

const errorResponse = (message: string, status: number) =>
  NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return errorResponse("Serviço indisponível.", 503);
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return errorResponse("Dados inválidos.", 400);
  }

  const body = input as Record<string, unknown>;

  const code =
    typeof body.code === "string"
      ? body.code.trim().toUpperCase()
      : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.replace(/\D/g, "")
      : "";

  if (
    !/^AULA-[A-Z0-9]{4,12}$/.test(code) ||
    !/^\d{10,11}$/.test(phone)
  ) {
    return errorResponse(
      "Informe o código da matrícula e o WhatsApp com DDD.",
      400
    );
  }

  const db = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const { data: enrollments, error: lookupError } = await db
      .from("class_enrollments")
      .select("id,code,student_phone,status,student_name,student_email,sport,category,days_selected")
      .eq("code", code);

    if (lookupError) {
      console.error("Erro ao consultar matrícula:", lookupError.code);
      return errorResponse("Não foi possível consultar a matrícula.", 500);
    }

    if (!enrollments || enrollments.length !== 1) {
      return errorResponse(
        "Matrícula não encontrada para os dados informados.",
        404
      );
    }

    const enrollment = enrollments[0];
    const registeredPhone = String(
      enrollment.student_phone ?? ""
    ).replace(/\D/g, "");

    if (registeredPhone !== phone) {
      return errorResponse(
        "Matrícula não encontrada para os dados informados.",
        404
      );
    }

    if (enrollment.status === "cancelada") {
      return NextResponse.json(
        {
          success: true,
          code,
          status: "cancelada",
          alreadyCancelled: true,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: updated, error: updateError } = await db
      .from("class_enrollments")
      .update({ status: "cancelada" })
      .eq("id", enrollment.id)
      .eq("student_phone", enrollment.student_phone)
      .neq("status", "cancelada")
      .select("id");

    if (updateError) {
      console.error("Erro ao cancelar matrícula:", updateError.code);
      return errorResponse("Não foi possível cancelar a matrícula.", 500);
    }

    if (!updated || updated.length !== 1) {
      return errorResponse(
        "Não foi possível confirmar o cancelamento.",
        409
      );
    }

    // O banco já confirmou o cancelamento; falhas de e-mail não o desfazem.
    try {
      await notifyClassCancellation({
        code,
        student_name: enrollment.student_name,
        student_email: enrollment.student_email,
        sport: enrollment.sport,
        category: enrollment.category,
        days_selected: enrollment.days_selected,
      });
    } catch (notificationError) {
      console.error("Matrícula cancelada; falha na notificação:", notificationError);
    }

    return NextResponse.json(
      {
        success: true,
        code,
        status: "cancelada",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro inesperado no cancelamento:", error);
    return errorResponse("Erro interno ao cancelar a matrícula.", 500);
  }
}
