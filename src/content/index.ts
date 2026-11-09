import { exercicioSchema, type Exercicio } from "./schema";
import e1 from "./free/01-soma-total-de-vendas.json";
import e2 from "./free/02-media-minimo-maximo.json";
import e3 from "./free/03-operadores-lucro.json";
import e4 from "./free/04-variacao-percentual.json";
import e5 from "./free/05-referencia-absoluta-comissao.json";

/**
 * Só conteúdo GRÁTIS entra no bundle. O conteúdo pro (Fase 3) vem do
 * Supabase, protegido por RLS, e nunca é importado aqui.
 */
const brutos: unknown[] = [e1, e2, e3, e4, e5];

export const exercicios: Exercicio[] = brutos
  .map((b) => exercicioSchema.parse(b))
  .sort((a, b) => a.ordem - b.ordem);

export const MODULOS = [
  {
    slug: "fundamentos",
    titulo: "Fundamentos",
    descricao: "SOMA, MÉDIA, MÍNIMO/MÁXIMO, operadores, variação % e referência absoluta.",
  },
] as const;

export function exercicioPorSlug(slug: string) {
  return exercicios.find((e) => e.slug === slug);
}

export function proximoExercicio(slug: string) {
  const i = exercicios.findIndex((e) => e.slug === slug);
  return i >= 0 ? exercicios[i + 1] : undefined;
}
