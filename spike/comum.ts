// Peças comuns da comparação: tradução pt-BR -> inglês e leitura das entradas brasileiras.
import { PT_PARA_CANONICO } from "../src/engine/ptBR";
import { dataIsoParaSerial } from "../src/engine/format";

const IDENT = /[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*/y;
const NUM = /\d+(,\d+)?(?![A-Za-z0-9_])/y;

/** "=PROCV(A2;$E$2:$F$9;2;FALSO)" -> "=VLOOKUP(A2,$E$2:$F$9,2,FALSE)" */
export function traduzir(formula: string): string {
  let out = "";
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < formula.length && !(formula[j] === '"' && formula[j + 1] !== '"')) j += formula[j] === '"' ? 2 : 1;
      out += formula.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // número com vírgula decimal (não pode estar colado num nome, como B2)
    if (/\d/.test(ch) && !/[A-Za-z0-9_$.]/.test(formula[i - 1] ?? "")) {
      NUM.lastIndex = i;
      const m = NUM.exec(formula);
      if (m) {
        out += m[0].replace(",", ".");
        i += m[0].length;
        continue;
      }
    }
    IDENT.lastIndex = i;
    const m = IDENT.exec(formula);
    if (m && !/[0-9$]/.test(formula[i - 1] ?? "")) {
      const nome = m[0].toUpperCase();
      let k = i + m[0].length;
      while (formula[k] === " ") k++;
      if (formula[k] === "(") out += PT_PARA_CANONICO[nome] ?? nome;
      else if (nome === "VERDADEIRO") out += "TRUE";
      else if (nome === "FALSO") out += "FALSE";
      else out += m[0];
      i += m[0].length;
      continue;
    }
    out += ch === ";" ? "," : ch;
    i++;
  }
  return out;
}

export type Entrada = { tipo: "formula"; ingles: string } | { tipo: "numero"; valor: number } | { tipo: "texto"; valor: string };

/** Lê o que o aluno (ou o conteúdo) digitou numa célula, como o Excel em português. */
export function lerEntrada(bruto: string): Entrada {
  const t = bruto.trim();
  if (t.startsWith("=")) return { tipo: "formula", ingles: traduzir(t) };
  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
  let m;
  if ((m = /^(-?)R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)$/.exec(t))) return { tipo: "numero", valor: (m[1] ? -1 : 1) * num(m[2]) };
  if ((m = /^(-?\d+(?:,\d+)?)%$/.exec(t))) return { tipo: "numero", valor: num(m[1]) / 100 };
  if (/^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(t)) return { tipo: "numero", valor: num(t) };
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return { tipo: "numero", valor: dataIsoParaSerial(iso) };
  }
  return { tipo: "texto", valor: bruto };
}

export const pos = (end: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(end)!;
  const col = [...m[1]].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
  return { linha: Number(m[2]), coluna: col }; // base 1
};

export type Item = {
  id: string;
  linhas: number;
  colunas: number;
  celulas: Record<string, string>;
  formulas: Record<string, string>;
  esperados: { celula: string; esperado: unknown; tol: number }[];
};

type Valor = number | string | boolean | null | { erro: string };
export interface Motor {
  nome: string;
  rodar(item: Item): (end: string, dl?: number, dc?: number) => Valor;
}

function igual(obt: Valor, esp: unknown, tol: number) {
  if (typeof esp === "number") return typeof obt === "number" && Math.abs(obt - esp) <= Math.max(tol, Math.abs(esp) * 1e-9);
  if (typeof esp === "string") return typeof obt === "string" && obt.trim() === esp.trim();
  if (esp === null) return obt === null || obt === "";
  if (esp && typeof esp === "object" && "erro" in esp) return !!obt && typeof obt === "object" && "erro" in obt && obt.erro === (esp as { erro: string }).erro;
  return obt === esp;
}

export function avaliar(motor: Motor, itens: Item[]) {
  let ok = 0;
  const falhas: { id: string; celula: string; formula: string; esperado: unknown; obtido: unknown }[] = [];
  for (const item of itens) {
    let ler: ReturnType<Motor["rodar"]>;
    try {
      ler = motor.rodar(item);
    } catch (e) {
      falhas.push({ id: item.id, celula: "*", formula: "", esperado: "", obtido: `EXCEÇÃO ${(e as Error).message.slice(0, 80)}` });
      continue;
    }
    for (const e of item.esperados) {
      const matriz = Array.isArray(e.esperado) ? (e.esperado as unknown[][]) : [[e.esperado]];
      let certo = true;
      let primeiro: Valor = null;
      matriz.forEach((linha, dl) =>
        linha.forEach((esp, dc) => {
          const v = ler(e.celula, dl, dc);
          if (dl === 0 && dc === 0) primeiro = v;
          if (!igual(v, esp, e.tol)) certo = false;
        }),
      );
      if (certo) ok++;
      else falhas.push({ id: item.id, celula: e.celula, formula: item.formulas[e.celula] ?? item.celulas[e.celula], esperado: matriz.length > 1 ? JSON.stringify(matriz).slice(0, 60) : matriz[0][0], obtido: primeiro });
    }
  }
  return { ok, total: ok + falhas.length, falhas };
}
