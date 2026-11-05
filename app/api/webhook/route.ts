import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '@/lib/supabase';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // O Mercado Pago envia notificações de vários tipos. Interessamo-nos por pagamentos (payment)
    if (body.type === 'payment' || body.action === 'payment.created' || body.action === 'payment.updated') {
      const paymentId = body.data?.id || body.id;

      if (paymentId) {
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        // Se o pagamento foi aprovado
        if (paymentInfo.status === 'approved') {
          console.log(`Pagamento ${paymentId} aprovado via Webhook!`);
          
          // Aqui você pode atualizar o status no Supabase caso guarde o ID do pagamento na tabela de bookings
          // Exemplo: await supabase.from('bookings').update({ status: 'confirmada' }).eq('mp_payment_id', paymentId);
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro no webhook do Mercado Pago:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}