import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionAmount, description, paymentMethodId, email, identificationType, identificationNumber } = body;

    let finalAmount = Number(transactionAmount);
    
    // Regra financeira:
    // Se for Cartão de Crédito, podemos embutir a taxa padrão do Mercado Pago (aprox 4.99%) para que o cliente assuma o custo, mantendo o valor da quadra limpo para o dono.
    // Se for Pix, o valor pago pelo cliente é exatamente o valor nominal.
    const isCard = paymentMethodId !== 'pix';
    if (isCard) {
      // Adiciona o acréscimo operacional do cartão para o cliente
      finalAmount = Number((transactionAmount * 1.0499).toFixed(2));
    }

    // Calcula sua comissão de desenvolvedor (0,99% sobre o valor nominal da reserva)
    const developerFee = Number((transactionAmount * 0.0099).toFixed(2));
    console.log(`[Financeiro] Valor Nominal: R$ ${transactionAmount} | Método: ${paymentMethodId} | Valor Cobrado: R$ ${finalAmount} | Comissão Dev (0,99%): R$ ${developerFee}`);

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: finalAmount,
        description: description || 'Reserva Arena CT Viva',
        payment_method_id: paymentMethodId,
        payer: {
          email: email,
          identification: {
            type: identificationType || 'CPF',
            number: identificationNumber
          }
        }
      },
      requestOptions: { 
        idempotencyKey: `viva-${Date.now()}` 
      }
    });

    return NextResponse.json({ 
      success: true, 
      result,
      financialSummary: {
        nominalAmount: transactionAmount,
        chargedAmount: finalAmount,
        developerFee: developerFee
      }
    });
  } catch (error: any) {
    console.error("Erro no pagamento Mercado Pago:", error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao processar pagamento' }, { status: 500 });
  }
}