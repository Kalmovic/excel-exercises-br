import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/cache", () => ({ refresh }));
const estado = { logado: true, resposta: { data: "removido" as unknown, error: null as { message: string } | null } };
const rpc = vi.fn(async () => estado.resposta);
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioAtual: async () => (estado.logado ? { id: "gestor", email: "gestora@empresa.com.br" } : null),
  supabaseServidor: async () => ({ rpc }),
}));

const { removerMembro } = await import("./acoes");
const MEMBRO = "8b1f4f9e-6c55-4d4f-9a3e-2f0d7c1b2a10";

describe("painel do gestor: remover membro", () => {
  beforeEach(() => {
    estado.logado = true;
    estado.resposta = { data: "removido", error: null };
    rpc.mockClear();
    refresh.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("gestor remove: chama remover_membro e atualiza a página", async () => {
    expect(await removerMembro(MEMBRO)).toBe("removido");
    expect(rpc).toHaveBeenCalledWith("remover_membro", { p_usuario: MEMBRO });
    expect(refresh).toHaveBeenCalled();
  });

  it("quem não é gestor: o banco recusa e nada muda na página", async () => {
    estado.resposta = { data: "nao_gestor", error: null };
    expect(await removerMembro(MEMBRO)).toBe("nao_gestor");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sem login, id malformado ou erro no banco", async () => {
    expect(await removerMembro("1 or 1=1")).toBe("nao_membro");
    estado.logado = false;
    expect(await removerMembro(MEMBRO)).toBe("nao_gestor");
    expect(rpc).not.toHaveBeenCalled();
    estado.logado = true;
    estado.resposta = { data: null, error: { message: "caiu" } };
    expect(await removerMembro(MEMBRO)).toBe("erro");
  });
});
