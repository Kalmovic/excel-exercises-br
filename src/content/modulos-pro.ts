import { funcoesUsadas } from "@/engine/formula";
import { ptBR } from "@/engine/ptBR";
import type { Exercicio } from "./schema";

/**
 * Módulos planejados da trilha, do mais básico ao mais avançado, com as
 * funções (ids canônicos) que cada um ensina. Usado no upsell do desafio.
 */
export const MODULOS_PLANEJADOS = [
  { slug: "fundamentos", titulo: "Fundamentos", funcoes: ["SUM", "AVERAGE", "MIN", "MAX", "ROUND"] },
  { slug: "logica", titulo: "Lógica", funcoes: ["IF", "IFS", "AND", "OR", "NOT", "IFERROR"] },
  {
    slug: "condicionais",
    titulo: "Contar e somar com condição",
    funcoes: ["COUNTA", "COUNTIF", "COUNTIFS", "SUMIF", "SUMIFS", "AVERAGEIF", "AVERAGEIFS", "MAXIFS", "MINIFS", "SUMPRODUCT"],
  },
  { slug: "busca", titulo: "Busca", funcoes: ["VLOOKUP", "HLOOKUP", "INDEX", "MATCH", "XLOOKUP"] },
  {
    slug: "texto",
    titulo: "Texto",
    funcoes: ["CONCAT", "CONCATENATE", "LEFT", "RIGHT", "MID", "TRIM", "PROPER", "SEARCH", "SUBSTITUTE", "TEXTJOIN", "LOWER", "UPPER", "LEN"],
  },
  { slug: "datas", titulo: "Datas", funcoes: ["TODAY", "DATE", "YEAR", "MONTH", "DAY", "DATEDIF", "NETWORKDAYS", "EOMONTH", "WEEKDAY"] },
  { slug: "arrays", titulo: "Arrays dinâmicos", funcoes: ["FILTER", "SORT", "UNIQUE", "SEQUENCE"] },
  { slug: "casos", titulo: "Casos reais", funcoes: ["PMT", "LARGE", "SMALL"] },
] as const;

export type Upsell = {
  /** Funções usadas na solução, em pt-BR, na ordem em que aparecem. */
  usadas: string[];
  modulo: { titulo: string; funcoes: string[] };
};

const pt = (canonico: string) => (ptBR.functions as Record<string, string>)[canonico] ?? canonico;

/**
 * O gancho do fim do desafio: as funções que ele usou e o módulo Pro mais
 * avançado entre elas (quem resolveu FILTRO não precisa ouvir falar de SOMA).
 */
export function upsellDoExercicio(ex: Exercicio): Upsell | null {
  if (ex.type !== "formula") return null;
  const usadas = [
    ...new Set(ex.alvos.flatMap((a) => funcoesUsadas(a.solucaoReferencia)).filter((f) => f !== "TRUE" && f !== "FALSE")),
  ];
  let melhor = -1;
  for (const f of usadas) {
    const i = MODULOS_PLANEJADOS.findIndex((m) => (m.funcoes as readonly string[]).includes(f));
    if (i > melhor) melhor = i;
  }
  if (melhor === -1) return null;
  const m = MODULOS_PLANEJADOS[melhor];
  return { usadas: usadas.map(pt), modulo: { titulo: m.titulo, funcoes: m.funcoes.slice(0, 4).map(pt) } };
}
