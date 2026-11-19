import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: "Configuração incompleta." }, { status: 500 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await auth.auth.getUser(token);
  if (identityError || !identity.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: account, error: accountError } = await admin.from("admin_users")
    .select("role").eq("auth_user_id", identity.user.id).maybeSingle();
  if (accountError || !account || !["Proprietario", "Funcionario"].includes(account.role)) {
    return NextResponse.json({ error: "Operação não autorizada." }, { status: 403 });
  }
  if (identity.user.app_metadata?.must_change_password !== true) {
    return NextResponse.json({ error: "Não existe troca inicial pendente." }, { status: 409 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const password = body && typeof body === "object" && "password" in body ? (body as { password?: unknown }).password : null;
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "A senha deve ter entre 8 e 72 caracteres." }, { status: 400 });
  }
  const metadata = { ...identity.user.app_metadata, must_change_password: false };
  const { error: updateError } = await admin.auth.admin.updateUserById(identity.user.id, { password, app_metadata: metadata });
  if (updateError) return NextResponse.json({ error: "Não foi possível atualizar a senha." }, { status: 500 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
