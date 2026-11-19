import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { cancelarNotas, emitirNota, nfseConfigurada } from "@/lib/nfse";
import { registroSupabase } from "@/lib/nfse-registro";
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

  const traduzida = traduzirEvento(evento);
  // Alerta de fraude: reembolsa já. A chave de idempotência evita reembolsar duas
  // vezes se o Stripe reenviar o aviso. O acesso cai no `charge.refunded` que vem depois.
  if (traduzida.acao === "reembolsar") {
    try {
      await clienteStripe().refunds.create({ charge: traduzida.cobranca, reason: "fraudulent" }, { idempotencyKey: `alerta-fraude-${evento.id}` });
    } catch (e) {
      const codigo = (e as { code?: string }).code;
      if (codigo !== "charge_already_refunded" && codigo !== "charge_disputed") {
        console.error(JSON.stringify({ tipo: "erro_webhook_stripe", evento: evento.type, id: evento.id, mensagem: String(e) }));
        return NextResponse.json({ erro: "falha ao reembolsar" }, { status: 500 });
      }
    }
  }
  const acao = traduzida.acao === "reembolsar" ? ({ acao: "ignorar" } as const) : traduzida;
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
  // Nota fiscal (NFS-e pelo Asaas). "repetido": o Stripe reenviou o aviso, talvez
  // porque a nota falhou da outra vez; emitirNota não emite duas vezes.
  if (nfseConfigurada()) {
    const registro = registroSupabase(supabaseAdmin());
    if (acao.acao === "liberar" && (resultado === "aplicado" || resultado === "repetido")) {
      try {
        await emitirNota(evento, { stripe: clienteStripe(), registro });
      } catch (e) {
        // 500: o Stripe reenvia; o acesso já foi liberado e não é aplicado de novo.
        console.error(JSON.stringify({ tipo: "erro_nfse", evento: evento.type, id: evento.id, mensagem: String(e) }));
        return NextResponse.json({ erro: "falha ao emitir a nota" }, { status: 500 });
      }
    }
    const pagamento = pagamentoRevogado(evento);
    if (acao.acao === "revogar" && resultado === "aplicado" && pagamento)
      await cancelarNotas(pagamento, registro).catch((e) => console.error(JSON.stringify({ tipo: "erro_cancelar_nfse", mensagem: String(e) })));
  }
  console.log(JSON.stringify({ tipo: "webhook_stripe", evento: evento.type, id: evento.id, acao: acao.acao, resultado }));
  return NextResponse.json({ ok: true, resultado });
}

/** O PaymentIntent do reembolso ou da contestação: é por ele que achamos a nota a cancelar. */
function pagamentoRevogado(evento: Stripe.Event): string | null {
  if (evento.type !== "charge.refunded" && evento.type !== "charge.dispute.created") return null;
  const pi = evento.data.object.payment_intent;
  return pi == null ? null : typeof pi === "string" ? pi : pi.id;
}
