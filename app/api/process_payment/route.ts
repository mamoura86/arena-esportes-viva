import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Configuração segura com a credencial de acesso
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionAmount, description, paymentMethodId, email, identificationType, identificationNumber, installments, token } = body;

    const finalAmount = Number(transactionAmount);

    if (!finalAmount || isNaN(finalAmount)) {
      return NextResponse.json({ success: false, error: "Valor da transação inválido." }, { status: 400 });
    }

    console.log(`[MP API] Processando pagamento | Valor: R$ ${finalAmount} | Método: ${paymentMethodId}`);

    const payment = new Payment(client);

    // Corpo da requisição compatível com a v2 do SDK do Mercado Pago
    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description || 'Reserva Arena CT Viva',
      payment_method_id: paymentMethodId,
      payer: {
        email: email && email.includes('@') ? email : 'test_user_123456@testuser.com',
        identification: {
          type: identificationType || 'CPF',
          number: identificationNumber ? identificationNumber.replace(/\D/g, '') : '19191919191'
        }
      }
    };

    // Parâmetro de parcelas se for cartão
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
    // Captura o erro detalhado vindo diretamente do Mercado Pago
    console.error("Erro detalhado no Mercado Pago:", error);
    const errorDescription = error.api_response?.message || error.message || 'Erro interno ao processar pagamento';
    
    return NextResponse.json({ 
      success: false, 
      error: errorDescription 
    }, { status: 500 });
  }
}