import { describe, expect, it } from "vitest";
import { QUESTOES_CONCURSO } from "@/content/concurso";
import type { Exercicio } from "@/content/schema";
import { planilhaSoConsulta } from "./so-consulta";

const mc = (enunciado: string[], opcoes: string[]) =>
  ({ type: "multiple_choice", comPlanilha: true, enunciado, opcoes: opcoes.map((texto) => ({ texto })) }) as unknown as Exercicio;

describe("planilha só para consulta", () => {
  it("fórmula no enunciado (em código ou solta) ou nas alternativas: só consulta", () => {
    expect(planilhaSoConsulta(mc(["O valor de `=CONT.VALORES(ÚNICO(A2:A7))` é:"], ["3", "4"]))).toBe(true);
    expect(planilhaSoConsulta(mc(["Ao digitar =SOMA(A1:A3) em C1, o resultado é:"], ["6", "7"]))).toBe(true);
    expect(planilhaSoConsulta(mc(["Qual fórmula devolve o total?"], ["=SOMA(B2:B5)", "=CONT(B2:B5)"]))).toBe(true);
  });

  it("sem fórmula escrita: a planilha continua aceitando digitação", () => {
    expect(planilhaSoConsulta(mc(["Quantos clientes estão em atraso?"], ["3", "4"]))).toBe(false);
    expect(planilhaSoConsulta(mc(["A meta é = 10% do total. Quanto falta?"], ["R$ 5", "R$ 6"]))).toBe(false);
  });

  it("todas as questões de concurso que mostram a fórmula ficam só para consulta", () => {
    for (const q of QUESTOES_CONCURSO.filter((q) => q.comPlanilha))
      for (const c of q.conferir ?? []) {
        const mostra = [...q.enunciado, ...q.opcoes.map((o) => o.texto)].some((t) => t.replace(/\s/g, "").includes(c.formula.replace(/\s/g, "")));
        if (mostra) expect(planilhaSoConsulta(q), q.slug).toBe(true);
      }
  });
});
