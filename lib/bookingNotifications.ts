import { createClient } from "@supabase/supabase-js";

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
  // O endereço configurado no painel tem prioridade sobre a variável de ambiente.
  // A consulta usa a credencial privada somente no servidor.
  let managerEmail = process.env.BOOKING_MANAGER_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    try {
      const db = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await db.from("arena_settings")
        .select("manager_email").eq("id", 1).maybeSingle();
      if (error) {
        console.error("Não foi possível carregar o e-mail do gestor:", error.message);
      } else if (isValidEmail(data?.manager_email?.trim())) {
        managerEmail = data.manager_email.trim();
      } else {
        console.warn("E-mail do gestor ausente/inválido no painel; usando configuração alternativa, se existir.");
      }
    } catch (error) {
      console.error("Erro ao consultar e-mail do gestor:", error);
    }
  } else {
    console.warn("Configuração Supabase do servidor ausente para consulta do e-mail do gestor.");
  }

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
  const confirmed = event.event === "confirmada";
  const accent = confirmed ? "#00eba5" : "#f59e70";
  const status = confirmed ? "RESERVA CONFIRMADA" : "RESERVA CANCELADA";
  const intro = confirmed
    ? "Sua reserva foi registrada com sucesso. Confira os detalhes abaixo."
    : "Sua reserva foi cancelada. Confira os dados da reserva abaixo.";
  const details = event.slots.map((slot) => `
    <tr><td style="padding:8px 12px;border-bottom:1px solid #e9edf4;color:#172554;font-size:13px;">
      ${escapeHtml(slot.court_name)} <span style="color:#64748b;">&bull;</span> ${escapeHtml(slot.time)}
    </td></tr>`).join("");
  const amount = typeof event.amount === "number" && Number.isFinite(event.amount)
    ? `<tr><td style="padding:11px 12px;background:#f2f6fc;color:#172554;font-size:13px;">
         <strong>Valor da reserva</strong><span style="float:right;font-weight:700;">${escapeHtml(event.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))}</span>
       </td></tr>` : "";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" /></head>
    <body style="margin:0;padding:0;background:#edf2f8;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;font-size:1px;color:#edf2f8;max-height:0;overflow:hidden;">${escapeHtml(title)} — ${escapeHtml(event.code)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#edf2f8;"><tr><td align="center" style="padding:12px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td align="center" style="background:#081e92;padding:10px 16px;">
            <img src="https://ctvivaesportes.vercel.app/logo.png" alt="CT Viva Esportes" width="105" style="display:block;width:105px;max-width:55%;height:auto;border:0;" />
          </td></tr>
          <tr><td style="background:${accent};height:3px;font-size:0;line-height:3px;">&nbsp;</td></tr>
          <tr><td style="padding:16px 18px 6px;">
            <p style="margin:0 0 6px;color:#081e92;font-size:10px;font-weight:700;letter-spacing:1.5px;">${status}</p>
            <h1 style="margin:0 0 6px;color:#12215a;font-size:20px;line-height:1.25;">${title}</h1>
            <p style="margin:0;color:#53627c;font-size:13px;line-height:1.45;">${intro}</p>
          </td></tr>
          <tr><td style="padding:12px 18px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e3e9f3;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:11px 12px;background:#f2f6fc;">
                <span style="display:block;color:#65738b;font-size:10px;">CÓDIGO DA RESERVA</span>
                <strong style="display:block;color:#081e92;font-size:19px;letter-spacing:0.5px;padding-top:3px;">${escapeHtml(event.code)}</strong>
              </td></tr>
              <tr><td style="padding:10px 12px;color:#172554;font-size:13px;border-bottom:1px solid #e9edf4;"><strong>Cliente:</strong> ${escapeHtml(event.customerName)}</td></tr>
              <tr><td style="padding:10px 12px;color:#172554;font-size:13px;border-bottom:1px solid #e9edf4;"><strong>Data:</strong> ${escapeHtml(date)}</td></tr>
              <tr><td style="padding:10px 12px 4px;color:#65738b;font-size:10px;font-weight:700;">QUADRAS E HORÁRIOS</td></tr>
              ${details}${amount}
            </table>
            <p style="margin:10px 0 0;color:#64748b;font-size:10px;line-height:1.4;">Este e-mail informa o status da reserva e não constitui comprovante de pagamento.</p>
          </td></tr>
          <tr><td align="center" style="padding:12px;background:#081e92;color:#ffffff;font-size:10px;line-height:1.5;">
            <strong>CT VIVA ESPORTES</strong><br />Esporte, energia e bons momentos.<br />
            <a href="https://ctvivaesportes.vercel.app" style="color:#00eba5;text-decoration:none;">ctvivaesportes.vercel.app</a>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;

  const results = await Promise.allSettled(recipients.map(async (email) => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
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
      throw new Error(`Brevo rejeitou a notificação para ${email} (HTTP ${response.status}).`);
    }
  }));

  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [{ recipient: recipients[index], reason: result.reason }] : []
  );
  for (const failure of failures) {
    console.error("Falha ao enviar notificação pela Brevo:", failure.recipient, failure.reason);
  }
  if (failures.length > 0) {
    throw new Error(`Falha ao enviar ${failures.length} de ${recipients.length} notificações.`);
  }
}
