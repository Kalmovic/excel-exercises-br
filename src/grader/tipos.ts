import type { Formato, Valor } from "@/content/schema";
import { dataIsoParaSerial, type ValorCelula } from "@/engine/format";

export type MotivoFalha =
  // fórmula
  | "vazia"
  | "circular"
  | "sem-formula"
  | "erro"
  | "valor"
  | "funcao-faltando"
  | "funcao-proibida"
  | "valor-fixo"
  // intro
  | "sem-resposta"
  | "resposta"
  | "celula-errada"
  | "usou-mouse"
  | "selecao-errada"
  | "formato";

export type Falha = { celula: string; motivo: MotivoFalha; mensagem: string };
export type Resultado = { ok: boolean; falhas: Falha[] };

/**
 * Retrato do que está na tela no momento de verificar. Os validadores dos
 * tipos novos só leem isto, então são funções puras e testáveis com um
 * objeto falso, sem montar a planilha.
 */
export type EstadoCorrecao = {
  valor(endereco: string): ValorCelula;
  formato(endereco: string): Formato | undefined;
  temFormula(endereco: string): boolean;
  exibicao(endereco: string): string;
  /** Célula ativa, ex.: "C7". */
  ativa: string;
  /** Seleção atual, ex.: "B2:D5" (ou "C7" se for uma célula só). */
  selecao: string;
  /** Texto do campo de resposta (exercícios text_answer). */
  resposta: string;
  /** Quantas vezes a célula ativa ou a seleção mudou por clique/arrasto. */
  mudancasPeloMouse: number;
};

export const TOLERANCIA_PADRAO = 1e-9;

function normalizarEsperado(v: Valor): ValorCelula {
  if (v !== null && typeof v === "object") return dataIsoParaSerial(v.data);
  return v;
}

export function iguais(obtido: ValorCelula, esperado: Valor, tol: number): boolean {
  const e = normalizarEsperado(esperado);
  if (typeof e === "number") {
    return typeof obtido === "number" && Math.abs(obtido - e) <= Math.max(tol, Math.abs(e) * 1e-12);
  }
  if (typeof e === "string" && typeof obtido === "string") return obtido.trim() === e.trim();
  if (e === null) return obtido === null || obtido === "";
  return obtido === e;
}

export const ok = (): Resultado => ({ ok: true, falhas: [] });
export const falhou = (...falhas: Falha[]): Resultado => ({ ok: false, falhas });
