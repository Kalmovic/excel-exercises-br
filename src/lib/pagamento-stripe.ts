/**
 * Traduz um aviso (webhook) do Stripe numa ação simples para o banco
 * (função registrar_pagamento). Função pura: fácil de testar com avisos de exemplo.
 *
 * Quem é o aluno: o `client_reference_id` do Checkout (quando vem) ou o id do
 * cliente no Stripe, gravado na nossa tabela quando o checkout é criado.
 */
import type Stripe from "stripe";

export type AcaoPagamento =
  | { acao: "ignorar" }
  | { acao: "liberar"; cliente: string | null; usuario?: string | null; plano: "mensal" | "anual"; acessoAte: Date; assinatura?: string | null }
  | { acao: "atrasar" | "cancelar_renovacao" | "reativar" | "revogar"; cliente: string | null };

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
      return { acao: "liberar", cliente: id(s.customer), usuario: s.client_reference_id, plano: "anual", acessoAte: umAnoDepois(evento.created) };
    }
    // Mensal: cada fatura paga (inclusive a primeira) libera até o fim do período dela.
    case "invoice.paid": {
      const f = evento.data.object;
      const fim = Math.max(0, ...f.lines.data.map((l) => l.period?.end ?? 0));
      if (!fim) return { acao: "ignorar" };
      const assinatura = id(f.parent?.subscription_details?.subscription ?? null);
      if (!assinatura) return { acao: "ignorar" }; // fatura avulsa: não é a assinatura do Pro
      return { acao: "liberar", cliente: id(f.customer), plano: "mensal", acessoAte: new Date(fim * 1000 + TOLERANCIA_DIAS * DIA), assinatura };
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
    default:
      return { acao: "ignorar" };
  }
}
