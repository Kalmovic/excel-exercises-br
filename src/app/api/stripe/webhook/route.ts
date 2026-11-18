import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { traduzirEvento } from "@/lib/pagamento-stripe";
import { clienteStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Avisos do Stripe (pagamento, renovação, cancelamento, reembolso).
 *
 * Segurança: o Stripe assina cada aviso com o segredo do endpoint
 * (STRIPE_WEBHOOK_SECRET). `constructEvent` recalcula a assinatura sobre o
 * corpo EXATO recebido e confere também a hora (aviso velho reenviado por um
 * atacante é recusado). Sem assinatura válida, nada é aplicado.
 */
export async function POST(request: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ erro: "webhook não configurado" }, { status: 503 });
  const corpo = await request.text(); // o corpo cru: qualquer mudança invalida a assinatura
  let evento: Stripe.Event;
  try {
    evento = clienteStripe().webhooks.constructEvent(corpo, request.headers.get("stripe-signature") ?? "", segredo);
  } catch {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 400 });
  }

  const acao = traduzirEvento(evento);
  // Disputa (chargeback): o aviso traz a cobrança, não o cliente. Busca no Stripe.
  if (acao.acao === "revogar" && !acao.cliente && acao.cobranca) {
    try {
      const c = await clienteStripe().charges.retrieve(acao.cobranca);
      acao.cliente = typeof c.customer === "string" ? c.customer : (c.customer?.id ?? null);
    } catch (e) {
      // 500: o Stripe tenta de novo mais tarde.
      console.error(JSON.stringify({ tipo: "erro_webhook_stripe", evento: evento.type, id: evento.id, mensagem: String(e) }));
      return NextResponse.json({ erro: "falha ao buscar a cobrança" }, { status: 500 });
    }
  }
  const { data: resultado, error } = await supabaseAdmin().rpc("registrar_pagamento", {
    p_evento_id: evento.id,
    p_tipo: evento.type,
    p_payload: evento.data.object,
    p_acao: acao.acao,
    p_cliente: acao.acao === "ignorar" ? null : acao.cliente,
    p_usuario: acao.acao === "liberar" ? (acao.usuario ?? null) : null,
    p_plano: acao.acao === "liberar" ? acao.plano : null,
    p_acesso_ate: acao.acao === "liberar" ? acao.acessoAte.toISOString() : null,
    p_assinatura: acao.acao === "liberar" ? (acao.assinatura ?? null) : null,
  });
  if (error) {
    // Erro 500 faz o Stripe tentar de novo; a função não aplica nada duas vezes.
    console.error(JSON.stringify({ tipo: "erro_webhook_stripe", evento: evento.type, id: evento.id, mensagem: error.message }));
    return NextResponse.json({ erro: "falha ao aplicar" }, { status: 500 });
  }

  // Reembolso ou disputa: além de cortar o acesso (no banco), para de cobrar o cartão.
  if (resultado === "aplicado" && acao.acao === "revogar" && acao.cliente) {
    const { data } = await supabaseAdmin()
      .from("assinaturas")
      .select("stripe_assinatura_id")
      .eq("stripe_cliente_id", acao.cliente)
      .maybeSingle<{ stripe_assinatura_id: string | null }>();
    if (data?.stripe_assinatura_id)
      await clienteStripe()
        .subscriptions.cancel(data.stripe_assinatura_id)
        .catch((e) => console.error(JSON.stringify({ tipo: "erro_cancelar_apos_reembolso", mensagem: String(e) })));
  }
  console.log(JSON.stringify({ tipo: "webhook_stripe", evento: evento.type, id: evento.id, acao: acao.acao, resultado }));
  return NextResponse.json({ ok: true, resultado });
}
