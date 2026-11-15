
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string"
      ? body.code.trim().toUpperCase()
      : "";
    const context = body?.context;
    const phone = typeof body?.phone === "string"
  ? body.phone.replace(/\D/g, "")
  : "";

if (!/^\d{10,11}$/.test(phone)) {
  return NextResponse.json(
    { error: "Informe um WhatsApp válido com DDD." },
    { status: 400 }
  );
}
    if (!code || code.length > 100 ||
        !["quadras", "aulas"].includes(context)) {
      return NextResponse.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Serviço indisponível." },
        { status: 503 }
      );
    }

    const db = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await db
      .from("coupons")
      .select(
        "id,code,discount_type,discount_value,active,max_uses,used_count,scope"
      )
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao validar cupom." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Cupom inválido ou expirado." },
        { status: 404 }
      );
    }

    if (data.scope !== "ambos" && data.scope !== context) {
      return NextResponse.json(
        { error: "Cupom não permitido nesta modalidade." },
        { status: 400 }
      );
    }

    if (data.max_uses !== null &&
        Number(data.used_count ?? 0) >= data.max_uses) {
      return NextResponse.json(
        { error: "Cupom esgotado." },
        { status: 409 }
      );
    }

    const { data: previousUse, error: usageError } = await db
  .from("coupon_redemptions")
  .select("id")
  .eq("coupon_id", data.id)
  .eq("customer_phone", phone)
  .eq("status", "utilizado")
  .limit(1);

if (usageError) {
  return NextResponse.json(
    { error: "Erro ao verificar utilização do cupom." },
    { status: 500 }
  );
}

if (previousUse && previousUse.length > 0) {
  return NextResponse.json(
    { error: "Este WhatsApp já utilizou este cupom." },
    { status: 409 }
  );
}

const value = Number(data.discount_value);

    if (!Number.isFinite(value) || value <= 0 ||
        !["percent", "fixed"].includes(data.discount_type) ||
        (data.discount_type === "percent" && value > 100)) {
      return NextResponse.json(
        { error: "Configuração de cupom inválida." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        code: data.code,
        discountType: data.discount_type,
        discountValue: value,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível validar o cupom." },
      { status: 400 }
    );
  }
}
