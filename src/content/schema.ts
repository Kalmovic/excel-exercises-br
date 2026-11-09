import { z } from "zod";

/**
 * Schema de exercício. Os campos filtráveis (slug, trilha, modulo, ordem,
 * plano, versao) viram colunas no banco na Fase 3; o resto vai num jsonb.
 */

const endereco = z.string().regex(/^[A-Z]{1,2}[1-9]\d*$/, "Endereço no formato A1");

export const valorSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
  z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
]);

export const formatoSchema = z.union([
  z.enum(["geral", "moeda", "percentual", "data"]),
  z.object({ casas: z.number().int().min(0).max(10) }),
]);

export const celulaInicialSchema = z.object({
  entrada: z.string(),
  formato: formatoSchema.optional(),
  /** Padrão: true para células com dados iniciais. */
  bloqueada: z.boolean().optional(),
  negrito: z.boolean().optional(),
});

export const alvoSchema = z.object({
  celula: endereco,
  esperado: z.union([valorSchema, z.array(z.array(valorSchema))]),
  tolerancia: z.number().positive().optional(),
  exigeFormula: z.boolean(),
  /** Fórmula canônica em pt-BR; usada no CI e na checagem anti-valor-digitado. */
  solucaoReferencia: z.string().startsWith("="),
  formato: formatoSchema.optional(),
});

export const exercicioSchema = z.object({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  trilha: z.enum(["excel-ptbr", "excel-en"]),
  modulo: z.string(),
  ordem: z.number().int().positive(),
  nivel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  plano: z.enum(["free", "pro"]),
  versao: z.number().int().positive(),
  titulo: z.string().min(3),
  /** Parágrafos; aceitam `código` e **negrito**. */
  enunciado: z.array(z.string()).min(1),
  grade: z.object({
    linhas: z.number().int().min(1).max(50),
    colunas: z.number().int().min(1).max(26),
    larguras: z.record(z.string(), z.number()).optional(),
    celulas: z.record(endereco, celulaInicialSchema),
    /** Células perturbadas na checagem anti-valor-digitado. */
    variaveis: z.array(endereco).optional(),
  }),
  alvos: z.array(alvoSchema).min(1),
  funcoesExigidas: z.array(z.string()).optional(),
  funcoesProibidas: z.array(z.string()).optional(),
  hojeFixo: z.string().optional(),
  dicas: z.array(z.string()).min(1),
  explicacao: z.array(z.string()).min(1),
  tentativasAteExplicacao: z.number().int().min(1),
});

export type Valor = z.infer<typeof valorSchema>;
export type Formato = z.infer<typeof formatoSchema>;
export type CelulaInicial = z.infer<typeof celulaInicialSchema>;
export type Alvo = z.infer<typeof alvoSchema>;
export type Exercicio = z.infer<typeof exercicioSchema>;
