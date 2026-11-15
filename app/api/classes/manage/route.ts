
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


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

  const { data, error } = await db
    .from("class_enrollments")
    .select(
      "id,code,student_name,student_phone,sport,category,plan_type,days_selected,total_price,status,created_at"
    )
    .eq("code", code);

  if (error) {
    console.error("Erro ao consultar matrícula:", error.code);
    return errorResponse("Não foi possível consultar a matrícula.", 500);
  }

  const matches = (data ?? []).filter((enrollment) => {
    const registered = String(
      enrollment.student_phone ?? ""
    ).replace(/\D/g, "");

    return registered === phone;
  });

  if (matches.length !== 1) {
    return errorResponse(
      "Matrícula não encontrada para os dados informados.",
      404
    );
  }

  const enrollment = matches[0];

  return NextResponse.json(
    {
      success: true,
      booking: {
        id: enrollment.id,
        bookingCode: enrollment.code,
        customerName: enrollment.student_name,
        courtName:
          `Modalidade: ${enrollment.sport} (${enrollment.category})\n` +
          `Plano: ${enrollment.plan_type.toUpperCase()} - ` +
          `Turma: ${enrollment.days_selected}`,
        date: enrollment.created_at?.slice(0, 10) ?? "",
        time: "Matrícula de Aula",
        totalAmount: Number(enrollment.total_price),
        status:
          enrollment.status === "ativa"
            ? "confirmada"
            : enrollment.status,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
