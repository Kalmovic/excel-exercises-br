import { beforeEach, describe, expect, it, vi } from "vitest";
import { preencherSolucao } from "@/components/admin/solucao";
import { criarStore } from "@/components/simulador/store";
import { testeDoModulo } from "@/content";
import { deIntervalo, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { zerarLimites } from "@/lib/limite";

// Banco simulado: guarda o que a rota grava.
const banco = { certificados: [] as Record<string, unknown>[], perfis: [] as Record<string, unknown>[] };
let usuario: { id: string } | null = { id: "u1" };
/** Simula outro pedido gravando primeiro (corrida). */
let antesDoInsert: (() => void) | null = null;
vi.mock("@/lib/supabase/servidor", () => ({ usuarioAtual: async () => usuario }));
vi.mock("@/lib/acesso", () => ({ usuarioEhPro: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: (tabela: "certificados" | "perfis") => {
      const filtros: [string, unknown][] = [];
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => (filtros.push([c, v]), q),
        maybeSingle: async () => ({ data: banco[tabela].find((l) => filtros.every(([c, v]) => l[c] === v)) ?? null }),
        insert: async (linha: Record<string, unknown>) => {
          antesDoInsert?.();
          // A regra unique (usuario_id, modulo) do banco.
          if (banco[tabela].some((l) => l.usuario_id === linha.usuario_id && l.modulo === linha.modulo))
            return { error: { code: "23505", message: 'duplicate key value violates unique constraint "certificados_usuario_id_modulo_key"' } };
          banco[tabela].push(linha);
          return { error: null };
        },
        update: (mudanca: Record<string, unknown>) => ({
          eq: async (c: string, v: unknown) => {
            for (const l of banco[tabela]) if (l[c] === v) Object.assign(l, mudanca);
            return { error: null };
          },
        }),
      };
      return q;
    },
  }),
}));

/** Respostas certas do teste do módulo, como o navegador mandaria. */
const certas = (modulo: string) =>
  testeDoModulo(modulo).map((q) => {
    const p = Planilha.deExercicio(q);
    const inicio = q.inicio?.selecao ?? q.inicio?.celulaAtiva;
    const store = criarStore(p, inicio ? deIntervalo(inicio) : undefined);
    preencherSolucao(q, p, store);
    return {
      conteudos: Object.fromEntries(Object.entries(p.conteudos()).filter(([e]) => !p.bloqueada(e))),
      formatos: p.formatosDoAluno(),
      resposta: store.getState().resposta,
      ativa: paraEndereco(store.getState().ancora),
    };
  });

const pedir = (corpo: unknown) =>
  new Request("http://x/api/certificado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

describe("emitir certificado", async () => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "teste");
  const { POST } = await import("./route");
  beforeEach(() => {
    banco.certificados = [];
    banco.perfis = [{ id: "u1", nome: null }];
    usuario = { id: "u1" };
    antesDoInsert = null;
    zerarLimites();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("sem login: 401", async () => {
    usuario = null;
    expect((await POST(pedir({ modulo: "busca", nome: "Ana Souza", entregas: [] }))).status).toBe(401);
  });

  it("respostas que não passam na conferência: recusado, mesmo que o navegador diga aprovado", async () => {
    const r = await POST(pedir({ modulo: "busca", nome: "Ana Souza", entregas: [{ conteudos: {} }, { conteudos: {} }] }));
    expect(r.status).toBe(422);
    expect(banco.certificados).toHaveLength(0);
  });

  it("aprovado na conferência: emite com código no formato XXXX-XXXX e grava o nome no perfil", async () => {
    const r = await POST(pedir({ modulo: "busca", nome: "  Ana   Souza ", entregas: certas("busca") }));
    expect(r.status).toBe(200);
    const { codigo } = await r.json();
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(banco.certificados[0]).toMatchObject({ codigo, usuario_id: "u1", modulo: "busca", nome: "Ana Souza", acertos: 5, total: 5 });
    expect(banco.perfis[0].nome).toBe("Ana Souza");
  });

  it("emitir de novo devolve o mesmo, sem trocar o nome (o link verificado continua sendo da mesma pessoa)", async () => {
    const a = await (await POST(pedir({ modulo: "busca", nome: "Ana Souza", entregas: certas("busca") }))).json();
    const emitido = { ...banco.certificados[0] };
    const b = await POST(pedir({ modulo: "busca", nome: "Outra Pessoa", entregas: certas("busca") }));
    expect(b.status).toBe(200);
    expect((await b.json()).codigo).toBe(a.codigo);
    expect(banco.certificados).toEqual([emitido]);
    expect(banco.certificados[0].nome).toBe("Ana Souza");
    expect(banco.perfis[0].nome).toBe("Ana Souza");
  });

  it("dois pedidos ao mesmo tempo: o segundo recebe o certificado do primeiro, não um erro", async () => {
    antesDoInsert = () => {
      antesDoInsert = null;
      banco.certificados.push({ codigo: "GANH-XY22", usuario_id: "u1", modulo: "busca", nome: "Ana Souza" });
    };
    // Entre a consulta e o insert, o outro pedido grava primeiro.
    const r = await POST(pedir({ modulo: "busca", nome: "Ana Souza", entregas: certas("busca") }));
    expect(r.status).toBe(200);
    expect((await r.json()).codigo).toBe("GANH-XY22");
    expect(banco.certificados).toHaveLength(1);
  });

  it("muitos pedidos seguidos: 429 em português", async () => {
    let ultimo = 0;
    for (let i = 0; i < 11; i++) ultimo = (await POST(pedir({ modulo: "nada", nome: "Ana Souza", entregas: [] }))).status;
    expect(ultimo).toBe(429);
  });

  it("módulo inexistente: 404", async () => {
    expect((await POST(pedir({ modulo: "nada", nome: "Ana Souza", entregas: [] }))).status).toBe(404);
  });
});
