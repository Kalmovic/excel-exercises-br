/**
 * Múltipla escolha das lições: quem erra lê por que aquela alternativa está
 * errada (sem entregar a certa), e a dica da questão aponta o conceito.
 * O teste do módulo fica de fora: é sem dica.
 */
import { describe, expect, it } from "vitest";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { exercicios } from "./index";
import type { ExercicioDoTipo } from "./schema";

const licoes = exercicios.filter(
  (e): e is ExercicioDoTipo<"multiple_choice"> => e.type === "multiple_choice" && !e.teste,
);

describe("múltipla escolha das lições", () => {
  it.each(licoes.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
    ex.opcoes.forEach((o, i) => {
      if (i !== ex.correta) expect(o.dica, `alternativa ${i} ("${o.texto}") sem dica`).toBeTruthy();
    });
    for (const d of ex.dicas) expect(d).not.toMatch(/^Releia a pergunta com calma/);
  });
});

/** Etapas 5 no estilo de concurso: banca, tema e o que a questão afirma conferido no motor. */
const deConcurso = licoes.filter((e) => e.banca);

describe.each(deConcurso.map((q) => [q.slug, q] as const))("questão de concurso na lição: %s", (_, q) => {
  it("tem banca, tema e título de concurso; Cebraspe é Certo/Errado", () => {
    expect(q.tema).toBeTruthy();
    expect(q.titulo).toMatch(/^Concurso: /);
    if (q.banca === "Cebraspe") expect(q.opcoes.map((o) => o.texto)).toEqual(["Certo", "Errado"]);
    else expect(q.opcoes).toHaveLength(5);
  });

  it("a alternativa correta passa e as outras não", () => {
    q.opcoes.forEach((_, i) => {
      const r = corrigir(q, Planilha.deExercicio(q), { ativa: "A1", selecao: "A1", resposta: String(i), mudancasPeloMouse: 0 });
      expect(r.ok, `alternativa ${i}`).toBe(i === q.correta);
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
