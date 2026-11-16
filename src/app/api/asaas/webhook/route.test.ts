import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const cancelarAssinatura = vi.fn(async () => ({ deleted: true }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({ rpc }) }));
vi.mock("@/lib/asaas", () => ({ cancelarAssinatura }));

const TOKEN = "segredo-de-teste-com-mais-de-24-caracteres";
const aviso = (corpo: unknown, token: string | null = TOKEN) =>
  new Request("http://x/api/asaas/webhook", {
    method: "POST",
    headers: token ? { "asaas-access-token": token } : {},
    body: JSON.stringify(corpo),
  });
const pago = { id: "evt_1", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", subscription: "sub_1" } };

describe("webhook do Asaas", async () => {
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", TOKEN);
  const { POST } = await import("./route");
  beforeEach(() => {
    rpc.mockReset();
    cancelarAssinatura.mockClear();
  });

  it("sem o token certo, recusa e não toca no banco", async () => {
    expect((await POST(aviso(pago, null))).status).toBe(401);
    expect((await POST(aviso(pago, "token-errado-mas-bem-comprido-123"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("aviso válido vai inteiro para a função do banco", async () => {
    rpc.mockResolvedValue({ data: "aplicado", error: null });
    const r = await POST(aviso(pago));
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("aplicar_evento_pagamento", { evento: pago });
    expect(cancelarAssinatura).not.toHaveBeenCalled();
  });

  it("reembolso: além de cortar o acesso, cancela a renovação no Asaas", async () => {
    rpc.mockResolvedValue({ data: "reembolsado", error: null });
    await POST(aviso({ ...pago, event: "PAYMENT_REFUNDED" }));
    expect(cancelarAssinatura).toHaveBeenCalledWith("sub_1");
  });

  it("erro no banco devolve 500 (o Asaas tenta de novo)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "caiu" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(aviso(pago))).status).toBe(500);
  });

  it("corpo sem id ou tipo: 400", async () => {
    expect((await POST(aviso({ event: "PAYMENT_CONFIRMED" }))).status).toBe(400);
  });
});
