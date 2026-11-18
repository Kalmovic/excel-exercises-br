/**
 * Traduz um aviso (webhook) do Stripe numa ação simples para o banco
 * (função registrar_pagamento). Função pura: fácil de testar com avisos de exemplo.
 *
 * Quem é o aluno: o `usuario_id` que o NOSSO servidor grava nos metadados do
 * Checkout e da assinatura (/api/assinatura), ou o id do cliente no Stripe,
 * gravado na nossa tabela quando o checkout é criado.
 *
 * Só libera o Pro para o que o nosso servidor criou. Os preços são criados na
 * hora (price_data), então não há id de preço/produto fixo para conferir; a
 * conferência é pelos metadados, que um Payment Link ou um produto avulso do
 * painel não têm (lá, o comprador escolhe o client_reference_id pela URL).
 */
import type Stripe from "stripe";

export type AcaoPagamento =
  | { acao: "ignorar" }
  | { acao: "liberar"; cliente: string | null; usuario?: string | null; plano: "mensal" | "anual"; acessoAte: Date; assinatura?: string | null }
  | { acao: "atrasar" | "cancelar_renovacao" | "reativar"; cliente: string | null }
  /** `cobranca`: a disputa não traz o cliente; o webhook o busca pela cobrança. */
  | { acao: "revogar"; cliente: string | null; cobranca?: string | null };

const TOLERANCIA_DIAS = 3;
const DIA = 24 * 60 * 60 * 1000;
const id = (x: string | { id: string } | null | undefined) => (x == null ? null : typeof x === "string" ? x : x.id);

/** Um ano a partir do pagamento, mais a tolerância. */
function umAnoDepois(segundos: number) {
  const d = new Date(segundos * 1000);
  d.setFullYear(d.getFullYear() + 1);
  return new Date(d.getTime() + TOLERANCIA_DIAS * DIA);
}

export function traduzirEvento(evento: Stripe.Event): AcaoPagamento {
  switch (evento.type) {
    // Anual (pagamento único): pago na hora (cartão) ou depois (Pix, boleto).
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = evento.data.object;
      if (s.mode !== "payment" || s.payment_status !== "paid") return { acao: "ignorar" }; // mensal: quem libera é invoice.paid
      // Só o checkout do anual criado por /api/assinatura: com plano e aluno nos metadados, em reais.
      const usuario = s.metadata?.usuario_id;
      if (s.metadata?.plano !== "anual" || !usuario || s.currency !== "brl") return { acao: "ignorar" };
      if (s.client_reference_id && s.client_reference_id !== usuario) return { acao: "ignorar" };
      return { acao: "liberar", cliente: id(s.customer), usuario, plano: "anual", acessoAte: umAnoDepois(evento.created) };
    }
    // Mensal: cada fatura paga (inclusive a primeira) libera até o fim do período dela.
    case "invoice.paid": {
      const f = evento.data.object;
      const fim = Math.max(0, ...f.lines.data.map((l) => l.period?.end ?? 0));
      if (!fim) return { acao: "ignorar" };
      const detalhes = f.parent?.subscription_details;
      const assinatura = id(detalhes?.subscription ?? null);
      if (!assinatura) return { acao: "ignorar" }; // fatura avulsa: não é a assinatura do Pro
      // Só a assinatura criada por /api/assinatura (subscription_data.metadata.usuario_id).
      // O aluno vai junto: se a corrida criou dois clientes no Stripe, a fatura do
      // "outro" cliente ainda acha o aluno certo.
      const usuario = detalhes?.metadata?.usuario_id;
      if (!usuario || (f.currency && f.currency !== "brl")) return { acao: "ignorar" };
      return { acao: "liberar", cliente: id(f.customer), usuario, plano: "mensal", acessoAte: new Date(fim * 1000 + TOLERANCIA_DIAS * DIA), assinatura };
    }
    case "invoice.payment_failed":
      return { acao: "atrasar", cliente: id(evento.data.object.customer) };
    case "customer.subscription.updated": {
      const a = evento.data.object;
      if (a.cancel_at_period_end) return { acao: "cancelar_renovacao", cliente: id(a.customer) };
      // Desistiu de cancelar (o Stripe tira o cancel_at_period_end).
      const antes = evento.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
      if (antes?.cancel_at_period_end === true && a.status === "active") return { acao: "reativar", cliente: id(a.customer) };
      return { acao: "ignorar" };
    }
    case "customer.subscription.deleted":
      return { acao: "cancelar_renovacao", cliente: id(evento.data.object.customer) };
    // Reembolso total (garantia de 7 dias): o acesso termina na hora.
    case "charge.refunded": {
      const c = evento.data.object;
      if (!c.refunded) return { acao: "ignorar" }; // reembolso parcial não tira o acesso
      return { acao: "revogar", cliente: id(c.customer) };
    }
    // Contestação no cartão (chargeback): o acesso termina na hora, como no reembolso.
    case "charge.dispute.created": {
      const d = evento.data.object;
      const cobranca = typeof d.charge === "string" ? null : d.charge;
      return { acao: "revogar", cliente: id(cobranca?.customer), cobranca: id(d.charge) };
    }
    default:
      return { acao: "ignorar" };
  }
}
