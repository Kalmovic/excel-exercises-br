/** As questões de concurso são conferidas no motor: o que a questão afirma, o motor calcula igual. */
import { describe, expect, it } from "vitest";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { BANCAS, QUESTOES_CONCURSO } from "./concurso";
import questoesBrutas from "./concurso/questoes.json";

describe("questões de concurso", () => {
  it("todas carregadas, com banca e tema, slugs únicos", () => {
    expect(QUESTOES_CONCURSO).toHaveLength(questoesBrutas.length);
    expect(new Set(QUESTOES_CONCURSO.map((q) => q.slug)).size).toBe(QUESTOES_CONCURSO.length);
    expect(BANCAS.length).toBeGreaterThanOrEqual(5);
  });
});

describe.each(QUESTOES_CONCURSO.map((q) => [q.slug, q] as const))("%s", (_, q) => {
  it("a alternativa correta passa e as outras não", () => {
    q.opcoes.forEach((_, i) => {
      const r = corrigir(q, Planilha.deExercicio(q), { ativa: "A1", selecao: "A1", resposta: String(i), mudancasPeloMouse: 0 });
      expect(r.ok, `alternativa ${i}`).toBe(i === q.correta);
    });
  });

  it("toda alternativa errada explica o porquê", () => {
    q.opcoes.forEach((o, i) => {
      if (i !== q.correta) expect(o.dica, `alternativa ${i}`).toBeTruthy();
    });
  });

  for (const c of q.conferir ?? [])
    it(`o motor confirma ${c.formula}`, () => {
      const p = Planilha.deExercicio(q);
      const livre = { linha: q.grade.linhas - 1, coluna: q.grade.colunas - 1 }; // célula vazia no canto
      expect(p.definir(livre, c.formula)).toEqual({ ok: true });
      const v = p.valor(livre);
      if (typeof c.esperado === "number") expect(v).toBeCloseTo(c.esperado, 9);
      else if (typeof c.esperado === "string" && c.esperado.startsWith("#")) expect(p.exibicao?.(livre) ?? String(v)).toContain(c.esperado);
      else expect(v).toBe(c.esperado);
    });
});
