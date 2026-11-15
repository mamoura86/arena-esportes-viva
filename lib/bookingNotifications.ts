import { Resend } from "resend";

type BookingNotification = {
  event: "confirmada" | "cancelada";
  code: string;
  customerName: string;
  customerEmail?: string | null;
  date: string;
  slots: Array<{ court_name: string; time: string }>;
  amount?: number;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] ?? c));

export async function notifyBooking(event: BookingNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const manager = process.env.BOOKING_MANAGER_EMAIL;
  if (!apiKey || !from) {
    console.warn("Notificação de reserva não enviada: RESEND_API_KEY/RESEND_FROM_EMAIL ausentes.");
    return;
  }
  const recipients = [...new Set([manager, event.customerEmail].filter((email): email is string =>
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ))];
  if (!recipients.length) return;
  const resend = new Resend(apiKey);
  const title = event.event === "confirmada" ? "Reserva confirmada" : "Reserva cancelada";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(event.date)
    ? event.date.split("-").reverse().join("/") : event.date;
  const details = event.slots.map(slot => `<li>${escapeHtml(slot.court_name)} — ${escapeHtml(slot.time)}</li>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${title} — CT Viva Esportes</h2><p><b>Código:</b> ${escapeHtml(event.code)}</p><p><b>Cliente:</b> ${escapeHtml(event.customerName)}</p><p><b>Data:</b> ${escapeHtml(date)}</p><ul>${details}</ul>${typeof event.amount === "number" ? `<p><b>Valor da reserva:</b> R$ ${event.amount.toFixed(2).replace(".", ",")}</p>` : ""}<p>O pagamento é realizado presencialmente na arena.</p></div>`;
  const results = await Promise.allSettled(recipients.map(to => resend.emails.send({
    from, to, subject: `${title} — ${event.code}`, html,
  })));
  results.forEach((result, index) => {
    if (result.status === "rejected") console.error("Falha no envio de notificação:", recipients[index], result.reason);
    else if (result.value.error) console.error("Resend rejeitou notificação:", recipients[index], result.value.error.message);
  });
}
