import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      transaction_amount, token, description, installments, payment_method_id, issuer_id, payer,
      title, customerName, customerPhone, slots, selectedSport, selectedDate, isClass
    } = body;

    if (!transaction_amount) {
      return NextResponse.json({ success: false, error: "Valor da transação inválido." }, { status: 400 });
    }

    // Força a criação de um email de teste dinâmico e válido para o Mercado Pago
    const timestamp = Date.now();
    const safeEmail = `test_user_${timestamp}@testuser.com`;

    const paymentData = {
      transaction_amount: Number(transaction_amount),
      token,
      description: title || description || 'Reserva CT Viva',
      installments: Number(installments) || 1,
      payment_method_id,
      issuer_id,
      payer: {
        email: safeEmail,
        identification: payer?.identification
      }
    };

    const payment = new Payment(client);
    const idempotencyKey = crypto.randomUUID(); 
    
    const paymentResult = await payment.create({ 
      body: paymentData,
      requestOptions: { idempotencyKey }
    });

    const status = paymentResult.status;
    
    if (status === 'approved' || status === 'in_process' || status === 'pending') {
      const prefix = isClass ? "AULA" : "VIVA";
      const codeStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const bookingCode = `${prefix}-${codeStr}`;

      if (!isClass && slots && slots.length > 0) {
        const recordsToInsert = slots.map((slot: any, index: number) => ({
          id: `temp-${Date.now()}-${index}`,
          code: bookingCode,
          customer_name: customerName,
          customer_phone: customerPhone,
          court_id: slot.courtId,
          court_name: slot.courtName,
          sport: selectedSport,
          booking_date: selectedDate,
          booking_time: slot.time,
          price: slot.price,
          channel: "online",
          payment_method: payment_method_id === "pix" ? "Pix" : "Cartão de Crédito",
          status: status === 'approved' ? "confirmado" : "aguardando_pagamento",
          created_at: new Date().toISOString()
        }));
        await supabase.from("bookings").insert(recordsToInsert);
      }
    }

    return NextResponse.json({ success: true, detail: paymentResult });
  } catch (error: any) {
    console.error("Erro no pagamento transparente:", error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao processar' }, { status: 500 });
  }
}