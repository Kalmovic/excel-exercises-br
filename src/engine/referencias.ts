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
  /** Referência 3D (`Jan:Mar!B2`): `aba` é a primeira e `ateAba` a última do intervalo de abas. */
  ateAba?: string;
};

/** Intervalo de abas logo antes de uma referência: Jan:Mar! ou 'Jan 1:Mar 1'! */
const PREFIXO_3D = /(?:'((?:[^':]|'')+):((?:[^':]|'')+)'|([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*):([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*))!$/;

/** Nome de aba logo antes de uma referência: Vendas! ou 'Base 2024'! */
const PREFIXO_ABA = /(?:'((?:[^']|'')+)'|([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*))!$/;

/** O que vem antes de um "!" sem nome de aba válido, até o operador ou separador anterior (com espaços). */
const semAspas = (antes: string) => /[^=(;,+\-*/&^<>]*$/.exec(antes)![0].trim();

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
    const comAba = formula[inicio - 1] === "!";
    const p3 = comAba ? PREFIXO_3D.exec(formula.slice(0, inicio)) : null;
    const p = comAba && !p3 ? PREFIXO_ABA.exec(formula.slice(0, inicio)) : null;
    // Com "!" mas sem um nome válido (ex.: Vendas 2025!B2 sem as aspas): a referência continua sendo
    // de outra aba, com o texto que veio antes do "!", e não da aba da fórmula.
    const aba = p3
      ? (p3[1]?.replace(/''/g, "'") ?? p3[3])
      : p ? (p[1]?.replace(/''/g, "'") ?? p[2]) : comAba ? semAspas(formula.slice(0, inicio - 1)) : undefined;
    const ateAba = p3 ? (p3[2]?.replace(/''/g, "'") ?? p3[4]) : undefined;
    const chave = `${aba ?? ""}${ateAba ? `:${ateAba}` : ""}!${a}:${b}`;
    if (!cores.has(chave)) cores.set(chave, cores.size % CORES_REFERENCIA.length);
    out.push({ inicio, fim, texto: m[0], intervalo, cor: cores.get(chave)!, ...(aba !== undefined ? { aba } : {}), ...(ateAba !== undefined ? { ateAba } : {}) });
  }
  return out;
}
