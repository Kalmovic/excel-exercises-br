import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SEGREDO = "whsec_teste_segredo";
const rpc = vi.fn();
const cancelar = vi.fn(async () => ({}));
const buscarCobranca = vi.fn(async (id: string) => ({ id, customer: "cus_7" }));
const reembolsar = vi.fn(async (_p: object, _o?: object) => ({ id: "re_1" }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_assinatura_id: "sub_1" } }) }) }) }),
  }),
}));
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
});
