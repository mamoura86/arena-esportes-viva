import { NextResponse } from "next/server";

// Rota pública de envio genérico desativada por segurança.
// As notificações de reservas serão disparadas exclusivamente por código
// executado no servidor, após confirmação da operação no banco de dados.
// Não reative o recebimento de destinatário, assunto ou HTML do navegador.
export async function POST() {
  return NextResponse.json(
    { error: "Envio direto de e-mails indisponível." },
    { status: 410 }
  );
}
