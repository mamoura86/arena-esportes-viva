import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, resetUrl } = await request.json();

    if (!email || !resetUrl) {
      return NextResponse.json({ error: "E-mail ou link ausente." }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: "Arena CT Viva Esportes <onboarding@resend.dev>", // Ou o seu domínio verificado no Resend
      to: [email],
      subject: "Recuperação de PIN - Painel do Gestor",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #041E8C; text-transform: uppercase;">Recuperação de Acesso</h2>
          <p>Você solicitou a redefinição do PIN de acesso ao <strong>Painel do Gestor</strong> da Arena CT Viva Esportes.</p>
          <p>Clique no botão abaixo para definir uma nova senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #041E8C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Meu PIN</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Se você não solicitou esta alteração, ignore este e-mail.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao enviar e-mail via Resend:", error);
    return NextResponse.json({ error: "Erro ao enviar e-mail." }, { status: 500 });
  }
}