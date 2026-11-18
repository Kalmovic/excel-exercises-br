import { beforeEach, describe, expect, it } from "vitest";
import { preencherSolucao } from "@/components/admin/solucao";
import { criarStore } from "@/components/simulador/store";
import { MODULOS, testeDoModulo } from "@/content";
import { deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { zerarLimites } from "@/lib/limite";
import { POST } from "./route";

/** A resposta certa de uma questão, como o navegador mandaria. */
function certa(modulo: string, indice: number) {
  const q = testeDoModulo(modulo)[indice];
  const p = Planilha.deExercicio(q);
  const inicio = q.inicio?.selecao ?? q.inicio?.celulaAtiva;
  const store = criarStore(p, inicio ? deIntervalo(inicio) : undefined);
  preencherSolucao(q, p, store);
  return {
    conteudos: Object.fromEntries(Object.entries(p.conteudos()).filter(([e]) => !p.bloqueada(e))),
    formatos: p.formatosDoAluno(),
    recursos: p.recursos(),
    resposta: store.getState().resposta,
    ativa: paraEndereco(store.getState().ancora),
    selecao: intervaloParaTexto(store.getState().selecao()),
  };
}

let ip = 0;
const pedir = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  POST(
    new Request("http://x/api/teste/corrigir", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${ip}`, ...cabecalhos },
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    }),
  );

describe("corrigir uma questão do teste no servidor", () => {
  beforeEach(() => {
    zerarLimites();
    ip++;
  });

  it("resposta certa: ok; vazia: não", async () => {
    const r = await pedir({ modulo: "busca", indice: 0, resposta: certa("busca", 0) });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(await (await pedir({ modulo: "busca", indice: 0, resposta: { conteudos: {} } })).json()).toEqual({ ok: false });
  });

  it("todas as questões de todos os módulos: a solução passa", async () => {
    for (const m of MODULOS)
      for (let i = 0; i < testeDoModulo(m.slug).length; i++) {
        zerarLimites();
        const r = await (await pedir({ modulo: m.slug, indice: i, resposta: certa(m.slug, i) })).json();
        expect(r, `${m.slug} #${i}`).toEqual({ ok: true });
      }
  });

  it("corpo inválido: 400; módulo ou questão que não existe: 404", async () => {
    expect((await pedir("não é json")).status).toBe(400);
    expect((await pedir(null)).status).toBe(400);
    expect((await pedir({ modulo: "busca", indice: 0 })).status).toBe(400);
    expect((await pedir({ modulo: "busca", indice: -1, resposta: { conteudos: {} } })).status).toBe(400);
    expect((await pedir({ modulo: "Busca!", indice: 0, resposta: { conteudos: {} } })).status).toBe(400);
    expect((await pedir({ modulo: "nada", indice: 0, resposta: { conteudos: {} } })).status).toBe(404);
    expect((await pedir({ modulo: "busca", indice: 15, resposta: { conteudos: {} } })).status).toBe(404);
  });

  it("corpo grande demais: 413", async () => {
    const enorme = { modulo: "busca", indice: 0, resposta: { conteudos: { A1: "x".repeat(300_000) } } };
    expect((await pedir(enorme)).status).toBe(413);
    expect((await pedir({ modulo: "busca", indice: 0, resposta: { conteudos: {} } }, { "content-length": "999999999" })).status).toBe(413);
  });

  it("muitos pedidos seguidos do mesmo IP: 429 em português", async () => {
    const corpo = { modulo: "busca", indice: 0, resposta: { conteudos: {} } };
    for (let i = 0; i < 30; i++) expect((await pedir(corpo)).status).toBe(200);
    const r = await pedir(corpo);
    expect(r.status).toBe(429);
    expect((await r.json()).erro).toMatch(/Muitos pedidos/);
  });
});
