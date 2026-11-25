import { beforeEach, describe, expect, it, vi } from "vitest";

// Supabase falso agindo como o aluno logado: só a função do banco decide.
const estado = { logado: true, resposta: { data: "entrou" as unknown, error: null as { message: string } | null } };
const rpc = vi.fn(async () => estado.resposta);
vi.mock("@/lib/supabase/servidor", () => ({
  usuarioAtual: async () => (estado.logado ? { id: "u1", email: "ana@empresa.com.br" } : null),
  supabaseServidor: async () => ({ rpc }),
}));

const { entrarNaEquipe } = await import("./acoes");
const CODIGO = "0123456789abcdef0123456789abcdef";

describe("convite: entrar na equipe", () => {
  beforeEach(() => {
    estado.logado = true;
    estado.resposta = { data: "entrou", error: null };
    rpc.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logado: chama entrar_na_organizacao com o código e devolve o resultado", async () => {
    expect(await entrarNaEquipe(CODIGO)).toBe("entrou");
    expect(rpc).toHaveBeenCalledWith("entrar_na_organizacao", { p_codigo: CODIGO });
  });

  it("cada recusa do banco volta como está (lotada, vencida, já membro…)", async () => {
    for (const r of ["lotada", "vencida", "ja_membro", "outra_organizacao", "inativa", "cancelada", "invalido"]) {
      estado.resposta = { data: r, error: null };
      expect(await entrarNaEquipe(CODIGO)).toBe(r);
    }
  });

  it("sem login ou código malformado: nem chama o banco", async () => {
    expect(await entrarNaEquipe("../../admin")).toBe("invalido");
    estado.logado = false;
    expect(await entrarNaEquipe(CODIGO)).toBe("sem_login");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("erro ou resposta estranha do banco: 'erro'", async () => {
    estado.resposta = { data: null, error: { message: "caiu" } };
    expect(await entrarNaEquipe(CODIGO)).toBe("erro");
    estado.resposta = { data: "virou_admin", error: null };
    expect(await entrarNaEquipe(CODIGO)).toBe("erro");
  });
});
