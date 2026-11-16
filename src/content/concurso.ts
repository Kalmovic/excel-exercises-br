/**
 * Questões de concurso (Pro): INÉDITAS, escritas no estilo das bancas, com a
 * planilha ao lado para o aluno testar as alternativas. Nada é copiado de prova.
 * Ficam fora de `exercicios` (não entram na trilha nem no sitemap).
 */
import questoes from "./concurso/questoes.json";
import { exercicioSchema, type ExercicioDoTipo } from "./schema";

export type QuestaoConcurso = ExercicioDoTipo<"multiple_choice"> & { banca: string; tema: string };

export const QUESTOES_CONCURSO: QuestaoConcurso[] = questoes
  .map((b) => exercicioSchema.parse(b))
  .filter((e): e is QuestaoConcurso => e.type === "multiple_choice" && !!e.banca && !!e.tema)
  .sort((a, b) => a.ordem - b.ordem);

export const BANCAS = [...new Set(QUESTOES_CONCURSO.map((q) => q.banca))];
export const TEMAS_CONCURSO = [...new Set(QUESTOES_CONCURSO.map((q) => q.tema))].sort((a, b) => a.localeCompare(b, "pt-BR"));

export const questaoPorSlug = (slug: string) => QUESTOES_CONCURSO.find((q) => q.slug === slug);

/** Próxima questão na ordem da lista (para o botão "Próxima questão"). */
export function proximaQuestao(slug: string) {
  const i = QUESTOES_CONCURSO.findIndex((q) => q.slug === slug);
  return i >= 0 ? QUESTOES_CONCURSO[i + 1] : undefined;
}
