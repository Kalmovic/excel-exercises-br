/**
 * Validação de dados: se um valor passa na regra. Função pura; a `Planilha`
 * fornece o valor, o texto como aparece e os itens da lista.
 */
import type { ValidacaoDados } from "@/content/schema";
import type { ValorCelula } from "./format";
import { lerEntrada } from "./motor/entrada";

export const NOMES_PERMITIR: Record<ValidacaoDados["permitir"], string> = {
  lista: "Lista",
  inteiro: "Número inteiro",
  decimal: "Decimal",
  data: "Data",
  comprimento: "Comprimento do texto",
  personalizado: "Personalizado",
};

export const NOMES_ESTILO: Record<NonNullable<ValidacaoDados["estilo"]>, string> = {
  parar: "Parar",
  aviso: "Aviso",
  informacao: "Informação",
};

export const NOMES_OPERADOR: Record<NonNullable<ValidacaoDados["operador"]>, string> = {
  entre: "está entre",
  fora: "não está entre",
  igual: "é igual a",
  diferente: "é diferente de",
  maior: "é maior do que",
  menor: "é menor do que",
  maiorIgual: "é maior ou igual a",
  menorIgual: "é menor ou igual a",
};

export const ERRO_PADRAO = {
  titulo: "Valor inválido",
  texto: "Este valor não corresponde às restrições de validação de dados definidas para esta célula.",
};

/** Limite escrito como na célula ("1", "30%", "01/12/2026", "1.000") → número. */
export function lerLimite(t: string | undefined): number | null {
  if (t === undefined || t.trim() === "") return null;
  const c = lerEntrada(t.trim());
  return c && "valor" in c && typeof c.valor === "number" ? c.valor : null;
}

/** Itens da lista: "Sim;Não" separado por ponto e vírgula (Excel em português), ou os textos de um intervalo. */
export function itensDaFonte(fonte: string | undefined, lerIntervalo: (texto: string) => string[] | null): string[] {
  const f = (fonte ?? "").trim();
  if (f.startsWith("=")) return (lerIntervalo(f.slice(1).replace(/\$/g, "")) ?? []).filter((x) => x !== "");
  return f
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x !== "");
}

function compara(op: NonNullable<ValidacaoDados["operador"]>, x: number, a: number | null, b: number | null): boolean {
  if (a === null) return false;
  switch (op) {
    case "entre":
      return b !== null && x >= Math.min(a, b) && x <= Math.max(a, b);
    case "fora":
      return b !== null && (x < Math.min(a, b) || x > Math.max(a, b));
    case "igual":
      return x === a;
    case "diferente":
      return x !== a;
    case "maior":
      return x > a;
    case "menor":
      return x < a;
    case "maiorIgual":
      return x >= a;
    case "menorIgual":
      return x <= a;
  }
}

/**
 * O valor passa na regra? Vazio sempre passa ("Ignorar em branco", o padrão do Excel).
 * Personalizado: `formula` dá o resultado da fórmula para esta célula (já com o valor novo);
 * passa com VERDADEIRO ou número diferente de zero, como no Excel.
 */
export function passaNaValidacao(v: ValidacaoDados, valor: ValorCelula, texto: string, itens: string[], formula?: () => ValorCelula): boolean {
  if (valor === null || valor === "") return true;
  if (typeof valor === "object") return false; // erro de fórmula nunca é válido
  const op = v.operador ?? "entre";
  const a = lerLimite(v.valor1), b = lerLimite(v.valor2);
  switch (v.permitir) {
    case "lista":
      // Como o Excel: sem diferenciar maiúsculas.
      return itens.some((i) => i.toUpperCase() === texto.trim().toUpperCase());
    case "inteiro":
      return typeof valor === "number" && Number.isInteger(Math.round(valor * 1e9) / 1e9) && compara(op, valor, a, b);
    case "decimal":
    case "data":
      return typeof valor === "number" && compara(op, valor, a, b);
    case "comprimento":
      return compara(op, texto.length, a, b);
    case "personalizado": {
      const r = formula?.() ?? null;
      return r === true || (typeof r === "number" && r !== 0);
    }
  }
}

/** Frase da regra ("Número inteiro que está entre 1 e 100"), para o gerenciador e as mensagens. */
export function descreverValidacao(v: ValidacaoDados): string {
  if (v.permitir === "lista") return `Lista: ${v.fonte ?? ""}`;
  if (v.permitir === "personalizado") return `Personalizado: ${v.formula ?? ""}`;
  const op = v.operador ?? "entre";
  const limites = op === "entre" || op === "fora" ? `${v.valor1 ?? "?"} e ${v.valor2 ?? "?"}` : (v.valor1 ?? "?");
  return `${NOMES_PERMITIR[v.permitir]} que ${NOMES_OPERADOR[op]} ${limites}`;
}
