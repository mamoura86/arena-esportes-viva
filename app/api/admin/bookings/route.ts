import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const noStore = { "Cache-Control": "no-store" };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status, headers: noStore });
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return errorResponse("Serviço temporariamente indisponível.", 503);
  }

  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return errorResponse("Sessão não informada.", 401);

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(match[1]);
  if (authError || !authData.user) {
    return errorResponse("Sessão inválida ou expirada.", 401);
  }

  if (authData.user.app_metadata?.must_change_password === true) {
    return errorResponse(
      "Altere sua senha temporária antes de acessar o sistema.",
      403
    );
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
    return errorResponse("Não foi possível validar o acesso administrativo.", 503);
  }
  if (!admin) return errorResponse("Acesso restrito a gestores.", 403);

  const { data, error } = await db
    .from("booking_addons")
    .select("booking_code,sport,addon_key,addon_name,addon_price")
    .order("booking_code", { ascending: true });

  if (error) {
    console.error("Falha ao consultar adicionais:", error.code);
    return errorResponse("Não foi possível carregar os adicionais das reservas.", 500);
  }

  const { data: closures, error: closureError } = await db
    .from("booking_financial_closures")
    .select("booking_code,termination_mode,termination_reason,loss_amount,closed_at")
    .order("closed_at", { ascending: false });
  if (closureError) {
    console.error("Falha ao consultar encerramentos:", closureError.code);
    return errorResponse("Não foi possível carregar os encerramentos financeiros.", 500);
  }

  return NextResponse.json(
    { success: true, addons: data ?? [], closures: closures ?? [] },
    { headers: noStore }
  );
}
