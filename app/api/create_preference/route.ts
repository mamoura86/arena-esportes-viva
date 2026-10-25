import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
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
      title, 
      unit_price, 
      customerName, 
      customerPhone, 
      slots, 
      selectedSport, 
      selectedDate,
      upgradeItemCost,
      isClass 
    } = body;

    const finalAmount = Number(unit_price);
    if (!finalAmount || isNaN(finalAmount)) {
      return NextResponse.json({ success: false, error: "Valor da transação inválido." }, { status: 400 });
    }

    const prefix = isClass ? "AULA" : "VIVA";
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const bookingCode = `${prefix}-${code}`;

    const expirationDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const preference = new Preference(client);
    
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const preferenceResult = await preference.create({
      body: {
        items: [
          {
            id: "reserva-ct-viva",
            title: title || 'Reserva Arena CT Viva Esportes',
            unit_price: finalAmount,
            quantity: 1,
            currency_id: 'BRL',
          }
        ],
        payer: {
          name: customerName || 'Cliente Arena',
          phone: { number: customerPhone || '' }
        },
        back_urls: {
          success: `${baseUrl}/?status=success&code=${bookingCode}&phone=${customerPhone}`,
          failure: `${baseUrl}/?status=failure`,
          pending: `${baseUrl}/?status=pending`,
        },
        auto_return: 'approved',
        date_of_expiration: expirationDate,
        external_reference: bookingCode,
      }
    });

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
        price: slot.price + (index === 0 ? Number(upgradeItemCost || 0) : 0),
        channel: "online",
        payment_method: "Checkout Pro",
        status: "aguardando_pagamento"
      }));

      await supabase.from("bookings").insert(recordsToInsert);
    }

    return NextResponse.json({ 
      success: true, 
      init_point: preferenceResult.init_point,
      bookingCode 
    });

  } catch (error: any) {
    console.error("Erro ao criar preferência no Mercado Pago:", error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
}