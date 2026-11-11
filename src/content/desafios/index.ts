import "server-only";
import { z } from "zod";
import { exercicioSchema } from "@/content/schema";
import { diasEntre, hojeSP } from "@/lib/data-sp";
import novembro2026 from "./2026-11.json";
import dezembro2026 from "./2026-12.json";

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
  /**
   * Curva da semana: segunda nível 1, terça e quarta nível 2, quinta e
   * sexta nível 3, fim de semana "caso real" (várias etapas, nível 3).
   */
  nivel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  caso: z.boolean().default(false),
  exercicio: exercicioSchema,
});

/** Nível esperado para a data, pela curva da semana. */
export function nivelDoDia(data: string): { nivel: 1 | 2 | 3; caso: boolean } {
  const [a, m, d] = data.split("-").map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  if (semana === 0 || semana === 6) return { nivel: 3, caso: true };
  if (semana === 1) return { nivel: 1, caso: false };
  if (semana === 2 || semana === 3) return { nivel: 2, caso: false };
  return { nivel: 3, caso: false };
}

export function rotuloNivel(d: { nivel: number; caso: boolean }) {
  return d.caso ? "Caso real" : `Nível ${d.nivel}`;
}

export type Desafio = z.infer<typeof desafioSchema>;

/** Dia do desafio nº 1. */
export const LANCAMENTO = "2026-11-10";

export const desafios: Desafio[] = [...novembro2026, ...dezembro2026]
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
