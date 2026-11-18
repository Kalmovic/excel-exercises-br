/**
 * Regressão do teste diferencial (docs/revisao/diferencial): as fórmulas do
 * conjunto, com o valor do Excel. O arquivo de casos é gerado a partir de
 * `results.json` (ver docs/revisao/planos/F2.md):
 * - casos que já passavam: o valor de referência (Excel, ou LibreOffice quando
 *   o Excel dá o mesmo);
 * - `bug`: os bugs confirmados do relatório, com o valor do Excel;
 * - `soLibreOffice`: o LibreOffice diverge do Excel e o nosso valor é o do Excel.
 * Os 12 casos ambíguos do relatório ficam de fora (precisam de um Excel real).
 */
import { describe, expect, it } from "vitest";
import { Planilha, type Grade } from "@/engine/engine";
import corpus from "./diferencial.casos.json";

type Valor = number | string | boolean | null | { erro: string } | Valor[][];
type Caso = { id: number; f: string; esperado: Valor; bug?: string; soLibreOffice?: boolean };

const ehErro = (x: unknown): x is { erro: string } => typeof x === "object" && x !== null && !Array.isArray(x) && "erro" in x;

/** O mesmo critério do comparador do teste diferencial (números com tolerância relativa de 1e-9). */
function igual(a: Valor, b: Valor): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const A = Array.isArray(a) ? a : [[a]];
    const B = Array.isArray(b) ? b : [[b]];
    return A.length === B.length && A.every((l, i) => l.length === B[i].length && l.every((x, j) => igual(x, B[i][j])));
  }
  if (ehErro(a) || ehErro(b)) return ehErro(a) && ehErro(b) && a.erro === b.erro;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  return a === b;
}

const celulas = Object.fromEntries(Object.entries(corpus.dados as Record<string, string>).map(([k, v]) => [k, { entrada: v }]));
const COLS = "QRSTUVWXYZ";

/** Grava a fórmula em Q20 e lê o bloco Q20:Z31 (para pegar o que derrama). */
function calcular(f: string): Valor {
  const p = new Planilha({ linhas: 60, colunas: 30, celulas } as Grade);
  const r = p.definir("Q20", f);
  if (!r.ok) return { erro: `recusada: ${r.mensagem}` };
  const bloco: Valor[][] = [];
  let maxL = 0, maxC = 0;
  for (let i = 0; i < 12; i++) {
    const linha: Valor[] = [];
    for (let j = 0; j < COLS.length; j++) {
      const v = p.valor(`${COLS[j]}${20 + i}`);
      linha.push(v);
      if (v !== null) { maxL = Math.max(maxL, i); maxC = Math.max(maxC, j); }
    }
    bloco.push(linha);
  }
  const arr = bloco.slice(0, maxL + 1).map((l) => l.slice(0, maxC + 1));
  return arr.length === 1 && arr[0].length === 1 ? arr[0][0] : arr;
}

const casos = corpus.casos as Caso[];

describe("teste diferencial contra o Excel", () => {
  it.each(casos.map((c) => [`${c.id} ${c.f}${c.bug ? ` (${c.bug})` : ""}`, c] as const))("%s", (_nome, c) => {
    const v = calcular(c.f);
    expect(igual(v, c.esperado), `${c.f}: ${JSON.stringify(v)} ≠ ${JSON.stringify(c.esperado)}`).toBe(true);
  });
});
