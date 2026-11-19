import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const noStore = { "Cache-Control": "no-store" };

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: noStore }
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isMoney(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-7
  );
}

async function getAuthorizedAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return { error: errorResponse("Serviço temporariamente indisponível.", 503) } as const;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get("authorization") ?? ""
  );
  if (!match) {
    return { error: errorResponse("Sessão não informada.", 401) } as const;
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(
    match[1]
  );

  if (authError || !authData.user) {
    return { error: errorResponse("Sessão inválida ou expirada.", 401) } as const;
  }

  if (authData.user.app_metadata?.must_change_password === true) {
    return {
      error: errorResponse("Altere sua senha temporária antes de acessar o sistema.", 403),
    } as const;
  }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: admin, error: adminError } = await db
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (adminError) {
    console.error("Falha ao validar gestor:", adminError.code);
    return {
      error: errorResponse("Não foi possível validar o acesso administrativo.", 503),
    } as const;
  }

  if (!admin) {
    return { error: errorResponse("Acesso restrito a gestores.", 403) } as const;
  }

  return { db } as const;
}

export async function GET(request: Request) {
  const authorized = await getAuthorizedAdmin(request);
  if ("error" in authorized) return authorized.error;

  const { data, error } = await authorized.db
    .from("class_enrollments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Falha ao consultar matrículas:", error.code);
    return errorResponse("Não foi possível carregar as matrículas.", 500);
  }

  return NextResponse.json(
    { success: true, enrollments: data ?? [] },
    { headers: noStore }
  );
}

// Cadastro manual com financeiro: somente gestores autenticados.
export async function POST(request: Request) {
  const authorized = await getAuthorizedAdmin(request);
  if ("error" in authorized) return authorized.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Dados inválidos.", 400);
  }

  const input = body as Record<string, unknown>;
  const str = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const name = str(input.studentName);
  const phone = str(input.studentPhone).replace(/\D/g, "");
  const sport = str(input.sport);
  const category = str(input.category);
  const mainClass = str(input.mainClass);
  const planType = str(input.planType);
  const startDate = str(input.startDate);
  const paymentMode = str(input.paymentMode);
  const cardBrand = str(input.cardBrand);
  const cardReference = str(input.cardReference);
  const notes = str(input.notes);
  const cardFeePercent = input.cardFeePercent ?? 0;

  if (name.length < 3 || name.length > 120 || !/^\d{10,11}$/.test(phone)) {
    return errorResponse("Nome ou telefone inválido.", 400);
  }

  if (![sport, category, mainClass].every(
    (value) => value.length > 0 && value.length <= 150
  )) {
    return errorResponse("Modalidade, categoria ou turma inválida.", 400);
  }

  if (!["mensal", "trimestral", "semestral"].includes(planType)) {
    return errorResponse("Plano inválido.", 400);
  }

  if (!isValidDate(startDate)) {
    return errorResponse("Data de início inválida.", 400);
  }

  if (!["integral", "parcelado_arena"].includes(paymentMode)) {
    return errorResponse("Escolha pagamento integral ou parcelamento pela arena.", 400);
  }

  if (planType === "mensal" && paymentMode === "parcelado_arena") {
    return errorResponse(
      "O plano mensal permite entrada e saldo pendente, mas não vencimentos programados.",
      400
    );
  }

  if (!Array.isArray(input.installments) || input.installments.length > 60) {
    return errorResponse("Lista de vencimentos inválida.", 400);
  }

  if (paymentMode === "integral" && input.installments.length !== 0) {
    return errorResponse(
      "Pagamento integral não utiliza vencimentos programados.",
      400
    );
  }

  if (paymentMode === "parcelado_arena" && input.installments.length < 1) {
    return errorResponse(
      "Informe os vencimentos do saldo parcelado pela arena.",
      400
    );
  }

  const installments: { date: string; amount: number }[] = [];
  for (const item of input.installments) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return errorResponse("Vencimento inválido.", 400);
    }

    const entry = item as Record<string, unknown>;
    const date = str(entry.date);

    if (!isValidDate(date) || !isMoney(entry.amount)) {
      return errorResponse("Data ou valor de vencimento inválido.", 400);
    }

    installments.push({ date, amount: entry.amount });
  }

  if (!Array.isArray(input.initialPayments) || input.initialPayments.length > 20) {
    return errorResponse("Lista de recebimentos inválida.", 400);
  }

  const initialPayments: {
    amount: number;
    method: string;
    installments?: number;
    feePercent?: number;
    notes?: string;
  }[] = [];

  let hasCredit = false;

  for (const item of input.initialPayments) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return errorResponse("Recebimento inválido.", 400);
    }

    const entry = item as Record<string, unknown>;
    const method = str(entry.method);

    if (
      !isMoney(entry.amount) ||
      !["dinheiro", "pix", "debito", "credito", "wellhub", "totalpass"].includes(method)
    ) {
      return errorResponse("Valor ou forma de pagamento inválida.", 400);
    }

    const isCard = method === "credito" || method === "debito";
    const feePercent = entry.feePercent ?? (method === "credito" ? cardFeePercent : 0);
    if (isCard) {
      if (
        typeof feePercent !== "number" ||
        !Number.isFinite(feePercent) ||
        feePercent < 0 ||
        feePercent > 100 ||
        Math.abs(Math.round(feePercent * 10000) - feePercent * 10000) > 1e-7
      ) {
        return errorResponse("Taxa individual do cartão inválida.", 400);
      }
    } else if (entry.feePercent != null && entry.feePercent !== 0) {
      return errorResponse("Taxa permitida somente para crédito ou débito.", 400);
    }

    if (method === "credito") {
      hasCredit = true;
      const cardInstallments = entry.installments ?? 1;

      if (
        typeof cardInstallments !== "number" ||
        !Number.isInteger(cardInstallments) ||
        cardInstallments < 1 ||
        cardInstallments > 12
      ) {
        return errorResponse(
          "A quantidade de parcelas no crédito deve estar entre 1 e 12.",
          400
        );
      }

      initialPayments.push({
        amount: entry.amount,
        method,
        installments: cardInstallments,
        feePercent: feePercent as number,
        notes: str(entry.notes).slice(0, 500),
      });
    } else {
      if (entry.installments != null) {
        return errorResponse(
          "Quantidade de parcelas só pode ser informada para pagamentos no crédito.",
          400
        );
      }

      initialPayments.push({
        amount: entry.amount,
        method,
        ...(method === "debito" ? { feePercent: feePercent as number } : {}),
        notes: str(entry.notes).slice(0, 500),
      });
    }
  }

  if (
    typeof cardFeePercent !== "number" ||
    !Number.isFinite(cardFeePercent) ||
    cardFeePercent < 0 ||
    cardFeePercent > 100 ||
    Math.abs(Math.round(cardFeePercent * 10000) - cardFeePercent * 10000) > 1e-7
  ) {
    return errorResponse("Taxa percentual inválida.", 400);
  }

  if (!hasCredit && cardFeePercent !== 0) {
    return errorResponse(
      "Informe taxa percentual somente quando houver recebimento no crédito.",
      400
    );
  }

  if (
    cardBrand.length > 100 ||
    cardReference.length > 150 ||
    notes.length > 1000
  ) {
    return errorResponse("Informações financeiras muito longas.", 400);
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = `AULA-${Array.from(bytes, (byte) =>
      alphabet[byte % alphabet.length]
    ).join("")}`;

    const { data, error } = await authorized.db.rpc(
      "create_admin_class_enrollment_financial_atomic",
      {
        p_code: code,
        p_student_name: name,
        p_student_phone: phone,
        p_sport: sport,
        p_category: category,
        p_main_class: mainClass,
        p_plan_type: planType,
        p_start_date: startDate,
        p_payment_mode: paymentMode,
        p_installments: installments,
        p_initial_payments: initialPayments,
        p_card_fee_percent: cardFeePercent,
        p_card_brand: cardBrand || null,
        p_card_reference: cardReference || null,
        p_notes: notes || null,
      }
    );

    if (error?.code === "23505" && /code|class_enrollments/i.test(error.message)) {
      continue;
    }

    if (error) {
      console.error("Falha no cadastro financeiro:", error.code, error.message);
      return errorResponse(
        "Não foi possível concluir a matrícula financeira. Confira a turma, os valores e as condições de pagamento.",
        409
      );
    }

    return NextResponse.json(
      { success: true, ...data },
      { status: 201, headers: noStore }
    );
  }

  return errorResponse("Não foi possível gerar um código disponível.", 503);
}
