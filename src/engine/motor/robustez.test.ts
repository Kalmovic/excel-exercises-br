/**
 * Robustez do motor com fórmulas erradas de aluno: a partir das soluções de
 * referência, gera variações com os erros mais comuns e confere que o motor
 * nunca quebra e sempre devolve um valor de planilha (número finito, texto,
 * lógico, vazio ou erro do Excel).
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "@/content";
import { desafios } from "@/content/desafios";
import { Planilha } from "../engine";

const MUTACOES: [string, (f: string) => string][] = [
  ["sem $", (f) => f.replace(/\$/g, "")],
  ["intervalo menor", (f) => f.replace(/([A-Z])(\d+):([A-Z])(\d+)/, (_, a, b, c, d) => `${a}${b}:${c}${Math.max(Number(b), Number(d) - 1)}`)],
  ["> no lugar de >=", (f) => f.replace(">=", ">")],
  ["função trocada", (f) => f.replace("SOMA(", "MÉDIA(").replace("PROCV(", "PROCH(").replace("CONT.SE(", "SOMASE(")],
  ["sem último argumento", (f) => f.replace(/;[^;()]*\)$/, ")")],
  ["argumento vazio", (f) => f.replace(";", ";;")],
  ["texto no lugar de número", (f) => f.replace(/\b\d+(,\d+)?\b/, '"abc"')],
  ["referência fora", (f) => f.replace(/([A-Z])(\d+)/, "Z99")],
  ["divisão por zero", (f) => `${f}/0`],
  ["concatena número", (f) => `${f}&1,5`],
];

const validos = (v: unknown) =>
  v === null ||
  typeof v === "string" ||
  typeof v === "boolean" ||
  (typeof v === "number" && Number.isFinite(v)) ||
  (typeof v === "object" && v !== null && typeof (v as { erro: unknown }).erro === "string");

describe("motor com fórmulas erradas", () => {
  const todos = [...exercicios, ...desafios.map((d) => d.exercicio)].filter((e) => e.type === "formula");
  it(`${todos.length} exercícios × ${MUTACOES.length} mutações: nunca quebra`, () => {
    let casos = 0;
    for (const ex of todos) {
      if (ex.type !== "formula") continue;
      for (const [, mudar] of MUTACOES) {
        const p = Planilha.deExercicio(ex);
        for (const a of ex.alvos) {
          const f = mudar(a.solucaoReferencia);
          expect(() => p.definir(a.celula, f), `${ex.slug} ${f}`).not.toThrow();
        }
        for (let l = 0; l < p.linhas; l++)
          for (let c = 0; c < p.colunas; c++) {
            const v = p.valor({ linha: l, coluna: c });
            expect(validos(v), `${ex.slug} ${l},${c} ${JSON.stringify(v)}`).toBe(true);
            expect(() => p.exibicao({ linha: l, coluna: c })).not.toThrow();
          }
        casos++;
      }
    }
    expect(casos).toBeGreaterThan(3000);
  }, 120_000);
});
