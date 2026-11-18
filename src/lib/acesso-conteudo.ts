import type { Exercicio } from "@/content/schema";

/**
 * Enquanto o Pro não está à venda (fase de testes), os exercícios Pro ficam
 * abertos para todos, com um selo "Pro". Ao lançar o Pro, troque para true:
 * as páginas Pro deixam de ser geradas e passam a exigir assinatura (Fase 3).
 */
export const PAYWALL_ATIVO = false;

export const exercicioLiberado = (e: Pick<Exercicio, "plano">) => e.plano === "free" || !PAYWALL_ATIVO;

/**
 * A questão tem página própria em /exercicios/<slug>? As do teste do módulo
 * NÃO: o gabarito delas (solução, valor esperado, alternativa certa) não pode
 * chegar ao navegador. Elas só existem em /teste/<módulo>, sem o gabarito, com
 * a correção no servidor.
 */
export const temPaginaDeExercicio = (e: Pick<Exercicio, "plano" | "teste">) => exercicioLiberado(e) && !e.teste;
