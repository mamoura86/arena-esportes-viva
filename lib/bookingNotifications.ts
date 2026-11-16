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

const isValidEmail = (email: unknown): email is string =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function notifyBooking(event: BookingNotification): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_FROM_EMAIL;
  const senderName = process.env.BREVO_FROM_NAME || "CT Viva Esportes";
  const managerEmail = process.env.BOOKING_MANAGER_EMAIL;

  if (!apiKey || !isValidEmail(senderEmail)) {
    console.warn("Notificação não enviada: BREVO_API_KEY ou BREVO_FROM_EMAIL ausente/inválido.");
    return;
  }

  const recipients = [...new Set(
    [managerEmail, event.customerEmail].filter(isValidEmail)
  )];
  if (recipients.length === 0) return;

  const title = event.event === "confirmada" ? "Reserva confirmada" : "Reserva cancelada";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(event.date)
    ? event.date.split("-").reverse().join("/")
    : event.date;
  const details = event.slots
    .map((slot) => `<li>${escapeHtml(slot.court_name)} — ${escapeHtml(slot.time)}</li>`)
    .join("");
  const amount = typeof event.amount === "number" && Number.isFinite(event.amount)
    ? `<p><b>Valor da reserva:</b> R$ ${event.amount.toFixed(2).replace(".", ",")}</p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${title} — CT Viva Esportes</h2><p><b>Código:</b> ${escapeHtml(event.code)}</p><p><b>Cliente:</b> ${escapeHtml(event.customerName)}</p><p><b>Data:</b> ${escapeHtml(date)}</p><ul>${details}</ul>${amount}</div>`;

  const results = await Promise.allSettled(recipients.map(async (email) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject: `${title} — ${event.code}`,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      console.error("Brevo rejeitou notificação:", { status: response.status, recipient: email });
    }
  }));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Falha ao enviar notificação pela Brevo:", recipients[index], result.reason);
    }
  });
}
