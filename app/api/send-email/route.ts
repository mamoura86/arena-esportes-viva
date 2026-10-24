import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Faltam parâmetros obrigatórios." }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: "Arena CT Viva Esportes <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return NextResponse.json({ error: "Erro interno ao enviar e-mail." }, { status: 500 });
  }
}