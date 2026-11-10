import "server-only";
import { z } from "zod";
import { exercicioSchema } from "@/content/schema";
import { diasEntre, hojeSP } from "@/lib/data-sp";
import novembro2026 from "./2026-11.json";

/**
 * Desafios diários. Este módulo é SÓ DO SERVIDOR: o `import "server-only"`
 * faz o build falhar se algum componente do cliente importar daqui. Assim
 * os desafios futuros nunca vão para o bundle JS; o navegador recebe só o
 * desafio do dia, entregue pela página.
 *
 * Para adicionar um mês: crie AAAA-MM.json e inclua no array abaixo.
 */
const desafioSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exercicio: exercicioSchema,
});

export type Desafio = z.infer<typeof desafioSchema>;

/** Dia do desafio nº 1. */
export const LANCAMENTO = "2026-11-10";

export const desafios: Desafio[] = [...novembro2026]
  .map((d) => desafioSchema.parse(d))
  .sort((a, b) => a.data.localeCompare(b.data));

export function numeroDoDesafio(data: string) {
  return diasEntre(LANCAMENTO, data) + 1;
}

/**
 * "Hoje" em São Paulo, calculado no servidor (adiantar o relógio do
 * computador não muda nada). DESAFIO_HOJE fixa a data nos testes e2e;
 * é ignorada em produção na Vercel.
 */
export function hojeNoServidor(): string {
  const fixo = process.env.DESAFIO_HOJE;
  if (fixo && process.env.VERCEL_ENV !== "production") return fixo;
  return hojeSP();
}

export function desafioDoDia(data: string) {
  return desafios.find((d) => d.data === data);
}

/** Já passaram: só estes podem ter a solução publicada. */
export function desafiosAnteriores(hoje: string) {
  return desafios.filter((d) => d.data < hoje).reverse();
}
