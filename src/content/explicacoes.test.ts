/**
 * Os números das explicações batem com a resposta. O teste de conteúdo confere
 * `esperado` × `solucaoReferencia`, mas não o que está escrito: foi aí que
 * apareceram "cerca de R$ 7.940" para um resultado de R$ 7.902,95.
 *
 * Para não dar falso positivo, só olhamos números apresentados como resultado:
 * - depois de "→", só os que vêm com R$ ou % (sem unidade, às vezes são um passo do meio);
 * - depois de "≈" ou "cerca de", qualquer número.
 * Cada um tem que bater com algum valor esperado do exercício, dentro do
 * arredondamento em que foi escrito ("7.903" aceita de 7.902,5 a 7.903,5).
 * Se a explicação precisar citar um número que não é o resultado, escreva sem
 * "→", "≈" ou "cerca de" na frente.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo, Valor } from "./schema";

const NUMERO = /(→|≈|cerca de)\s*(R\$\s*)?(-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?)(\s*%)?/g;

type Citado = { texto: string; valor: number; tolerancia: number };

/** Os números que a explicação apresenta como resultado. */
function numerosCitados(paragrafo: string): Citado[] {
  const citados: Citado[] = [];
  for (const m of paragrafo.matchAll(NUMERO)) {
    const [texto, marca, reais, numero, pct] = m;
    if (marca === "→" && !reais && !pct) continue;
    const casas = numero.split(",")[1]?.length ?? 0;
    let valor = Number(numero.replace(/\./g, "").replace(",", "."));
    let tolerancia = 0.5 * 10 ** -casas;
    if (pct) {
      valor /= 100;
      tolerancia /= 100;
    }
    citados.push({ texto, valor, tolerancia: tolerancia + 1e-9 });
  }
  return citados;
}

const numeros = (v: Valor | Valor[][]): number[] =>
  Array.isArray(v) ? v.flat().flatMap(numeros) : typeof v === "number" ? [v] : [];

const formulas = exercicios.filter((e): e is ExercicioDoTipo<"formula"> => e.type === "formula");

describe("explicações: números em R$ e % batem com o esperado", () => {
  it("reconhece os formatos", () => {
    expect(numerosCitados("`=VF(B2;B3;-B1)` → cerca de R$ 7.903.")).toEqual([
      { texto: "cerca de R$ 7.903", valor: 7903, tolerancia: 0.5 + 1e-9 },
    ]);
    expect(numerosCitados("→ 50,53%")[0].valor).toBeCloseTo(0.5053, 10);
    expect(numerosCitados("→ 1.675 é o maior")).toEqual([]);
    expect(numerosCitados("≈ 13,7 meses")[0].valor).toBe(13.7);
  });

  it.each(formulas.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
    const esperados = ex.alvos.flatMap((a) => numeros(a.esperado));
    for (const paragrafo of ex.explicacao)
      for (const c of numerosCitados(paragrafo)) {
        const bate = esperados.some((v) => Math.abs(v - c.valor) <= c.tolerancia);
        expect(bate, `"${c.texto}" não bate com ${JSON.stringify(esperados)}`).toBe(true);
      }
  });
});
