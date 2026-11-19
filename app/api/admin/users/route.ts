import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });
  }
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: identityError } = await authClient.auth.getUser(token);
  if (identityError || !identity.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("admin_users")
    .select("role").eq("auth_user_id", identity.user.id).maybeSingle();
  if (actorError || !actor || !["Master", "Proprietario"].includes(actor.role)) {
    return NextResponse.json({ error: "Sem permissão para cadastrar usuários." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const fields = body as Record<string, unknown>;
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
  const password = typeof fields.password === "string" ? fields.password : "";
  const role = fields.role;
  if (!name || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 72 || !["Proprietario", "Funcionario"].includes(String(role))) {
    return NextResponse.json({ error: "Confira nome, e-mail, perfil e senha (8 a 72 caracteres)." }, { status: 400 });
  }
  const { data: existing, error: existingError } = await admin.from("admin_users").select("id").ilike("email", email).limit(1);
  if (existingError) return NextResponse.json({ error: "Não foi possível verificar o e-mail." }, { status: 500 });
  if (existing?.length) return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) return NextResponse.json({ error: createError?.message || "Erro ao criar autenticação." }, { status: 400 });
  const { error: insertError } = await admin.from("admin_users").insert({ name, email, role, auth_user_id: created.user.id });
  if (insertError) {
    const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
    if (rollbackError) console.error("Falha ao reverter cadastro Auth:", rollbackError.message);
    return NextResponse.json({ error: "Não foi possível vincular o perfil. Cadastro revertido; verifique os registros antes de tentar novamente." }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
