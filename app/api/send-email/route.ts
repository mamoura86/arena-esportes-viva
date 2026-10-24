import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, courtName, date, time, price, code } = body;

    // Busca o e-mail cadastrado na tabela arena_settings do Supabase
    let recipientEmail = 'gestor@ctvivaesportes.com.br'; // E-mail padrão de segurança
    
    const { data: settings } = await supabase.from('arena_settings').select('manager_email').single();
    if (settings && settings.manager_email) {
      recipientEmail = settings.manager_email;
    }

    const data = await resend.emails.send({
      from: 'Arena Viva Esportes <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `🎾 Nova Reserva Confirmada! [${code}]`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #041E8C; margin-top: 0;">Nova Reserva Realizada na Arena!</h2>
          <p>Olá, Gestor. Uma nova reserva foi confirmada com sucesso pelo site:</p>
          <ul style="line-height: 1.6; background-color: #f8fafc; padding: 15px 20px; border-radius: 8px;">
            <li><strong>Código da Reserva:</strong> ${code}</li>
            <li><strong>Cliente:</strong> ${customerName} (${customerPhone || 'Não informado'})</li>
            <li><strong>Espaço/Quadra:</strong> ${courtName}</li>
            <li><strong>Data:</strong> ${date}</li>
            <li><strong>Horário:</strong> ${time}</li>
            <li><strong>Valor:</strong> R$ ${price}</li>
          </ul>
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Esta é uma mensagem automática gerada pelo sistema da Arena.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}