import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = {
  logado: true,
  rpc: { data: true as unknown, error: null as { message: string } | null },
  assinatura: null as { acesso_ate: string } | null,
};
const rpc = vi.fn(async () => estado.rpc);
vi.mock("./supabase/servidor", () => ({
  supabaseServidor: async () => ({
    auth: { getClaims: async () => ({ data: estado.logado ? { claims: { sub: "u1" } } : null }) },
    rpc,
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: estado.assinatura }) }) }),
  }),
}));

const { usuarioEhPro } = await import("./acesso");

describe("usuarioEhPro: a regra única do Pro", () => {
  beforeEach(() => {
    estado.logado = true;
    estado.rpc = { data: true, error: null };
    estado.assinatura = null;
    rpc.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("pergunta ao banco (tem_acesso_pro): assinatura própria ou membro de empresa ativa", async () => {
    expect(await usuarioEhPro()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("tem_acesso_pro");
    estado.rpc = { data: false, error: null };
    expect(await usuarioEhPro()).toBe(false);
  });

  it("sem login: não é Pro e nem pergunta", async () => {
    estado.logado = false;
    expect(await usuarioEhPro()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("função indisponível: cai na assinatura própria (quem pagou não perde o acesso)", async () => {
    estado.rpc = { data: null, error: { message: "function not found" } };
    estado.assinatura = { acesso_ate: new Date(Date.now() + 86400000).toISOString() };
    expect(await usuarioEhPro()).toBe(true);
    estado.assinatura = { acesso_ate: new Date(Date.now() - 86400000).toISOString() };
    expect(await usuarioEhPro()).toBe(false);
  });
});
