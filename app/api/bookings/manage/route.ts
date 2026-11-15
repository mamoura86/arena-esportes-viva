import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


const errorResponse = (message: string, status: number) =>
  NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return errorResponse("Serviço temporariamente indisponível.", 503);
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
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";

  if (!/^VIVA-[A-Z0-9]{4,12}$/.test(code) || !/^\d{10,11}$/.test(phone)) {
    return errorResponse("Informe o código VIVA e o WhatsApp com DDD.", 400);
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db
    .from("bookings")
    .select("code,customer_name,customer_phone,court_id,court_name,booking_date,booking_time,price,status")
    .eq("code", code)
    .order("booking_time", { ascending: true });

  if (error) {
    console.error("Erro na consulta de reserva:", error.code, error.message);
    return errorResponse("Não foi possível consultar a reserva.", 500);
  }

  const matches = (data ?? []).filter((booking) => {
    const registered = String(booking.customer_phone ?? "").replace(/\D/g, "");
    return registered === phone ||
      (registered.length >= 10 && registered.slice(-11) === phone) ||
      (registered.length === 11 && registered.slice(-10) === phone);
  });

  if (matches.length === 0) {
    return errorResponse("Reserva não encontrada para os dados informados.", 404);
  }

  const first = matches[0];
  return NextResponse.json(
    {
      booking: {
        bookingCode: first.code,
        customerName: first.customer_name,
        courtName: matches.map((b) => `• ${b.court_name}: ${b.booking_time}`).join("\n"),
        date: first.booking_date,
        time: matches.map((b) => b.booking_time).sort().join(", "),
        totalAmount: matches.reduce((sum, b) => sum + Number(b.price ?? 0), 0),
        status: matches.every((b) => b.status === "cancelada") ? "cancelada" : "confirmada",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
