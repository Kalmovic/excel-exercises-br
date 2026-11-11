// Temporário (branch spike/motor): exporta o corpus de fórmulas para comparar motores.
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { exercicios } from "@/content";
import { desafios } from "@/content/desafios";
import { CASOS } from "@/engine/matriz.test";
import { Planilha } from "@/engine/engine";
import { dataIsoParaSerial } from "@/engine/format";
import type { Exercicio } from "@/content/schema";

const norm = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(norm) : v && typeof v === "object" && "data" in (v as object) ? dataIsoParaSerial((v as { data: string }).data) : v;

it("exporta", () => {
  const itens: unknown[] = [];
  const todos: Exercicio[] = [...exercicios, ...desafios.map((d) => d.exercicio)];
  for (const ex of todos) {
    if (ex.type !== "formula") continue;
    const celulas = Object.fromEntries(Object.entries(ex.grade.celulas).map(([k, c]) => [k, c.entrada]));
    // referência do HyperFormula (para separar "o motor errou" de "o gabarito depende do dia")
    const p = Planilha.deExercicio(ex);
    p.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
    itens.push({
      id: ex.slug,
      linhas: ex.grade.linhas,
      colunas: ex.grade.colunas,
      celulas,
      formulas: Object.fromEntries(ex.alvos.map((a) => [a.celula, a.solucaoReferencia])),
      esperados: ex.alvos.map((a) => ({ celula: a.celula, esperado: norm(a.esperadoDaReferencia ? p.valor(a.celula) : a.esperado), tol: a.tolerancia ?? 1e-9 })),
    });
    p.destruir();
  }
  const fixture = {
    A1: "Nome", B1: "Valor", C1: "Data", D1: "Texto", E1: "Faixa", F1: "Taxa",
    A2: "Ana", B2: "10", C2: "15/01/2026", D2: "  joão   da silva ", E2: "0", F2: "1%",
    A3: "Bia", B3: "25,5", C3: "10/03/2026", D3: "SP-001-X", E3: "1000", F3: "3%",
    A4: "Ana", B4: "30", C4: "28/02/2026", D4: "R$ 1.234,50", E4: "5000", F4: "5%",
    A5: "Caio", B5: "15", C5: "05/11/2026", A6: "Duda", B6: "40", C6: "31/12/2025",
  };
  CASOS.filter((c) => !c.divergente).forEach((c, i) => {
    itens.push({
      id: `matriz-${i}-${c.funcao}`, linhas: 30, colunas: 10, celulas: fixture, formulas: { J20: c.formula },
      esperados: [{ celula: "J20", esperado: Array.isArray(c.esperado) ? c.esperado.map((x) => [x]) : c.esperado, tol: c.tolerancia ?? 1e-6 }],
    });
  });
  writeFileSync("spike/corpus.json", JSON.stringify(itens));
  console.log("itens", itens.length);
});
