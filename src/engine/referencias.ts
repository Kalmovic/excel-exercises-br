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
  /** Aba da referência (`Vendas!B2`); ausente = a aba da própria fórmula. `inicio` aponta para depois do "!". */
  aba?: string;
};

/** Nome de aba logo antes de uma referência: Vendas! ou 'Base 2024'! */
const PREFIXO_ABA = /(?:'((?:[^']|'')+)'|([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*))!$/;

/** Referências de célula/intervalo de uma fórmula, fora de aspas e de nomes de função. */
export function referenciasDaFormula(formula: string): ReferenciaNaFormula[] {
  if (!formula.startsWith("=")) return [];
  // Posições dentro de aspas: textos ("...") e nomes de aba citados ('Vendas T1'!).
  const aspas: boolean[] = [];
  let aberto: '"' | "'" | null = null;
  for (let i = 0; i < formula.length; i++) {
    const ch = formula[i];
    if (aberto === null && (ch === '"' || ch === "'")) {
      aberto = ch;
      aspas[i] = true;
    } else if (aberto !== null && ch === aberto) {
      aspas[i] = true;
      // '' e "" dentro das aspas são a própria aspa, não o fim.
      if (formula[i + 1] === aberto) aspas[++i] = true;
      else aberto = null;
    } else aspas[i] = aberto !== null;
  }
  const cores = new Map<string, number>();
  const out: ReferenciaNaFormula[] = [];
  for (const m of formula.matchAll(REF)) {
    const inicio = m.index!;
    const fim = inicio + m[0].length;
    if (aspas[inicio]) continue;
    // Faz parte de um nome maior (LOG10, CONT.SE1…) ou é uma função (ex.: "A1(")?
    if (LETRA.test(formula[inicio - 1] ?? "") || /[0-9.]/.test(formula[inicio - 1] ?? "")) continue;
    if (/[A-Za-z0-9_.(!]/.test(formula[fim] ?? "")) continue; // "Q1!" é nome de aba, não célula
    const [a, b = a] = m[0].replace(/\$/g, "").toUpperCase().split(":");
    const intervalo = normalizar(deEndereco(a), deEndereco(b));
    const p = formula[inicio - 1] === "!" ? PREFIXO_ABA.exec(formula.slice(0, inicio)) : null;
    const aba = p ? (p[1]?.replace(/''/g, "'") ?? p[2]) : undefined;
    const chave = `${aba ?? ""}!${a}:${b}`;
    if (!cores.has(chave)) cores.set(chave, cores.size % CORES_REFERENCIA.length);
    out.push({ inicio, fim, texto: m[0], intervalo, cor: cores.get(chave)!, ...(aba !== undefined ? { aba } : {}) });
  }
  return out;
}
