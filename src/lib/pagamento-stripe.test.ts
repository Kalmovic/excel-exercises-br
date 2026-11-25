import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { traduzirEvento } from "./pagamento-stripe";

/** Aviso de exemplo, só com os campos que importam. */
const aviso = (type: string, object: unknown, extra: Record<string, unknown> = {}) =>
  ({ id: "evt_1", type, created: Date.UTC(2026, 10, 17, 12) / 1000, data: { object, ...extra } }) as unknown as Stripe.Event;

/** O checkout do anual como /api/assinatura cria. */
const ANUAL = { mode: "payment", payment_status: "paid", customer: "cus_1", currency: "brl", metadata: { usuario_id: "u1", plano: "anual" } };

describe("tradução dos avisos do Stripe", () => {
  it("anual pago no checkout: libera 1 ano + 3 dias, com o aluno do client_reference_id", () => {
    const r = traduzirEvento(aviso("checkout.session.completed", { ...ANUAL, client_reference_id: "u1" }));
    expect(r).toMatchObject({ acao: "liberar", plano: "anual", cliente: "cus_1", usuario: "u1" });
    expect(r.acao === "liberar" && r.acessoAte.toISOString().slice(0, 10)).toBe("2027-11-20");
  });

  it("Pix ainda não pago: ignora; quando cai (async_payment_succeeded), libera", () => {
    expect(traduzirEvento(aviso("checkout.session.completed", { mode: "payment", payment_status: "unpaid", customer: "cus_1" })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("checkout.session.async_payment_succeeded", ANUAL)).acao).toBe("liberar");
  });

  it("checkout do mensal: ignora (quem libera é a fatura)", () => {
    expect(traduzirEvento(aviso("checkout.session.completed", { mode: "subscription", payment_status: "paid", customer: "cus_1" })).acao).toBe("ignorar");
  });

  it("fatura da assinatura paga: libera até o fim do período + 3 dias", () => {
    const fim = Date.UTC(2026, 11, 17) / 1000;
    const r = traduzirEvento(
      aviso("invoice.paid", {
        customer: "cus_1",
        lines: { data: [{ period: { start: fim - 30 * 86400, end: fim } }] },
        currency: "brl",
        parent: { subscription_details: { subscription: "sub_1", metadata: { usuario_id: "u1" } } },
      }),
    );
    expect(r).toMatchObject({ acao: "liberar", plano: "mensal", cliente: "cus_1", assinatura: "sub_1", usuario: "u1" });
    expect(r.acao === "liberar" && r.acessoAte.toISOString().slice(0, 10)).toBe("2026-12-20");
  });

  it("fatura avulsa (sem assinatura): ignora", () => {
    expect(traduzirEvento(aviso("invoice.paid", { customer: "cus_1", lines: { data: [{ period: { end: 1 } }] }, parent: null })).acao).toBe("ignorar");
  });

  it("pagamento falhou: atrasar", () => {
    expect(traduzirEvento(aviso("invoice.payment_failed", { customer: { id: "cus_1" } }))).toEqual({ acao: "atrasar", cliente: "cus_1" });
  });

  it("cancelou a renovação, desistiu, e a assinatura acabou", () => {
    expect(traduzirEvento(aviso("customer.subscription.updated", { customer: "cus_1", cancel_at_period_end: true, status: "active" })).acao).toBe("cancelar_renovacao");
    expect(
      traduzirEvento(aviso("customer.subscription.updated", { customer: "cus_1", cancel_at_period_end: false, status: "active" }, { previous_attributes: { cancel_at_period_end: true } })).acao,
    ).toBe("reativar");
    expect(traduzirEvento(aviso("customer.subscription.updated", { customer: "cus_1", cancel_at_period_end: false, status: "active" })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("customer.subscription.deleted", { customer: "cus_1" })).acao).toBe("cancelar_renovacao");
  });

  it("reembolso total revoga; parcial, não", () => {
    expect(traduzirEvento(aviso("charge.refunded", { customer: "cus_1", refunded: true }))).toEqual({ acao: "revogar", cliente: "cus_1" });
    expect(traduzirEvento(aviso("charge.refunded", { customer: "cus_1", refunded: false })).acao).toBe("ignorar");
  });

  it("outros avisos: ignora", () => {
    expect(traduzirEvento(aviso("payment_intent.created", {})).acao).toBe("ignorar");
  });

  it("só libera o checkout criado pelo nosso servidor (metadados de plano e aluno, em reais)", () => {
    const pago = { mode: "payment", payment_status: "paid", customer: "cus_1", currency: "brl" };
    // Payment Link ou produto avulso do painel: client_reference_id vem da URL, sem metadados.
    expect(traduzirEvento(aviso("checkout.session.completed", { ...pago, client_reference_id: "u-qualquer" })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("checkout.session.completed", { ...pago, metadata: { plano: "anual" } })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("checkout.session.completed", { ...pago, metadata: { usuario_id: "u1", plano: "outro" } })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("checkout.session.completed", { ...ANUAL, currency: "usd" })).acao).toBe("ignorar");
    // client_reference_id diferente do aluno dos metadados: alguém mexeu.
    expect(traduzirEvento(aviso("checkout.session.completed", { ...ANUAL, client_reference_id: "u2" })).acao).toBe("ignorar");
    expect(traduzirEvento(aviso("checkout.session.completed", ANUAL))).toMatchObject({ acao: "liberar", usuario: "u1" });
  });

  it("fatura de assinatura que não é a do Pro (sem o aluno nos metadados): ignora", () => {
    const fatura = (extra: object) =>
      aviso("invoice.paid", { customer: "cus_1", currency: "brl", lines: { data: [{ period: { end: 2e9 } }] }, ...extra });
    expect(traduzirEvento(fatura({ parent: { subscription_details: { subscription: "sub_9", metadata: {} } } })).acao).toBe("ignorar");
    expect(traduzirEvento(fatura({ parent: { subscription_details: { subscription: "sub_9", metadata: null } } })).acao).toBe("ignorar");
    expect(traduzirEvento(fatura({ currency: "usd", parent: { subscription_details: { subscription: "sub_1", metadata: { usuario_id: "u1" } } } })).acao).toBe("ignorar");
  });

  it("contestação (chargeback): revoga; o cliente vem da cobrança", () => {
    expect(traduzirEvento(aviso("charge.dispute.created", { charge: "ch_1" }))).toEqual({ acao: "revogar", cliente: null, cobranca: "ch_1" });
    expect(traduzirEvento(aviso("charge.dispute.created", { charge: { id: "ch_1", customer: "cus_1" } }))).toEqual({ acao: "revogar", cliente: "cus_1", cobranca: "ch_1" });
  });

  it("alerta de fraude: reembolsar quando dá para agir; ignorar quando não", () => {
    expect(traduzirEvento(aviso("radar.early_fraud_warning.created", { charge: "ch_1", actionable: true }))).toEqual({ acao: "reembolsar", cobranca: "ch_1" });
    expect(traduzirEvento(aviso("radar.early_fraud_warning.created", { charge: { id: "ch_2" }, actionable: true }))).toEqual({ acao: "reembolsar", cobranca: "ch_2" });
    expect(traduzirEvento(aviso("radar.early_fraud_warning.created", { charge: "ch_1", actionable: false })).acao).toBe("ignorar");
  });

  describe("licença de empresa (fatura avulsa do admin)", () => {
    const FATURA = {
      id: "in_org_1",
      customer: "cus_org",
      currency: "brl",
      amount_paid: 90000,
      status_transitions: { paid_at: Date.UTC(2026, 10, 25, 15) / 1000 },
      lines: { data: [{ quantity: 5, period: { start: 1, end: 1 } }] },
      metadata: { organizacao_id: "org-1", assentos: "5" },
      parent: null,
    };

    it("paga: ativa a organização (com a data do pagamento), não mexe em aluno", () => {
      const r = traduzirEvento(aviso("invoice.paid", FATURA));
      expect(r).toMatchObject({ acao: "liberar_empresa", organizacao: "org-1", cliente: "cus_org", fatura: "in_org_1" });
      expect(r.acao === "liberar_empresa" && r.pagoEm.toISOString()).toBe("2026-11-25T15:00:00.000Z");
    });

    it("sem paid_at: usa a hora do aviso; em outra moeda: ignora", () => {
      const r = traduzirEvento(aviso("invoice.paid", { ...FATURA, status_transitions: null }));
      expect(r.acao === "liberar_empresa" && r.pagoEm.toISOString()).toBe("2026-11-17T12:00:00.000Z");
      expect(traduzirEvento(aviso("invoice.paid", { ...FATURA, currency: "usd" })).acao).toBe("ignorar");
    });

    it("fatura de assinatura com organizacao_id nos metadados: segue a regra do aluno", () => {
      const r = traduzirEvento(
        aviso("invoice.paid", { ...FATURA, lines: { data: [{ period: { start: 1, end: 2e9 } }] }, parent: { subscription_details: { subscription: "sub_1", metadata: { usuario_id: "u1" } } } }),
      );
      expect(r).toMatchObject({ acao: "liberar", usuario: "u1" });
    });

    it("boleto da empresa falhou: ignora (não existe assinatura de aluno para atrasar)", () => {
      expect(traduzirEvento(aviso("invoice.payment_failed", FATURA)).acao).toBe("ignorar");
      expect(traduzirEvento(aviso("invoice.payment_failed", { customer: "cus_1" })).acao).toBe("atrasar");
    });
  });
});
