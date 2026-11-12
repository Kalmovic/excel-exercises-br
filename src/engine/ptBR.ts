import { NOMES_PT } from "./nomes-dados";

/**
 * Nomes das funções no Excel em português do Brasil (id em inglês → nome pt-BR).
 * Usado para sugerir o nome certo ("Você quis dizer SOMA?") e para mostrar as
 * funções de cada módulo. O cálculo em si é do motor próprio (`./motor`).
 */
export const ptBR = { functions: NOMES_PT };

/** Nome pt-BR -> id canônico (inglês). Ex.: "PROCV" -> "VLOOKUP". */
export const PT_PARA_CANONICO: Record<string, string> = Object.fromEntries(
  Object.entries(NOMES_PT).map(([canonico, pt]) => [pt, canonico]),
);
