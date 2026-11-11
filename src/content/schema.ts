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
  /**
   * O esperado depende do dia (ex.: `=B2-HOJE()`): a correção calcula a
   * solução de referência na hora e compara com ela. `esperado` fica só de exemplo.
   */
  esperadoDaReferencia: z.boolean().optional(),
});

/**
 * Erro comum previsto no roteiro: se a entrada do aluno (fórmula ou resposta,
 * em maiúsculas e sem espaços) casar com `padrao` (expressão regular), a
 * correção mostra `dica` no lugar da mensagem genérica.
 */
export const erroComumSchema = z.object({
  padrao: z.string().min(1),
  dica: z.string().min(1),
  /** Só para esta célula (exercícios com mais de um alvo). */
  celula: endereco.optional(),
});

const intervalo = z
  .string()
  .regex(/^[A-Z]{1,2}[1-9]\d*(:[A-Z]{1,2}[1-9]\d*)?$/, "Intervalo no formato B2:D5");

/** Campos comuns a todos os tipos de exercício. */
const baseSchema = z.object({
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
    /**
     * Células de texto usadas como critério (ex.: F1 = "SP") e outros valores
     * que a checagem testa no lugar delas (ex.: ["RJ", "MG"]).
     */
    alternativas: z.record(endereco, z.array(z.string()).min(1)).optional(),
  }),
  /** Seleção ao abrir o exercício (padrão: A1). */
  inicio: z.object({ celulaAtiva: endereco.optional(), selecao: intervalo.optional() }).optional(),
  /**
   * Ferramentas da tela. `formatacao`: barra com R$ e % (padrão: não).
   * `caixaDeNome`: mostrar o endereço da célula ativa (padrão: sim; esconder
   * quando o exercício pergunta justamente esse endereço). `selecaoFixa`: a
   * grade só pode ser observada (padrão: não).
   */
  ferramentas: z
    .object({
      formatacao: z.boolean().optional(),
      caixaDeNome: z.boolean().optional(),
      /** A célula ativa não pode mudar (ex.: "qual é o nome desta célula?"). */
      selecaoFixa: z.boolean().optional(),
    })
    .optional(),
  /** Pode ser vazio só no desafio diário (que é sem dica); o teste de conteúdo exige dicas na trilha. */
  dicas: z.array(z.string()),
  explicacao: z.array(z.string()).min(1),
  tentativasAteExplicacao: z.number().int().min(1),
  /** Contexto curto antes do enunciado: por que isso importa (roteiro). */
  intro: z.string().optional(),
  errosComuns: z.array(erroComumSchema).optional(),
  /** Gancho e roteiro do vídeo curto (para gravação; não aparece na tela). */
  video: z.string().optional(),
  /** Prática extra: fora da trilha principal e do troféu, listada no fim do módulo. */
  extra: z.boolean().optional(),
});

/** O tipo original. Exercícios sem `type` são deste tipo. */
export const exercicioFormulaSchema = baseSchema.extend({
  type: z.literal("formula"),
  alvos: z.array(alvoSchema).min(1),
  funcoesExigidas: z.array(z.string()).optional(),
  funcoesProibidas: z.array(z.string()).optional(),
  hojeFixo: z.string().optional(),
});

/** Resposta digitada num campo de texto acima da grade. */
export const exercicioTextAnswerSchema = baseSchema.extend({
  type: z.literal("text_answer"),
  /** Rótulo do campo de resposta. */
  rotulo: z.string().min(1),
  aceitas: z.array(z.string()).min(1),
  /** Como comparar: endereço ("e 4" = "E4"), fórmula (sem espaços, = opcional) ou texto livre. */
  normalizar: z.enum(["endereco", "formula", "texto"]),
});

/** A célula ativa precisa ser `celula`. */
export const exercicioClickCellSchema = baseSchema.extend({
  type: z.literal("click_cell"),
  celula: endereco,
  /** "keyboard": nenhuma mudança de célula pode ter sido feita com o mouse. */
  inputMethod: z.enum(["any", "keyboard"]).default("any"),
});

/** A seleção precisa ser exatamente `intervalo`. */
export const exercicioSelectRangeSchema = baseSchema.extend({
  type: z.literal("select_range"),
  intervalo,
});

/** Valores digitados (fórmula opcional). */
export const exercicioTypeValueSchema = baseSchema.extend({
  type: z.literal("type_value"),
  alvos: z
    .array(z.object({ celula: endereco, esperado: valorSchema, tolerancia: z.number().positive().optional() }))
    .min(1),
});

/** Formato de célula aplicado pelo aluno. */
export const exercicioFormatCellSchema = baseSchema.extend({
  type: z.literal("format_cell"),
  alvos: z.array(z.object({ intervalo, formato: z.enum(["moeda", "percentual"]) })).min(1),
});

/**
 * Retrocompatibilidade: um JSON sem `type` é tratado como `"formula"`.
 * Os exercícios que já existiam não precisam mudar.
 */
export const exercicioSchema = z.preprocess(
  (v) => (v !== null && typeof v === "object" && !("type" in v) ? { ...v, type: "formula" } : v),
  z.discriminatedUnion("type", [
    exercicioFormulaSchema,
    exercicioTextAnswerSchema,
    exercicioClickCellSchema,
    exercicioSelectRangeSchema,
    exercicioTypeValueSchema,
    exercicioFormatCellSchema,
  ]),
);

export type Valor = z.infer<typeof valorSchema>;
export type Formato = z.infer<typeof formatoSchema>;
export type CelulaInicial = z.infer<typeof celulaInicialSchema>;
export type Alvo = z.infer<typeof alvoSchema>;
export type Exercicio = z.infer<typeof exercicioSchema>;
export type TipoExercicio = Exercicio["type"];
export type ExercicioDoTipo<T extends TipoExercicio> = Extract<Exercicio, { type: T }>;
