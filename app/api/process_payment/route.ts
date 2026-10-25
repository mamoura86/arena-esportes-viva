import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionAmount, description, paymentMethodId, installments, token } = body;

    const finalAmount = Number(transactionAmount);

    if (!finalAmount || isNaN(finalAmount)) {
      return NextResponse.json({ success: false, error: "Valor da transação inválido." }, { status: 400 });
    }

    console.log(`[MP API] Processando | Valor: R$ ${finalAmount} | Método: ${paymentMethodId}`);

    const payment = new Payment(client);

    // Estrutura limpa e validada para a sandbox do Mercado Pago
    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description || 'Reserva Arena CT Viva',
      payment_method_id: paymentMethodId === 'pix' ? 'pix' : 'master',
      payer: {
        email: 'test_user_123456@testuser.com', // E-mail oficial padrão de testes do MP
        identification: {
          type: 'CPF',
          number: '19191919191' // CPF genérico de teste aceito pelo MP
        }
      }
    };

    if (paymentMethodId !== 'pix') {
      paymentData.installments = Number(installments) || 1;
      // Se não houver token de cartão gerado pelo front-end, o SDK de teste aceita um token simulado básico
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
    console.error("Erro detalhado no Mercado Pago:", error);
    const errorDescription = error.api_response?.message || error.message || 'Erro interno ao processar pagamento';
    
    return NextResponse.json({ 
      success: false, 
      error: errorDescription 
    }, { status: 500 });
  }
}