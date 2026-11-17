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

const letraColuna = z.string().regex(/^[A-Z]{1,2}$/, "Coluna no formato B");

/**
 * Recursos da planilha além das células (filtro, classificação…). Guardamos a
 * CONFIGURAÇÃO, nunca o resultado: assim o progresso fica pequeno e o servidor
 * refaz o resultado ao corrigir o certificado. O mesmo schema vale para o
 * estado inicial do exercício (`grade.recursos`), o progresso e o envio do teste.
 */
export const ordenacaoSchema = z.object({
  intervalo,
  /** Primeira chave decide; as seguintes desempatam (Classificar personalizado). */
  chaves: z.array(z.object({ coluna: letraColuna, ordem: z.enum(["asc", "desc"]) })).min(1).max(3),
  /** A primeira linha do intervalo é cabeçalho e fica no lugar. */
  cabecalho: z.boolean(),
});

/** Critério de uma coluna do filtro: os textos (como aparecem na célula) que ficam visíveis. "" = (Vazias). */
export const criterioFiltroSchema = z.object({ valores: z.array(z.string().max(200)).max(200) });

export const funcaoValorSchema = z.enum(["soma", "contagem", "media", "max", "min"]);

/**
 * Tabela dinâmica: a configuração das quatro áreas, como no painel do Excel.
 * Campos pela letra da coluna na origem. Por ora: até 1 campo em Linhas, 1 em
 * Colunas (e aí só 1 em Valores), 3 em Valores e 2 em Filtros.
 */
export const dinamicaSchema = z
  .object({
    origem: intervalo,
    destino: endereco,
    linhas: z.array(letraColuna).max(1),
    colunas: z.array(letraColuna).max(1),
    valores: z.array(z.object({ campo: letraColuna, funcao: funcaoValorSchema })).max(3),
    /** `valores: null` = (Tudo). */
    filtros: z.array(z.object({ campo: letraColuna, valores: z.array(z.string().max(200)).max(200).nullable() })).max(2),
  })
  .refine((d) => d.colunas.length === 0 || d.valores.length <= 1, "Com um campo em Colunas, só um campo em Valores.");

export const recursosSchema = z.object({
  /** AutoFiltro: a primeira linha do intervalo é o cabeçalho, onde ficam as setas. null = desligado. */
  filtro: z
    .object({ intervalo, criterios: z.record(letraColuna, criterioFiltroSchema) })
    .nullable()
    .optional(),
  dinamicas: z.array(dinamicaSchema).max(3).optional(),
  /** Classificações feitas pelo aluno, na ordem (refeitas assim ao restaurar). */
  ordenacoes: z.array(ordenacaoSchema).max(30).optional(),
});

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
    /** Estado inicial dos recursos (ex.: o filtro já aplicado num exercício de SUBTOTAL). */
    recursos: recursosSchema.optional(),
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
      /** Barra "Dados": Filtro (Ctrl+Shift+L) e Classificar. */
      dados: z.boolean().optional(),
      /** Botão Tabela dinâmica e o painel de campos. */
      dinamica: z.boolean().optional(),
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
  /** Questões de concurso: banca no estilo da qual a questão (inédita) foi escrita, e o tema. */
  banca: z.string().optional(),
  tema: z.string().optional(),
  /**
   * Textos para aparelhos sem teclado físico (celular, tablet), quando o
   * exercício pede teclado. Com isto, a correção também deixa de exigir as setas.
   */
  toque: z.object({ enunciado: z.array(z.string()).min(1), dicas: z.array(z.string()).optional() }).optional(),
  /** Prática extra: fora da trilha principal e do troféu, listada no fim do módulo. */
  extra: z.boolean().optional(),
  /**
   * Lição de 5 questões (roteiro): `licao` é o slug da questão principal, que
   * dá nome à lição; `etapa` vai de 1 (principal) a 5 (múltipla escolha).
   */
  licao: z.string().optional(),
  etapa: z.number().int().min(1).max(5).optional(),
  papel: z.enum(["principal", "variacao", "pegadinha", "conceito"]).optional(),
  /** Questão do teste do módulo: sem dica; `revisar` é a lição indicada a quem errar. */
  teste: z.boolean().optional(),
  revisar: z.string().optional(),
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

/** Pergunta conceitual com alternativas (sem planilha). */
export const exercicioMultipleChoiceSchema = baseSchema.extend({
  type: z.literal("multiple_choice"),
  /** `dica` aparece quando o aluno escolhe esta alternativa errada. */
  opcoes: z.array(z.object({ texto: z.string().min(1), dica: z.string().optional() })).min(2).max(6),
  /** Índice (base 0) da alternativa correta. */
  correta: z.number().int().min(0),
  /** Mostra a planilha (editável, sem correção) para o aluno testar as alternativas. */
  comPlanilha: z.boolean().optional(),
  /** Só para o teste de conteúdo: fórmulas que a questão afirma, conferidas no motor. */
  conferir: z.array(z.object({ formula: z.string().startsWith("="), esperado: valorSchema })).optional(),
});

/**
 * O que a correção confere num exercício de ferramenta (classificar, filtrar…).
 * Sempre pelo resultado quando dá: quem chega lá por outro caminho também acerta.
 */
export const verificacaoSchema = z.discriminatedUnion("tipo", [
  /** Valores do intervalo, na ordem (ex.: depois de classificar). */
  z.object({ tipo: z.literal("valores"), intervalo, esperado: z.array(z.array(valorSchema)).min(1), mensagem: z.string().optional() }),
  /** Linhas (números da planilha) que ficam visíveis no intervalo do filtro, fora o cabeçalho. */
  z.object({ tipo: z.literal("linhasVisiveis"), esperado: z.array(z.number().int().positive()), mensagem: z.string().optional() }),
  /** O filtro está ligado (opcionalmente, exatamente neste intervalo). */
  z.object({ tipo: z.literal("filtroAtivo"), intervalo: intervalo.optional(), mensagem: z.string().optional() }),
  /**
   * A tabela dinâmica tem esta configuração (campos pelo NOME do cabeçalho).
   * Valores sem `campo`: qualquer campo serve (contagem de Vendedor = contagem de Valor).
   */
  z.object({
    tipo: z.literal("dinamica"),
    origem: intervalo,
    linhas: z.array(z.string()).default([]),
    colunas: z.array(z.string()).default([]),
    valores: z.array(z.object({ campo: z.string().optional(), funcao: funcaoValorSchema })).default([]),
    filtros: z.array(z.object({ campo: z.string(), valores: z.array(z.string()).nullable() })).default([]),
    mensagem: z.string().optional(),
  }),
  /** Resultado de uma célula, com fórmula e (opcional) usando uma função. */
  z.object({
    tipo: z.literal("celula"),
    celula: endereco,
    esperado: valorSchema,
    tolerancia: z.number().positive().optional(),
    funcao: z.string().optional(),
    mensagem: z.string().optional(),
  }),
]);

/** Ferramentas do Excel usadas na própria grade (barra Dados e, nas próximas fases, as outras). */
export const exercicioFerramentaSchema = baseSchema.extend({
  type: z.literal("ferramenta"),
  verificacoes: z.array(verificacaoSchema).min(1),
  /** Um jeito de resolver (recursos e células digitadas): o teste de conteúdo confere que ele passa. */
  solucao: z.object({ recursos: recursosSchema.optional(), celulas: z.record(endereco, z.string()).optional() }),
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
    exercicioMultipleChoiceSchema,
    exercicioFormatCellSchema,
    exercicioFerramentaSchema,
  ]),
);

export type Valor = z.infer<typeof valorSchema>;
export type Formato = z.infer<typeof formatoSchema>;
export type CelulaInicial = z.infer<typeof celulaInicialSchema>;
export type Alvo = z.infer<typeof alvoSchema>;
export type Recursos = z.infer<typeof recursosSchema>;
export type Ordenacao = z.infer<typeof ordenacaoSchema>;
export type Dinamica = z.infer<typeof dinamicaSchema>;
export type FuncaoValor = z.infer<typeof funcaoValorSchema>;
export type Verificacao = z.infer<typeof verificacaoSchema>;
export type Exercicio = z.infer<typeof exercicioSchema>;
export type TipoExercicio = Exercicio["type"];
export type ExercicioDoTipo<T extends TipoExercicio> = Extract<Exercicio, { type: T }>;
