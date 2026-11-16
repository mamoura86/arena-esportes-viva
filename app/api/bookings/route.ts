import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyBooking } from "@/lib/bookingNotifications";

const SAND_SPORTS = new Set(["Beach Tennis", "Futevôlei", "Vôlei de Praia", "Carimba"]);
const normalizeTime = (value: string) => value.slice(0, 5);
const timeToMinutes = (value: string) => {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
};
const HOLIDAYS = new Set(["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]);
const respondError = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

function fortalezaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return respondError("Serviço temporariamente indisponível.", 503);

  let body: unknown;
  try { body = await request.json(); } catch { return respondError("JSON inválido.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return respondError("Dados inválidos.", 400);
  const input = body as Record<string, unknown>;
  const name = typeof input.customerName === "string" ? input.customerName.trim() : "";
  const customerEmail = typeof input.customerEmail === "string" ? input.customerEmail.trim().toLowerCase() : "";
  if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) return respondError("E-mail inválido.", 400);
  const phone = typeof input.customerPhone === "string" ? input.customerPhone.replace(/\D/g, "") : "";
  const sport = input.selectedSport;
  const date = input.selectedDate;
  const slots = input.slots;
  const addonKey = input.addonKey === undefined || input.addonKey === null || input.addonKey === "" ? null : input.addonKey;
  if (name.length < 3 || name.length > 120 || !/^\d{10,11}$/.test(phone)) return respondError("Nome ou telefone inválido.", 400);
  if (typeof sport !== "string" || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return respondError("Modalidade ou data inválida.", 400);
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > 24) return respondError("Selecione entre 1 e 24 horários.", 400);

  const dateObj = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== date) return respondError("Data inválida.", 400);
  const now = fortalezaNow();
  if (date < now.date) return respondError("Não é possível reservar datas passadas.", 400);
  const seen = new Set<string>();
  const validated: { court_id: string; court_name: string; time: string; price: number; type: string }[] = [];
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const weekday = dateObj.getUTCDay();
  const [courtsResult, hoursResult] = await Promise.all([
    db.from("courts").select("id,name,sport_type,active").eq("active", true),
    db.from("court_hours").select("court_id,day_of_week,opening_time,closing_time,active")
      .eq("day_of_week", weekday).eq("active", true),
  ]);
  if (courtsResult.error || hoursResult.error) {
    console.error("Erro ao consultar quadras/horários:", courtsResult.error?.message, hoursResult.error?.message);
    return respondError("Não foi possível validar os horários de funcionamento.", 503);
  }
  const courts = courtsResult.data ?? [];
  const courtHours = hoursResult.data ?? [];

  const { data: settings, error: settingsError } = await db.from("arena_settings").select("upgrades").limit(1).maybeSingle();
  if (settingsError) {
    console.error("Erro ao ler configurações de preço:", settingsError.message);
    return respondError("Não foi possível validar os preços.", 503);
  }
  // Adicionais são definidos e precificados exclusivamente no servidor.
  // Um adicional é cobrado uma única vez, independentemente dos horários.
  let addon: { key: string; name: string; price: number } | null = null;
  if (addonKey !== null) {
    if (typeof addonKey !== "string") return respondError("Adicional inválido.", 400);
    const upgrades = settings?.upgrades;
    const options: Record<string, { sport: string; enabled: unknown; price: unknown; name: string }> = {
      volley: { sport: "Vôlei de Praia", enabled: upgrades?.volleyEnabled, price: upgrades?.volleyPrice, name: "Upgrade: Bola Mikasa Pro Oficial" },
      beachtennis: { sport: "Beach Tennis", enabled: upgrades?.beachTennisEnabled, price: upgrades?.beachTennisPrice, name: "Aluguel de Raquete de Beach Tennis" },
      society: { sport: "Futebol Society", enabled: upgrades?.societyEnabled, price: upgrades?.societyPrice, name: "Aluguel de Coletes" },
    };
    const option = options[addonKey];
    if (!option || option.sport !== sport || option.enabled !== true) {
      return respondError("Adicional indisponível para esta modalidade.", 400);
    }
    const price = Number(option.price);
    if (option.price === null || option.price === undefined || option.price === "" || !Number.isFinite(price) || price < 0 || price > 1000000) {
      return respondError("Preço do adicional inválido. Consulte o gestor.", 503);
    }
    addon = { key: addonKey, name: option.name, price };
  }
  const promo = settings?.upgrades?.promo;
  const startHour = /^\d{2}:\d{2}$/.test(promo?.startHour ?? "") ? Number(promo.startHour.slice(0, 2)) : 16;
  const endHour = /^\d{2}:\d{2}$/.test(promo?.endHour ?? "") ? Number(promo.endHour.slice(0, 2)) : 19;
  const promoEnabled = promo?.enabled ?? true;
  const weekendOrHoliday = [0, 6].includes(dateObj.getUTCDay()) || HOLIDAYS.has(date.slice(5));

  for (const slot of slots) {
    if (!slot || typeof slot !== "object" || Array.isArray(slot)) return respondError("Horário inválido.", 400);
    const item = slot as Record<string, unknown>;
    if (typeof item.courtId !== "string" || typeof item.time !== "string") return respondError("Quadra ou horário inválido.", 400);
    const court = courts.find(c => c.id === item.courtId);
    const isSociety = court?.id.startsWith("futebol-") || court?.sport_type === "society";
    const supportsSport = isSociety ? sport === "Futebol Society" : SAND_SPORTS.has(sport);
    if (!court || !supportsSport || !/^([01]\d|2[0-3]):00$/.test(item.time)) {
      return respondError("Quadra, modalidade ou horário inválido.", 400);
    }
    const slotMinutes = timeToMinutes(item.time);
    const withinOpeningHours = courtHours.some(h =>
      h.court_id === court.id &&
      slotMinutes >= timeToMinutes(h.opening_time) &&
      slotMinutes + 60 <= timeToMinutes(h.closing_time)
    );
    if (!withinOpeningHours) {
      return respondError("Quadra indisponível neste horário de funcionamento.", 409);
    }
    const key = `${court.id}|${item.time}`;
    if (seen.has(key)) return respondError("Horário repetido na solicitação.", 400);
    seen.add(key);
    const hour = Number(item.time.slice(0, 2));
    if (date === now.date && hour * 60 - now.minutes < 10) return respondError("Horário muito próximo ou já encerrado.", 409);
    const discount = promoEnabled && hour >= startHour && hour < endHour && !weekendOrHoliday;
    const price = isSociety ? (discount ? 60 : 80) : (discount ? 40 : 60);
    validated.push({ court_id: court.id, court_name: court.name, time: item.time, price, type: isSociety ? "society" : "areia" });
  }

  // Código curto: quatro caracteres alfanuméricos, gerados no servidor.
  // Verifica também reservas canceladas, para evitar reutilizar códigos antigos.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let attempt = 0; attempt < 15; attempt++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const candidate = `VIVA-${Array.from(bytes, b => alphabet[b % alphabet.length]).join("")}`;
    const { data: existing, error: lookupError } = await db
      .from("bookings")
      .select("id")
      .eq("code", candidate)
      .limit(1);
    if (lookupError) {
      console.error("Erro ao verificar código de reserva:", lookupError.message);
      return respondError("Não foi possível gerar o código da reserva.", 503);
    }
    if (!existing?.length) {
      code = candidate;
      break;
    }
  }
  if (!code) return respondError("Não foi possível gerar um código disponível. Tente novamente.", 503);
  const { data, error } = await db.rpc("create_booking_with_addon", {
    p_code: code,
    p_customer_name: name,
    p_customer_phone: phone,
    p_sport: sport,
    p_date: date,
    p_addon_key: addon?.key ?? null,
    p_addon_name: addon?.name ?? null,
    p_addon_price: addon?.price ?? null,
    p_slots: validated.map(({ court_id, court_name, time, price }) => ({ court_id, court_name, time, price })),
  });
  if (error) {
    console.error("Falha ao registrar reserva:", error.code, error.message);
    if (error.code === "23505" || /bloqueado|reservado/i.test(error.message)) return respondError("Um dos horários ficou indisponível. Nenhuma reserva foi realizada.", 409);
    return respondError("Não foi possível registrar a reserva.", 500);
  }
  // A reserva já foi confirmada pela função SQL. Falha de e-mail nunca deve
  // provocar uma nova tentativa de criação da mesma reserva.
  let storedEmail = "";
  if (customerEmail) {
    const { error: emailError } = await db.from("bookings")
      .update({ customer_email: customerEmail }).eq("code", code);
    if (emailError) {
      console.error("Reserva confirmada, mas não foi possível salvar o e-mail:", emailError.message);
    } else {
      storedEmail = customerEmail;
    }
  }
  try {
    await notifyBooking({
      event: "confirmada", code, customerName: name,
      customerEmail: storedEmail || null, date,
      slots: validated.map(({ court_name, time }) => ({ court_name, time })),
      amount: validated.reduce((sum, slot) => sum + slot.price, 0) + (addon?.price ?? 0),
    });
  } catch (notificationError) {
    console.error("Reserva confirmada; falha na notificação:", notificationError);
  }

  return NextResponse.json({ success: true, code, slotsCreated: data?.slots_created, amount: validated.reduce((sum, slot) => sum + slot.price, 0) + (addon?.price ?? 0) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
