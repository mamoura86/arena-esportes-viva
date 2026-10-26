import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payment = new Payment(client);
    
    const result = await payment.create({ body });
    
    return NextResponse.json({ success: true, detail: result });
  } catch (error: any) {
    console.error("Erro no pagamento transparente:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}