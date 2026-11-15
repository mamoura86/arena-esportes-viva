import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyBooking } from "@/lib/bookingNotifications";

const errorResponse = (message: string, status: number) =>
  NextResponse.json(
    { success: false, error: message },
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
  const code = typeof body.code === "string"
    ? body.code.trim().toUpperCase()
    : "";
  const phone = typeof body.phone === "string"
    ? body.phone.replace(/\D/g, "")
    : "";

  if (!/^VIVA-[A-Z0-9]{4,12}$/.test(code) || !/^\d{10,11}$/.test(phone)) {
    return errorResponse("Informe o código VIVA e o WhatsApp com DDD.", 400);
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Pré-verificação para manter a resposta de reserva inexistente e
    // a compatibilidade com telefones legados de 10/11 dígitos.
    const { data: bookings, error: lookupError } = await db
      .from("bookings")
      .select("id,customer_phone,status,customer_name,customer_email,booking_date,booking_time,court_name,price")
      .eq("code", code);

    if (lookupError) {
      console.error("Erro ao consultar reserva:", lookupError.code, lookupError.message);
      return errorResponse("Não foi possível consultar a reserva.", 500);
    }

    if (!bookings?.length) {
      return errorResponse("Reserva não encontrada para os dados informados.", 404);
    }

    const phoneMatches = (registeredPhone: unknown) => {
      const registered = String(registeredPhone ?? "").replace(/\D/g, "");
      return registered === phone ||
        (registered.length >= 10 && registered.slice(-11) === phone) ||
        (registered.length === 11 && registered.slice(-10) === phone);
    };

    if (!bookings.every((booking) => phoneMatches(booking.customer_phone))) {
      return errorResponse("Reserva não encontrada para os dados informados.", 404);
    }

    if (bookings.every((booking) => booking.status === "cancelada")) {
      return NextResponse.json(
        { success: true, code, status: "cancelada", alreadyCancelled: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // A alteração e a devolução de cupom acontecem dentro da mesma transação SQL.
    const { data, error } = await db.rpc("cancel_booking_atomic", {
      p_code: code,
      p_customer_phone: phone,
    });

    if (error) {
      const message = error.message ?? "";
      if (message.includes("não é permitido após o início")) {
        return errorResponse("O cancelamento não é permitido após o início da reserva.", 409);
      }
      if (message.includes("Reserva não encontrada")) {
        return errorResponse("Reserva não encontrada para os dados informados.", 404);
      }
      if (message.includes("Dados inválidos")) {
        return errorResponse("Dados inválidos.", 400);
      }
      console.error("Erro no cancelamento transacional:", error.code, error.message);
      return errorResponse("Não foi possível cancelar a reserva.", 500);
    }

    if (!data || data.success !== true) {
      return errorResponse("Não foi possível confirmar o cancelamento.", 409);
    }

    // Notificar somente quando o cancelamento foi realizado nesta chamada.
    // A operação transacional já foi concluída; falha de e-mail não a desfaz.
    if (!data.alreadyCancelled) {
      const first = bookings[0];
      try {
        await notifyBooking({
          event: "cancelada",
          code,
          customerName: first.customer_name ?? "Cliente",
          customerEmail: first.customer_email ?? null,
          date: first.booking_date ?? "",
          slots: bookings.map(booking => ({
            court_name: booking.court_name ?? "Quadra",
            time: String(booking.booking_time ?? "").slice(0, 5),
          })),
          amount: bookings.reduce((sum, booking) => sum + Number(booking.price ?? 0), 0),
        });
      } catch (notificationError) {
        console.error("Reserva cancelada; falha na notificação:", notificationError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        code,
        status: "cancelada",
        ...(data.alreadyCancelled ? { alreadyCancelled: true } : {}),
        ...(typeof data.cancelledSlots === "number"
          ? { cancelledSlots: data.cancelledSlots }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro inesperado no cancelamento:", error);
    return errorResponse("Erro interno ao processar o cancelamento.", 500);
  }
}
