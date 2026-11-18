import type { ValorCelula } from "./format";

/**
 * Ordem do Classificar do Excel: números < textos < FALSO < VERDADEIRO < erros,
 * e as vazias sempre por último (também na ordem decrescente).
 */
export function compararParaClassificar(a: ValorCelula, b: ValorCelula, desc = false): number {
  const vazia = (v: ValorCelula) => v === null || v === "";
  if (vazia(a) || vazia(b)) return vazia(a) === vazia(b) ? 0 : vazia(a) ? 1 : -1;
  const rank = (v: ValorCelula) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3);
  let r = rank(a) - rank(b);
  if (r === 0) {
    if (typeof a === "number") r = a - (b as number);
    else if (typeof a === "string") r = a.localeCompare(b as string, "pt-BR", { sensitivity: "base", numeric: false });
    else if (typeof a === "boolean") r = Number(a) - Number(b);
  }
  return desc ? -r : r;
}
