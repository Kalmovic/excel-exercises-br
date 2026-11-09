import { PT_PARA_CANONICO, ptBR } from "./ptBR";

/**
 * Análise léxica mínima de fórmulas, para:
 * - descobrir quais funções o aluno usou (ignorando texto entre aspas);
 * - aceitar VERDADEIRO/FALSO sem parênteses (o HyperFormula exige `FALSO()`);
 * - recusar nomes em inglês ou sem acento com uma sugestão.
 */

const IDENT = /[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*/y;

type Token = { tipo: "texto" | "ident" | "outro"; valor: string; funcao?: boolean };

function tokenizar(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < formula.length) {
        if (formula[j] === '"') {
          if (formula[j + 1] === '"') j += 2;
          else break;
        } else j++;
      }
      tokens.push({ tipo: "texto", valor: formula.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    IDENT.lastIndex = i;
    const m = IDENT.exec(formula);
    if (m) {
      let k = i + m[0].length;
      while (formula[k] === " ") k++;
      tokens.push({ tipo: "ident", valor: m[0], funcao: formula[k] === "(" });
      i += m[0].length;
      continue;
    }
    tokens.push({ tipo: "outro", valor: ch });
    i++;
  }
  return tokens;
}

/** Nomes de função usados, em ids canônicos (inglês). Ex.: ["VLOOKUP", "IFERROR"]. */
export function funcoesUsadas(formula: string): string[] {
  if (!formula.startsWith("=")) return [];
  const usadas = new Set<string>();
  for (const t of tokenizar(formula)) {
    if (t.tipo === "ident" && t.funcao) {
      const nome = t.valor.toUpperCase();
      usadas.add(PT_PARA_CANONICO[nome] ?? nome);
    }
    if (t.tipo === "ident" && !t.funcao) {
      const nome = t.valor.toUpperCase();
      if (nome === "VERDADEIRO") usadas.add("TRUE");
      if (nome === "FALSO") usadas.add("FALSE");
    }
  }
  return [...usadas];
}

const BOOLEANOS = new Set(["VERDADEIRO", "FALSO"]);

/** Converte `FALSO` solto em `FALSO()`, que é o que o HyperFormula entende. */
export function paraMotor(formula: string): string {
  if (!formula.startsWith("=")) return formula;
  return tokenizar(formula)
    .map((t) =>
      t.tipo === "ident" && !t.funcao && BOOLEANOS.has(t.valor.toUpperCase())
        ? `${t.valor.toUpperCase()}()`
        : t.valor,
    )
    .join("");
}

/** Inverso de `paraMotor`: mostra `FALSO` como o Excel mostra. */
export function paraExibicao(formula: string): string {
  if (!formula.startsWith("=")) return formula;
  return formula.replace(/\b(VERDADEIRO|FALSO)\(\)/g, "$1");
}

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const PT_SEM_ACENTO: Record<string, string> = Object.fromEntries(
  Object.values(ptBR.functions as Record<string, string>).map((pt) => [semAcento(pt), pt]),
);

export type Validacao = { ok: true } | { ok: false; mensagem: string };

/** Valida nomes de função e separadores no padrão do Excel pt-BR. */
export function validarIdioma(formula: string): Validacao {
  if (!formula.startsWith("=")) return { ok: true };
  const tokens = tokenizar(formula);
  for (const t of tokens) {
    if (t.tipo !== "ident" || !t.funcao) continue;
    const nome = t.valor.toUpperCase();
    if (PT_PARA_CANONICO[nome]) continue;
    const traducao = (ptBR.functions as Record<string, string>)[nome];
    if (traducao && traducao !== nome) {
      return {
        ok: false,
        mensagem: `Você quis dizer ${traducao}? No Excel em português, ${nome} se chama ${traducao}.`,
      };
    }
    const comAcento = PT_SEM_ACENTO[semAcento(nome)];
    if (comAcento && comAcento !== nome) {
      return { ok: false, mensagem: `Você quis dizer ${comAcento}? O nome da função leva acento.` };
    }
    return { ok: false, mensagem: `A função ${nome} não existe no Excel em português.` };
  }
  // Vírgula usada como separador de argumentos: "=SOMA(A1,A2)"
  const semTextos = tokens
    .filter((t) => t.tipo !== "texto")
    .map((t) => t.valor)
    .join("");
  if (/[A-Za-z]\$?\d+\s*,\s*[$A-Za-z"(]/.test(semTextos) || /\(\s*[$A-Za-z]+\$?\d+\s*,/.test(semTextos)) {
    return {
      ok: false,
      mensagem:
        "No Excel em português, os argumentos são separados por ponto e vírgula (;). A vírgula é o separador decimal.",
    };
  }
  return { ok: true };
}
