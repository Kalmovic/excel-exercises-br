/**
 * Questões de concurso (Pro): INÉDITAS, escritas no estilo das bancas, com a
 * planilha ao lado para o aluno testar as alternativas. Nada é copiado de prova.
 *
 * Duas fontes:
 * 1. concurso/questoes.json: questões avulsas, fora de `exercicios` (não entram na trilha nem no sitemap);
 * 2. a etapa 5 das lições, quando é uma questão de concurso (tem `banca` e `tema`): aparece na lição
 *    e também aqui. É o mesmo exercício (mesmo slug), então acertar num lugar conta no outro.
 */
import { exercicios, MODULOS } from "./index";
import questoes from "./concurso/questoes.json";
import { exercicioSchema, type Exercicio, type ExercicioDoTipo } from "./schema";

export type QuestaoConcurso = ExercicioDoTipo<"multiple_choice"> & { banca: string; tema: string };

const ehQuestao = (e: Exercicio): e is QuestaoConcurso => e.type === "multiple_choice" && !!e.banca && !!e.tema;
const posicaoModulo = (slug: string) => MODULOS.findIndex((m) => m.slug === slug);

/** As avulsas primeiro (na ordem delas); depois as das lições, na ordem da trilha. */
export const QUESTOES_CONCURSO: QuestaoConcurso[] = [
  ...questoes
    .map((b) => exercicioSchema.parse(b))
    .filter(ehQuestao)
    .sort((a, b) => a.ordem - b.ordem),
  ...exercicios
    .filter((e) => !e.teste)
    .filter(ehQuestao)
    .sort((a, b) => posicaoModulo(a.modulo) - posicaoModulo(b.modulo) || a.ordem - b.ordem),
];

export const BANCAS = [...new Set(QUESTOES_CONCURSO.map((q) => q.banca))];
export const TEMAS_CONCURSO = [...new Set(QUESTOES_CONCURSO.map((q) => q.tema))].sort((a, b) => a.localeCompare(b, "pt-BR"));

export const questaoPorSlug = (slug: string) => QUESTOES_CONCURSO.find((q) => q.slug === slug);

/** Próxima questão na ordem da lista (para o botão "Próxima questão"). */
export function proximaQuestao(slug: string) {
  const i = QUESTOES_CONCURSO.findIndex((q) => q.slug === slug);
  return i >= 0 ? QUESTOES_CONCURSO[i + 1] : undefined;
}
