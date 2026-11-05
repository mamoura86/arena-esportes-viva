import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transaction_amount, payment_method_id, payer } = body;

    const payment = new Payment(client);

    const paymentData: any = {
      transaction_amount: Number(transaction_amount),
      description: 'Reserva de Quadra - Arena Esportes Viva',
      payment_method_id: 'pix',
      payer: {
        email: payer?.email || 'cliente@arena.com',
        first_name: payer?.first_name || 'Cliente',
        identification: {
          type: payer?.identification?.type || 'CPF',
          number: payer?.identification?.number || '12345678909'
        }
      },
    };

    const response = await payment.create({ body: paymentData });

    return NextResponse.json({
      status: response.status,
      status_detail: response.status_detail,
      id: response.id,
      // Retorna os dados reais gerados pelo Mercado Pago para o PIX
      point_of_interaction: response.point_of_interaction,
    });

  } catch (error: any) {
    console.error('Erro ao processar PIX:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar PIX' },
      { status: 500 }
    );
  }
}