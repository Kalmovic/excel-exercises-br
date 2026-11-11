import type { Exercicio } from "./schema";

/**
 * Onde o progresso de uma questão fica guardado. Questões de lição usam
 * `licao#etapa`; o slug da lição (o da questão principal) fica reservado para
 * "lição concluída", gravado quando as 5 questões estão feitas. Assim o mapa,
 * a barra de progresso e o troféu continuam olhando um slug por casa.
 */
export function chaveProgresso(ex: Pick<Exercicio, "slug" | "licao" | "etapa">) {
  return ex.licao && ex.etapa ? `${ex.licao}#${ex.etapa}` : ex.slug;
}

/** O que o simulador precisa saber da lição para marcá-la como concluída. */
export type LicaoDoExercicio = { slug: string; versao: number; partes: { chave: string; versao: number }[] };
