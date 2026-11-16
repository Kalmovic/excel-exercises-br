import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cancelarAssinatura } from "@/lib/asaas";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Avisos do Asaas (pagamento confirmado, atrasado, reembolsado, assinatura cancelada).
 *
 * Segurança: qualquer um pode mandar um POST para esta URL. Por isso o Asaas
 * envia, em cada aviso, o cabeçalho `asaas-access-token` com um segredo que só
 * nós e ele conhecemos (ASAAS_WEBHOOK_TOKEN, cadastrado no painel do Asaas).
 * Sem o segredo certo, nada é aplicado.
 *
 * O trabalho de verdade é a função `aplicar_evento_pagamento` no banco
 * (supabase/migrations/20261116120000_pagamentos.sql): idempotente e numa transação.
 */
export async function POST(request: Request) {
  if (!tokenCerto(request.headers.get("asaas-access-token"))) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const evento = (await request.json().catch(() => null)) as { id?: string; event?: string; payment?: { subscription?: string } } | null;
  if (!evento?.id || !evento.event) return NextResponse.json({ erro: "aviso inválido" }, { status: 400 });

  const { data: resultado, error } = await supabaseAdmin().rpc("aplicar_evento_pagamento", { evento });
  if (error) {
    // Erro 500 faz o Asaas tentar de novo depois; a função não aplica nada duas vezes.
    console.error(JSON.stringify({ tipo: "erro_webhook_asaas", evento: evento.event, id: evento.id, mensagem: error.message }));
    return NextResponse.json({ erro: "falha ao aplicar" }, { status: 500 });
  }

  // Reembolso: além de cortar o acesso (feito no banco), para de cobrar o cartão.
  if (resultado === "reembolsado" && evento.payment?.subscription) {
    await cancelarAssinatura(evento.payment.subscription).catch((e) =>
      console.error(JSON.stringify({ tipo: "erro_cancelar_apos_reembolso", mensagem: String(e) })),
    );
  }
  console.log(JSON.stringify({ tipo: "webhook_asaas", evento: evento.event, id: evento.id, resultado }));
  return NextResponse.json({ ok: true, resultado });
}

/** Compara em tempo constante (o tempo de resposta não revela quantos caracteres acertou). */
function tokenCerto(recebido: string | null) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || esperado.length < 24 || !recebido) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recebido), h(esperado));
}
