import { deEndereco, normalizar, type Intervalo } from "./address";

const REF = /\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/g;
const LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ_]/;

/** Cores das referências na fórmula, na ordem em que aparecem (como no Excel). */
export const CORES_REFERENCIA = ["#2563eb", "#dc2626", "#7c3aed", "#059669", "#c2410c", "#db2777", "#0891b2"] as const;

export type ReferenciaNaFormula = {
  /** Posição no texto: [inicio, fim). */
  inicio: number;
  fim: number;
  texto: string;
  intervalo: Intervalo;
  /** Índice em CORES_REFERENCIA. A mesma referência repetida mantém a cor. */
  cor: number;
};

/** Referências de célula/intervalo de uma fórmula, fora de aspas e de nomes de função. */
export function referenciasDaFormula(formula: string): ReferenciaNaFormula[] {
  if (!formula.startsWith("=")) return [];
  // posições dentro de aspas
  const aspas: boolean[] = [];
  let aberto = false;
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '"') aberto = !aberto;
    aspas[i] = aberto || formula[i] === '"';
  }
  const cores = new Map<string, number>();
  const out: ReferenciaNaFormula[] = [];
  for (const m of formula.matchAll(REF)) {
    const inicio = m.index!;
    const fim = inicio + m[0].length;
    if (aspas[inicio]) continue;
    // Faz parte de um nome maior (LOG10, CONT.SE1…) ou é uma função (ex.: "A1(")?
    if (LETRA.test(formula[inicio - 1] ?? "") || /[0-9.]/.test(formula[inicio - 1] ?? "")) continue;
    if (/[A-Za-z0-9_.(]/.test(formula[fim] ?? "")) continue;
    const [a, b = a] = m[0].replace(/\$/g, "").toUpperCase().split(":");
    const intervalo = normalizar(deEndereco(a), deEndereco(b));
    const chave = `${a}:${b}`;
    if (!cores.has(chave)) cores.set(chave, cores.size % CORES_REFERENCIA.length);
    out.push({ inicio, fim, texto: m[0], intervalo, cor: cores.get(chave)! });
  }
  return out;
}
