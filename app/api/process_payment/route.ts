import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionAmount, description, paymentMethodId, email, identificationType, identificationNumber, installments, token } = body;

    // O valor já vem calculado do front-end (com ou sem taxas de parcelamento/cartão)
    const finalAmount = Number(transactionAmount);

    console.log(`[Financeiro] Processando pagamento | Valor: R$ ${finalAmount} | Método: ${paymentMethodId}`);

    const payment = new Payment(client);

    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description || 'Reserva Arena CT Viva',
      payment_method_id: paymentMethodId,
      payer: {
        email: email || 'test_user@test.com',
        identification: {
          type: identificationType || 'CPF',
          number: identificationNumber || '19191919191'
        }
      }
    };

    // Se for cartão de crédito, o Mercado Pago exige o token do cartão gerado no front-end
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

    return NextResponse.json({ 
      success: true, 
      result 
    });
  } catch (error: any) {
    console.error("Erro no pagamento Mercado Pago:", error);
    // Exibe a mensagem detalhada do MP para facilitar o debug
    const errorMsg = error.cause?.description || error.message || 'Erro ao processar pagamento';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}