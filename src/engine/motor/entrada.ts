import { analisar } from "./parser";
import { serial, type Conteudo } from "./nucleo";

/**
 * Lê o que foi digitado numa célula como o Excel em português:
 * "R$ 1.234,50" → moeda, "5%" → porcentagem, "15/03/2026" → data,
 * "1.234,5" → número, "=..." → fórmula. O resto é texto.
 * Lança erro (de `analisar`) se a fórmula não puder ser lida.
 */
export function lerEntrada(bruto: string): Conteudo | null {
  if (bruto.trim() === "") return null;
  const t = bruto.trim();
  if (t.startsWith("=")) return { formula: analisar(t) };
  if (t.startsWith("'")) return { valor: bruto.replace(/^\s*'/, ""), tipo: "STRING" };
  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
  const NUMERO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?`;
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^(-?)R\\$\\s*(${NUMERO})$`).exec(t))) return { valor: (m[1] ? -1 : 1) * num(m[2]), tipo: "NUMBER_CURRENCY" };
  if ((m = new RegExp(`^(-?${NUMERO})\\s*%$`).exec(t))) return { valor: num(m[1]) / 100, tipo: "NUMBER_PERCENT" };
  if (new RegExp(`^-?${NUMERO}$`).test(t)) return { valor: num(t), tipo: "NUMBER_RAW" };
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t))) {
    const d = Number(m[1]), mes = Number(m[2]);
    let a = Number(m[3]);
    if (m[3].length === 2) a += a < 30 ? 2000 : 1900;
    if (mes >= 1 && mes <= 12 && d >= 1 && d <= new Date(Date.UTC(a, mes, 0)).getUTCDate()) return { valor: serial(a, mes, d), tipo: "NUMBER_DATE" };
  }
  if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t)) && Number(m[1]) < 24 && Number(m[2]) < 60)
    return { valor: (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0)) / 86400, tipo: "NUMBER_TIME" };
  const up = t.toUpperCase();
  if (up === "VERDADEIRO" || up === "FALSO") return { valor: up === "VERDADEIRO", tipo: "BOOLEAN" };
  return { valor: bruto, tipo: "STRING" };
}

/** Fórmula como fica guardada e aparece na barra: nomes e referências em maiúsculas, textos intactos. */
export function normalizarFormula(f: string): string {
  return f.trim().replace(/("(?:[^"]|"")*")|([^"]+)/g, (_, texto, resto) => texto ?? resto.toUpperCase());
}
