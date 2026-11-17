/**
 * Gráfico: do intervalo para categorias e séries, como o Excel interpreta.
 * Função pura; a `Planilha` fornece valores e textos.
 *
 * - A primeira coluna são as categorias (Jan, Fev…) e a primeira linha, os
 *   nomes das séries (2025, 2026…).
 * - Exceção do Excel (e pegadinha clássica): se a primeira coluna é só de
 *   números e tem cabeçalho (ex.: "Ano" com 2022, 2023…), ela vira mais uma
 *   série, e as categorias passam a ser 1, 2, 3… Apagar o cabeçalho resolve.
 * - `alternar` troca linhas e colunas.
 */
import type { Formato, Grafico } from "@/content/schema";
import { deIntervalo, type Pos } from "./address";
import type { ValorCelula } from "./format";

export type SerieGrafico = { nome: string; valores: (number | null)[] };
export type DadosGrafico = {
  categorias: string[];
  series: SerieGrafico[];
  /** Formato dos números (o da primeira célula numérica), para rótulos e eixo. */
  formato?: Formato;
  erro?: string;
};

export type LeitorGrafico = {
  valor: (p: Pos) => ValorCelula;
  texto: (p: Pos) => string;
  formato: (p: Pos) => Formato | undefined;
};

export function dadosDoGrafico(g: Pick<Grafico, "dados" | "alternar">, ler: LeitorGrafico): DadosGrafico {
  let int;
  try {
    int = deIntervalo(g.dados);
  } catch {
    return { categorias: [], series: [], erro: "Intervalo de dados inválido." };
  }
  const { inicio, fim } = int;
  const P = (linha: number, coluna: number) => ({ linha, coluna });
  const linhas = Array.from({ length: fim.linha - inicio.linha + 1 }, (_, i) => inicio.linha + i);
  const colunas = Array.from({ length: fim.coluna - inicio.coluna + 1 }, (_, i) => inicio.coluna + i);

  // Cabeçalho: alguma célula de texto na primeira linha (o canto "Mês" conta; anos digitados como número, não).
  const temCabecalho = linhas.length > 1 && colunas.some((c) => typeof ler.valor(P(inicio.linha, c)) === "string");
  const corpo = temCabecalho ? linhas.slice(1) : linhas;
  const primeiraNumerica = corpo.length > 0 && corpo.every((l) => typeof ler.valor(P(l, inicio.coluna)) === "number");
  const cantoVazio = ler.texto(P(inicio.linha, inicio.coluna)) === "";
  const colunaDeRotulos = colunas.length > 1 && (!primeiraNumerica || (temCabecalho && cantoVazio));
  const colunasDeDados = colunaDeRotulos ? colunas.slice(1) : colunas;

  let categorias = corpo.map((l, i) => (colunaDeRotulos ? ler.texto(P(l, inicio.coluna)) : String(i + 1)));
  let series: SerieGrafico[] = colunasDeDados.map((c, k) => ({
    nome: temCabecalho ? ler.texto(P(inicio.linha, c)) || `Série${k + 1}` : `Série${k + 1}`,
    valores: corpo.map((l) => {
      const v = ler.valor(P(l, c));
      return typeof v === "number" ? v : null;
    }),
  }));

  if (g.alternar) {
    const novas: SerieGrafico[] = categorias.map((nome, i) => ({ nome, valores: series.map((s) => s.valores[i]) }));
    categorias = series.map((s) => s.nome);
    series = novas;
  }

  let formato: Formato | undefined;
  for (const c of colunasDeDados)
    for (const l of corpo)
      if (formato === undefined && typeof ler.valor(P(l, c)) === "number") formato = ler.formato(P(l, c)) ?? "geral";
  const algum = series.some((s) => s.valores.some((v) => v !== null));
  return {
    categorias,
    series,
    formato: formato === "geral" ? undefined : formato,
    erro: algum ? undefined : "Não há números no intervalo para desenhar o gráfico.",
  };
}

/** Teto "redondo" do eixo e o passo das linhas de grade (1, 2 ou 5 × 10^n). */
export function eixo(max: number, divisoes = 5): { topo: number; passo: number } {
  if (max <= 0) return { topo: 1, passo: 0.2 };
  const bruto = max / divisoes;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((x) => x >= bruto)!;
  return { topo: Math.ceil(max / passo) * passo, passo };
}
