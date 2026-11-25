/** O guia de funções (/funcoes): uma entrada por função do catálogo, e todo exemplo confere no motor. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOGO } from "@/engine/catalogo";
import { NOMES_PT } from "@/engine/nomes-dados";
import { exercicioPorSlug } from "./index";
import { celulasDoResultado, FUNCOES, FUNCOES_DO_CATALOGO, funcaoPorSlug, planilhaDoExemplo, praticasDaFuncao } from "./funcoes";
import { temPaginaDeExercicio } from "@/lib/acesso-conteudo";

const slugDe = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

describe("guia de funções", () => {
  it("toda função do catálogo tem entrada, na ordem do catálogo, sem sobrar nenhuma", () => {
    expect(FUNCOES_DO_CATALOGO.map((f) => f.nome)).toEqual(CATALOGO.map((c) => c.nome));
  });

  it("slugs únicos, derivados do nome (PROCV → procv, CONT.SE → cont-se)", () => {
    expect(new Set(FUNCOES.map((f) => f.slug)).size).toBe(FUNCOES.length);
    for (const f of FUNCOES) expect(f.slug, f.nome).toBe(slugDe(f.nome));
    expect(funcaoPorSlug("procv")?.nome).toBe("PROCV");
    expect(funcaoPorSlug("cont-se")?.nome).toBe("CONT.SE");
    expect(funcaoPorSlug("somases")?.nome).toBe("SOMASES");
  });

  it("o nome em inglês é o que o Excel usa", () => {
    for (const f of FUNCOES) expect(NOMES_PT[f.ingles], f.nome).toBe(f.nome);
  });

  it("um argumento explicado para cada argumento da assinatura", () => {
    for (const f of FUNCOES) {
      const c = CATALOGO.find((x) => x.nome === f.nome)!;
      const nomes = c.args.filter((a) => a !== "...").map((a) => a.replace(/[[\]]/g, ""));
      expect(f.argumentos.map((a) => a.nome), f.nome).toEqual(nomes);
    }
  });

  it("as relacionadas existem e não apontam para a própria função", () => {
    for (const f of FUNCOES)
      for (const r of f.relacionadas) {
        expect(funcaoPorSlug(r), `${f.nome} → ${r}`).toBeDefined();
        expect(r).not.toBe(f.slug);
      }
  });

  it("o exemplo usa a própria função", () => {
    for (const f of FUNCOES) expect(f.exemplo.formula.toUpperCase(), f.nome).toContain(`${f.nome}(`);
  });

  it("Pratique leva a páginas que existem, com a lição grátis primeiro", () => {
    const comPratica = FUNCOES.filter((f) => praticasDaFuncao(f).length > 0);
    // A maior parte das funções aparece em alguma solução da trilha.
    expect(comPratica.length).toBeGreaterThan(FUNCOES.length * 0.7);
    for (const f of comPratica) {
      const lista = praticasDaFuncao(f);
      for (const p of lista) {
        const e = exercicioPorSlug(p.slug);
        expect(e && temPaginaDeExercicio(e), `${f.nome} → ${p.slug}`).toBeTruthy();
        expect(e?.etapa ?? 1, "leva à questão principal da lição").toBe(1);
      }
      const gratis = lista.map((p) => p.gratis);
      expect(gratis, f.nome).toEqual([...gratis].sort((a, b) => Number(b) - Number(a)));
    }
    expect(praticasDaFuncao(funcaoPorSlug("procv")!)[0].gratis).toBe(true);
  });
});

describe.each(FUNCOES_DO_CATALOGO.map((f) => [f.nome, f] as const))("%s", (_, f) => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it(`o motor confirma ${f.exemplo.formula}`, () => {
    const ex = f.exemplo;
    if (ex.hoje) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(ex.hoje));
    }
    const p = planilhaDoExemplo(ex);
    for (const [end, esperado] of celulasDoResultado(ex)) expect(p.exibicao(end).replace(/\u00a0/g, " "), end).toBe(esperado);
    // Nada derrama além do que o exemplo mostra.
    if (typeof ex.resultado !== "string") {
      const ultima = ex.resultado.length;
      const abaixo = ex.celula.replace(/\d+$/, (n) => String(Number(n) + ultima));
      expect(p.exibicao(abaixo), abaixo).toBe("");
    }
  });
});
