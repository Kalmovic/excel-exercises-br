import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SEGREDO = "whsec_teste_segredo";
const rpc = vi.fn();
// Licença de empresa: por padrão o cliente não é de empresa (o fluxo do aluno segue igual).
const rpcEmpresa = vi.fn<(args: object) => Promise<{ data: string | null; error: { message: string } | null }>>(async () => ({ data: "nao_empresa", error: null }));
const cancelar = vi.fn(async () => ({}));
const buscarCobranca = vi.fn(async (id: string) => ({ id, customer: "cus_7" }));
const reembolsar = vi.fn<(p: object, o?: object) => Promise<{ id: string }>>(async () => ({ id: "re_1" }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    rpc: (nome: string, args: object) => (nome === "registrar_pagamento_empresa" ? rpcEmpresa(args) : rpc(nome, args)),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_assinatura_id: "sub_1" } }) }) }) }),
  }),
}));
const nfse = { configurada: vi.fn(() => false), emitir: vi.fn(async () => "emitida"), cancelar: vi.fn(async () => 1) };
vi.mock("@/lib/nfse", () => ({ nfseConfigurada: () => nfse.configurada(), emitirNota: (...a: unknown[]) => nfse.emitir(...(a as [])), cancelarNotas: (...a: unknown[]) => nfse.cancelar(...(a as [])) }));
vi.mock("@/lib/nfse-registro", () => ({ registroSupabase: () => ({}) }));
vi.mock("@/lib/stripe", async () => {
  const { default: S } = await import("stripe");
  const s = new S("sk_test_x");
  return { clienteStripe: () => ({ webhooks: s.webhooks, subscriptions: { cancel: cancelar }, charges: { retrieve: buscarCobranca }, refunds: { create: reembolsar } }) };
});

const stripe = new Stripe("sk_test_x");
const assinado = (evento: object, segredo = SEGREDO, mexer?: (corpo: string) => string) => {
  const corpo = JSON.stringify(evento);
  const header = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: segredo });
  return new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: mexer ? mexer(corpo) : corpo });
};
const anualPago = {
  id: "evt_1",
  type: "checkout.session.completed",
  created: Math.floor(Date.now() / 1000),
  data: {
    object: { mode: "payment", payment_status: "paid", customer: "cus_1", client_reference_id: "u1", currency: "brl", metadata: { usuario_id: "u1", plano: "anual" } },
  },
};

describe("webhook do Stripe", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SEGREDO);
  const { POST } = await import("./route");
  beforeEach(() => {
    rpc.mockReset();
    cancelar.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("sem assinatura, com segredo errado ou corpo alterado: 400 e nada no banco", async () => {
    expect((await POST(new Request("http://x", { method: "POST", body: JSON.stringify(anualPago) }))).status).toBe(400);
    expect((await POST(assinado(anualPago, "whsec_outro"))).status).toBe(400);
    expect((await POST(assinado(anualPago, SEGREDO, (c) => c.replace('"u1"', '"atacante"')))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("aviso válido: vira a ação no banco", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    expect((await POST(assinado(anualPago))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "registrar_pagamento",
      expect.objectContaining({ p_evento_id: "evt_1", p_acao: "liberar", p_cliente: "cus_1", p_usuario: "u1", p_plano: "anual" }),
    );
  });

  it("reembolso: revoga no banco e cancela a assinatura no Stripe", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    await POST(assinado({ id: "evt_2", type: "charge.refunded", created: anualPago.created, data: { object: { customer: "cus_1", refunded: true } } }));
    expect(rpc).toHaveBeenCalledWith("registrar_pagamento", expect.objectContaining({ p_acao: "revogar" }));
    expect(cancelar).toHaveBeenCalledWith("sub_1");
  });

  it("contestação: busca o cliente pela cobrança, revoga e cancela a assinatura", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    const r = await POST(assinado({ id: "evt_3", type: "charge.dispute.created", created: anualPago.created, data: { object: { id: "dp_1", charge: "ch_9" } } }));
    expect(r.status).toBe(200);
    expect(buscarCobranca).toHaveBeenCalledWith("ch_9");
    expect(rpc).toHaveBeenCalledWith("registrar_pagamento", expect.objectContaining({ p_acao: "revogar", p_cliente: "cus_7" }));
    expect(cancelar).toHaveBeenCalledWith("sub_1");
  });

  it("contestação com o Stripe fora do ar: 500 (o Stripe reenvia) e nada no banco", async () => {
    buscarCobranca.mockRejectedValueOnce(new Error("rede"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await POST(assinado({ id: "evt_4", type: "charge.dispute.created", created: anualPago.created, data: { object: { id: "dp_2", charge: "ch_9" } } }));
    expect(r.status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("erro no banco: 500 (o Stripe reenvia)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "caiu" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(assinado(anualPago))).status).toBe(500);
  });

  it("alerta de fraude: reembolsa na hora (uma vez por aviso) e só registra o aviso", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    reembolsar.mockClear();
    const alerta = { id: "evt_5", type: "radar.early_fraud_warning.created", created: anualPago.created, data: { object: { id: "issfr_1", charge: "ch_5", actionable: true } } };
    expect((await POST(assinado(alerta))).status).toBe(200);
    expect(reembolsar).toHaveBeenCalledWith({ charge: "ch_5", reason: "fraudulent" }, { idempotencyKey: "alerta-fraude-evt_5" });
    expect(rpc).toHaveBeenCalledWith("registrar_pagamento", expect.objectContaining({ p_acao: "ignorar", p_cliente: null }));
    expect(cancelar).not.toHaveBeenCalled(); // o acesso cai no charge.refunded que vem depois
  });

  it("alerta de fraude já resolvido (já reembolsada): segue normal; erro de rede: 500", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const alerta = (id: string) => ({ id, type: "radar.early_fraud_warning.created", created: anualPago.created, data: { object: { id: "issfr_2", charge: "ch_6", actionable: true } } });
    reembolsar.mockRejectedValueOnce(Object.assign(new Error("já"), { code: "charge_already_refunded" }));
    expect((await POST(assinado(alerta("evt_6")))).status).toBe(200);
    rpc.mockClear();
    reembolsar.mockRejectedValueOnce(new Error("rede"));
    expect((await POST(assinado(alerta("evt_7")))).status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("nota fiscal: pagamento liberado emite a nota; aviso repetido tenta de novo (sem duplicar, quem garante é emitirNota)", async () => {
    nfse.configurada.mockReturnValue(true);
    nfse.emitir.mockClear();
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    expect((await POST(assinado(anualPago))).status).toBe(200);
    rpc.mockResolvedValue({ data: "repetido", error: null });
    expect((await POST(assinado(anualPago))).status).toBe(200);
    expect(nfse.emitir).toHaveBeenCalledTimes(2);
    rpc.mockResolvedValue({ data: "desconhecido", error: null }); // aluno não achado: sem nota
    await POST(assinado(anualPago));
    expect(nfse.emitir).toHaveBeenCalledTimes(2);
    nfse.configurada.mockReturnValue(false);
  });

  it("nota fiscal: Asaas fora do ar responde 500 (o Stripe reenvia); reembolso cancela a nota", async () => {
    nfse.configurada.mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    nfse.emitir.mockRejectedValueOnce(new Error("Asaas 503"));
    expect((await POST(assinado(anualPago))).status).toBe(500);
    nfse.cancelar.mockClear();
    const reembolso = { id: "evt_8", type: "charge.refunded", created: anualPago.created, data: { object: { id: "ch_1", refunded: true, customer: "cus_1", payment_intent: "pi_1" } } };
    expect((await POST(assinado(reembolso))).status).toBe(200);
    expect(nfse.cancelar).toHaveBeenCalledWith("pi_1", expect.anything());
    nfse.configurada.mockReturnValue(false);
  });

  describe("licença de empresa", () => {
    const faturaPaga = {
      id: "evt_org_1",
      type: "invoice.paid",
      created: anualPago.created,
      data: {
        object: {
          id: "in_org_1",
          customer: "cus_org",
          currency: "brl",
          amount_paid: 90000,
          status_transitions: { paid_at: anualPago.created },
          lines: { data: [{ quantity: 5, period: { start: 1, end: 1 } }] },
          metadata: { organizacao_id: "org-1", assentos: "5" },
          parent: null,
        },
      },
    };
    beforeEach(() => {
      rpcEmpresa.mockReset();
      rpcEmpresa.mockResolvedValue({ data: "nao_empresa", error: null });
    });

    it("fatura paga: ativa a organização (sem passar pela função do aluno) e emite a nota", async () => {
      nfse.configurada.mockReturnValue(true);
      nfse.emitir.mockClear();
      rpcEmpresa.mockResolvedValue({ data: "aplicado", error: null });
      const r = await POST(assinado(faturaPaga));
      expect(r.status).toBe(200);
      expect(rpcEmpresa).toHaveBeenCalledWith(
        expect.objectContaining({ p_evento_id: "evt_org_1", p_acao: "liberar", p_organizacao: "org-1", p_cliente: "cus_org", p_fatura: "in_org_1", p_pago_em: new Date(anualPago.created * 1000).toISOString() }),
      );
      expect(rpc).not.toHaveBeenCalled();
      expect(nfse.emitir).toHaveBeenCalledTimes(1);
      // Organização desconhecida: sem nota.
      rpcEmpresa.mockResolvedValue({ data: "desconhecido", error: null });
      await POST(assinado({ ...faturaPaga, id: "evt_org_2" }));
      expect(nfse.emitir).toHaveBeenCalledTimes(1);
      nfse.configurada.mockReturnValue(false);
    });

    it("reembolso da fatura da empresa: cancela a organização e a nota, sem mexer em assinatura de aluno", async () => {
      nfse.configurada.mockReturnValue(true);
      nfse.cancelar.mockClear();
      rpcEmpresa.mockResolvedValue({ data: "aplicado", error: null });
      const reembolso = { id: "evt_org_3", type: "charge.refunded", created: anualPago.created, data: { object: { id: "ch_org", refunded: true, customer: "cus_org", payment_intent: "pi_org" } } };
      expect((await POST(assinado(reembolso))).status).toBe(200);
      expect(rpcEmpresa).toHaveBeenCalledWith(expect.objectContaining({ p_acao: "cancelar", p_cliente: "cus_org" }));
      expect(rpc).not.toHaveBeenCalled();
      expect(cancelar).not.toHaveBeenCalled();
      expect(nfse.cancelar).toHaveBeenCalledWith("pi_org", expect.anything());
      nfse.configurada.mockReturnValue(false);
    });

    it("reembolso de aluno: a função da empresa responde nao_empresa e o fluxo do aluno segue igual", async () => {
      rpc.mockResolvedValue({ data: "aplicado", error: null });
      await POST(assinado({ id: "evt_org_4", type: "charge.refunded", created: anualPago.created, data: { object: { customer: "cus_1", refunded: true } } }));
      expect(rpcEmpresa).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith("registrar_pagamento", expect.objectContaining({ p_acao: "revogar", p_cliente: "cus_1" }));
      expect(cancelar).toHaveBeenCalledWith("sub_1");
    });

    it("erro no banco na função da empresa: 500 (o Stripe reenvia)", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      rpcEmpresa.mockResolvedValue({ data: null, error: { message: "caiu" } });
      expect((await POST(assinado(faturaPaga))).status).toBe(500);
      expect((await POST(assinado({ id: "evt_org_5", type: "charge.refunded", created: anualPago.created, data: { object: { customer: "cus_org", refunded: true } } }))).status).toBe(500);
      expect(rpc).not.toHaveBeenCalled();
    });
  });
});
