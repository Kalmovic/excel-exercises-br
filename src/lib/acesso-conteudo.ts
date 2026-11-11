import type { Exercicio } from "@/content/schema";

/**
 * Enquanto o Pro não está à venda (fase de testes), os exercícios Pro ficam
 * abertos para todos, com um selo "Pro". Ao lançar o Pro, troque para true:
 * as páginas Pro deixam de ser geradas e passam a exigir assinatura (Fase 3).
 */
export const PAYWALL_ATIVO = false;

export const exercicioLiberado = (e: Pick<Exercicio, "plano">) => e.plano === "free" || !PAYWALL_ATIVO;
