import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { "Cache-Control": "no-store, max-age=0" };

  if (!url || !serviceKey) {
    console.error("Configuração de disponibilidade ausente no servidor.");
    return NextResponse.json({ error: "Serviço temporariamente indisponível." }, { status: 503, headers });
  }

  // A chave privilegiada permanece exclusivamente no servidor.
  const adminDb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [bookingsResult, courtsResult, hoursResult] = await Promise.all([
    adminDb
      .from("bookings")
      .select("court_id, booking_date, booking_time, status, created_at")
      .eq("status", "confirmada"),
    adminDb
      .from("courts")
      .select("id, name, sport_type, active")
      .eq("active", true),
    adminDb
      .from("court_hours")
      .select("court_id, day_of_week, opening_time, closing_time, active")
      .eq("active", true),
  ]);

  if (bookingsResult.error || courtsResult.error || hoursResult.error) {
    console.error("Erro ao consultar disponibilidade:", {
      bookings: bookingsResult.error?.message,
      courts: courtsResult.error?.message,
      courtHours: hoursResult.error?.message,
    });
    return NextResponse.json(
      { error: "Não foi possível consultar a disponibilidade." },
      { status: 500, headers },
    );
  }

  return NextResponse.json(
    {
      bookings: bookingsResult.data ?? [],
      courts: courtsResult.data ?? [],
      courtHours: hoursResult.data ?? [],
    },
    { headers },
  );
}
