import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionAmount, description, paymentMethodId, email, identificationType, identificationNumber, installments, token } = body;

    const finalAmount = Number(transactionAmount);

    console.log(`[Financeiro] Processando | Valor: R$ ${finalAmount} | Método: ${paymentMethodId}`);

    const payment = new Payment(client);

    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description || 'Reserva Arena CT Viva',
      payment_method_id: paymentMethodId,
      payer: {
        // Em ambiente de teste (TEST-...), use sempre um e-mail de teste do Sandbox
        email: email && email.includes('@testuser.com') ? email : 'test_user_123456@testuser.com',
        identification: {
          type: identificationType || 'CPF',
          number: identificationNumber ? identificationNumber.replace(/\D/g, '') : '19191919191'
        }
      }
    };

    if (paymentMethodId !== 'pix') {
      paymentData.installments = Number(installments) || 1;
      if (token) {
        paymentData.token = token;
      }
    }

    const result = await payment.create({
      body: paymentData,
      requestOptions: { 
        idempotencyKey: `viva-${Date.now()}` 
      }
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Erro no pagamento Mercado Pago:", error);
    const errorMsg = error.cause?.description || error.message || 'Erro ao processar pagamento';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}