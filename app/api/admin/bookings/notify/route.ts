import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyBooking } from "@/lib/bookingNotifications";

const headers = { "Cache-Control": "no-store" };
const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message }, { status, headers });

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return fail("Serviço indisponível.", 503);

  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!bearer) return fail("Autenticação necessária.", 401);
  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await auth.auth.getUser(bearer[1]);
  if (userError || !userData.user) return fail("Sessão inválida.", 401);

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: admin, error: adminError } = await db.from("admin_users")
    .select("id").eq("auth_user_id", userData.user.id).limit(1).maybeSingle();
  if (adminError) return fail("Não foi possível validar o gestor.", 503);
  if (!admin) return fail("Acesso restrito.", 403);

  let payload: unknown;
  try { payload = await request.json(); } catch { return fail("Dados inválidos.", 400); }
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {};
  const code = body.code;
  const event = body.event === "cancelada" ? "cancelada" : body.event === undefined || body.event === "confirmada" ? "confirmada" : null;
  if (!event) return fail("Evento inválido.", 400);
  if (typeof code !== "string" || !/^VIVA-[A-Z0-9]{4}$/.test(code)) {
    return fail("Código inválido.", 400);
  }

  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("code,customer_name,customer_email,booking_date,booking_time,court_name,price,channel,status,created_at")
    .eq("code", code).eq("channel", "manual").limit(1).maybeSingle();
  if (bookingError) return fail("Falha ao consultar reserva.", 503);
  if (!booking || booking.status !== event) return fail("Reserva indisponível.", 404);

  // Restringe o envio à criação recente, sem permitir reenvios arbitrários de reservas antigas.
  const createdAt = Date.parse(String(booking.created_at ?? ""));
  if (event === "confirmada" && (!Number.isFinite(createdAt) || Date.now() - createdAt > 2 * 60 * 1000 || createdAt > Date.now() + 30000)) {
    return fail("Prazo de notificação expirado.", 409);
  }

  // Cancelamentos são solicitados somente após a atualização de status no painel.
  // Ainda não há idempotência persistente: não chamar esta rota repetidamente.
  try {
    await notifyBooking({
      event,
      code: booking.code,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      date: booking.booking_date,
      slots: [{ court_name: booking.court_name, time: booking.booking_time }],
      amount: Number(booking.price),
    });
  } catch (error) {
    console.error("Falha na notificação da reserva de balcão:", error);
    return fail("Não foi possível enviar a notificação.", 502);
  }
  return NextResponse.json({ success: true }, { headers });
}
