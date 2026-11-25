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
  /**
   * A fórmula (ou resposta) casar com o padrão reprova MESMO com o valor
   * certo, com `dica` como mensagem. Ex.: PROCV sem FALSO que acerta por sorte
   * porque a tabela está em ordem.
   */
  bloqueia: z.boolean().optional(),
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

/**
 * Classificação guardada pelo efeito: a permutação das linhas de dados de
 * `intervalo` (sem o cabeçalho). `ordem[i]` é a linha (relativa ao intervalo)
 * que estava na posição i antes das classificações; classificações seguidas
 * no mesmo intervalo se compõem numa só.
 */
export const permutacaoSchema = z
  .object({
    intervalo,
    ordem: z.array(z.number().int().min(0).max(49)).min(1).max(50),
  })
  .refine((p) => new Set(p.ordem).size === p.ordem.length && p.ordem.every((i) => i < p.ordem.length), "A ordem precisa ser uma permutação.");

/** Textos de célula usados em critérios: o mesmo limite do texto que o certificado aceita. */
const textoDeCelula = z.string().max(500);

/** Critério de uma coluna do filtro: os textos (como aparecem na célula) que ficam visíveis. "" = (Vazias). */
export const criterioFiltroSchema = z.object({ valores: z.array(textoDeCelula).max(200) });

export const funcaoValorSchema = z.enum(["soma", "contagem", "media", "max", "min"]);

/** "Mostrar Valores como": omitido = Sem Cálculo; "totalGeral" = % do Total Geral. */
export const mostrarValorSchema = z.enum(["totalGeral"]);

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
    valores: z.array(z.object({ campo: letraColuna, funcao: funcaoValorSchema, mostrar: mostrarValorSchema.optional() })).max(3),
    /** `valores: null` = (Tudo). */
    filtros: z.array(z.object({ campo: letraColuna, valores: z.array(textoDeCelula).max(200).nullable() })).max(2),
  })
  .refine((d) => d.colunas.length === 0 || d.valores.length <= 1, "Com um campo em Colunas, só um campo em Valores.");

/** Os três estilos prontos do Excel ("Preenchimento Vermelho Claro e Texto Vermelho Escuro"…). */
export const estiloDestaqueSchema = z.enum(["vermelho", "amarelo", "verde"]);

/**
 * Regra de formatação condicional, como os itens do menu do Excel:
 * Realçar Regras das Células (maior, menor, entre, igual, texto, duplicados,
 * exclusivos), Primeiros/Últimos (top, acima/abaixo da média), uma fórmula
 * (relativa à primeira célula do intervalo), Barras de Dados e Escala de Cor.
 */
export const regraCondicionalSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.enum(["maior", "menor", "igual", "texto"]),
    intervalo,
    valor: z.string().max(100),
    estilo: estiloDestaqueSchema,
  }),
  z.object({ tipo: z.literal("entre"), intervalo, valor: z.string().max(100), valor2: z.string().max(100), estilo: estiloDestaqueSchema }),
  z.object({ tipo: z.enum(["duplicados", "unicos", "acimaMedia", "abaixoMedia"]), intervalo, estilo: estiloDestaqueSchema }),
  z.object({ tipo: z.enum(["maiores", "menores"]), intervalo, n: z.number().int().min(1).max(1000), estilo: estiloDestaqueSchema }),
  z.object({ tipo: z.literal("formula"), intervalo, formula: z.string().startsWith("=").max(300), estilo: estiloDestaqueSchema }),
  z.object({ tipo: z.enum(["barras", "escala"]), intervalo }),
]);

/**
 * `empilhadas`: Colunas Empilhadas (cada série é um pedaço da coluna da categoria).
 * `combinado`: Colunas e Linha (a primeira série em colunas, as outras em linhas, no mesmo eixo).
 */
export const tipoGraficoSchema = z.enum(["colunas", "barras", "linhas", "pizza", "empilhadas", "combinado"]);

/**
 * Gráfico flutuando sobre a grade, ancorado em `posicao`. Como no Excel: a
 * primeira coluna de `dados` são as categorias e a primeira linha, os nomes
 * das séries (`alternar` troca os dois: "Alternar Linha/Coluna").
 */
export const graficoSchema = z.object({
  tipo: tipoGraficoSchema,
  dados: intervalo,
  posicao: endereco,
  titulo: z.string().max(80),
  rotulos: z.boolean(),
  alternar: z.boolean(),
});

/**
 * Validação de dados, como a janela do Excel: o que Permitir, o operador e os
 * limites (escritos como na célula: "1", "30%", "01/12/2026"), a Fonte da
 * lista ("Sim;Não", "=$F$2:$F$5" ou "=Listas!$A$2:$A$9"), a fórmula de
 * Personalizado (escrita para a primeira célula do intervalo, como na
 * formatação condicional), a mensagem de entrada e o alerta de erro, com o
 * estilo (Parar, o padrão, não deixa gravar; Aviso e Informação perguntam).
 */
export const validacaoDadosSchema = z.object({
  intervalo,
  permitir: z.enum(["lista", "inteiro", "decimal", "data", "comprimento", "personalizado"]),
  operador: z.enum(["entre", "fora", "igual", "diferente", "maior", "menor", "maiorIgual", "menorIgual"]).optional(),
  valor1: z.string().max(200).optional(),
  valor2: z.string().max(200).optional(),
  fonte: z.string().max(500).optional(),
  formula: z.string().startsWith("=").max(300).optional(),
  entrada: z.object({ titulo: z.string().max(50), texto: z.string().max(255) }).optional(),
  erro: z.object({ titulo: z.string().max(50), texto: z.string().max(255) }).optional(),
  estilo: z.enum(["parar", "aviso", "informacao"]).optional(),
});

/** Nome de aba como o Excel aceita: até 31 caracteres, sem : \\ / ? * [ ] nem ! (que separa a aba da célula), e sem ' nas pontas. */
const nomeAba = z.string().regex(/^(?!')[^:\\/?*[\]!]{1,31}(?<!')$/, "Nome de aba inválido");

const recursosDeUmaAba = z.object({
  /** AutoFiltro: a primeira linha do intervalo é o cabeçalho, onde ficam as setas. null = desligado. */
  filtro: z
    .object({ intervalo, criterios: z.record(letraColuna, criterioFiltroSchema) })
    .nullable()
    .optional(),
  dinamicas: z.array(dinamicaSchema).max(3).optional(),
  /** Regras de formatação condicional; a última criada tem prioridade (como no Excel). */
  condicionais: z.array(regraCondicionalSchema).max(20).optional(),
  graficos: z.array(graficoSchema).max(4).optional(),
  /** Validação de dados; numa célula coberta por duas, vale a mais nova. */
  validacoes: z.array(validacaoDadosSchema).max(20).optional(),
  /**
   * Formato antigo das classificações: os cliques, na ordem (refeitos assim ao
   * restaurar). Ainda aceito na leitura (progresso salvo antes e o conteúdo).
   */
  ordenacoes: z.array(ordenacaoSchema).max(30).optional(),
  /** Classificações pelo efeito (o que o progresso grava agora). Aplicadas antes das células do aluno. */
  permutacoes: z.array(permutacaoSchema).max(20).optional(),
});

export const recursosSchema = recursosDeUmaAba.extend({
  /** Recursos das outras abas de uma pasta, pelo nome da aba (a primeira aba fica fora daqui). */
  abas: z
    .record(nomeAba, recursosDeUmaAba)
    .refine((o) => Object.keys(o).length <= 5, "No máximo 5 abas.")
    .optional(),
});

export const gradeSchema = z.object({
  /** Nome da aba (padrão: Planilha1). */
  nome: nomeAba.optional(),
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
  grade: gradeSchema,
  /** Outras abas da pasta, depois da principal (`grade`). Fórmulas as leem com Nome!A1. */
  abas: z.array(z.object({ nome: nomeAba, grade: gradeSchema })).max(5).optional(),
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
      /** Menu Formatação Condicional. */
      condicional: z.boolean().optional(),
      /** Menu Inserir Gráfico e o painel Design do Gráfico. */
      grafico: z.boolean().optional(),
      /** Botão Validação de Dados (e Circular Dados Inválidos). */
      validacao: z.boolean().optional(),
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
   * Questão REAL de prova que cobrou a mesma coisa do mesmo jeito (a nossa é inédita, inspirada nela).
   * Só preencher com fonte conferida: aparece para o aluno como "Caiu parecido em ...".
   */
  referencia: z
    .object({
      /** Ex.: "FCC · TRT 2ª Região · Analista Judiciário · 2023". */
      prova: z.string().min(5).max(140),
      /** Página da questão original (QConcursos, TEC, Gran...). */
      url: z.url().optional(),
    })
    .optional(),
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
    valores: z.array(z.object({ campo: z.string().optional(), funcao: funcaoValorSchema, mostrar: mostrarValorSchema.optional() })).default([]),
    filtros: z.array(z.object({ campo: z.string(), valores: z.array(z.string()).nullable() })).default([]),
    mensagem: z.string().optional(),
  }),
  /**
   * Formatação condicional: exatamente estas células do intervalo ficam
   * destacadas (com qualquer regra que chegue lá), opcionalmente nesta cor.
   */
  z.object({
    tipo: z.literal("destacadas"),
    intervalo,
    esperado: z.array(endereco),
    estilo: estiloDestaqueSchema.optional(),
    mensagem: z.string().optional(),
  }),
  /** Barras de dados ou escala de cor aplicadas exatamente neste intervalo. */
  z.object({ tipo: z.literal("formatoVisual"), intervalo, visual: z.enum(["barras", "escala"]), mensagem: z.string().optional() }),
  /**
   * Um gráfico deste tipo mostrando exatamente estas categorias e séries
   * (pelo resultado: o intervalo pode ter sido escolhido de outro jeito).
   * Pizza confere só a primeira série, que é a única que ela desenha.
   */
  z.object({
    tipo: z.literal("grafico"),
    grafico: tipoGraficoSchema,
    /** Outros tipos que também respondem à pergunta (ex.: barras no lugar de colunas para comparar). */
    aceitaTambem: z.array(tipoGraficoSchema).optional(),
    categorias: z.array(z.string()),
    series: z.array(z.object({ nome: z.string(), valores: z.array(z.number().nullable()) })).min(1),
    titulo: z.string().optional(),
    rotulos: z.boolean().optional(),
    mensagem: z.string().optional(),
  }),
  /**
   * Validação de dados pelo comportamento: em TODAS as células do intervalo,
   * a regra aceita `aceita` e recusa `recusa` (como o aluno digitaria). Se for
   * lista, os itens da setinha são exatamente `lista`. Mensagens, se pedidas.
   */
  z.object({
    tipo: z.literal("validacao"),
    intervalo,
    aceita: z.array(z.string()),
    recusa: z.array(z.string()),
    lista: z.array(z.string()).optional(),
    mensagemEntrada: z.string().optional(),
    alertaTitulo: z.string().optional(),
    alertaTexto: z.string().optional(),
    /** Estilo do alerta de erro (sem estilo na regra = Parar). */
    alertaEstilo: z.enum(["parar", "aviso", "informacao"]).optional(),
    mensagem: z.string().optional(),
  }),
  /** Nenhuma célula preenchida do intervalo fura a validação (Circular Dados Inválidos fica vazio). */
  z.object({ tipo: z.literal("semInvalidos"), intervalo, mensagem: z.string().optional() }),
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
export type Permutacao = z.infer<typeof permutacaoSchema>;
export type RecursosDeUmaAba = z.infer<typeof recursosDeUmaAba>;
export type Dinamica = z.infer<typeof dinamicaSchema>;
export type RegraCondicional = z.infer<typeof regraCondicionalSchema>;
export type Grafico = z.infer<typeof graficoSchema>;
export type ValidacaoDados = z.infer<typeof validacaoDadosSchema>;
export type TipoGrafico = z.infer<typeof tipoGraficoSchema>;
export type EstiloDestaque = z.infer<typeof estiloDestaqueSchema>;
export type FuncaoValor = z.infer<typeof funcaoValorSchema>;
export type MostrarValor = z.infer<typeof mostrarValorSchema>;
export type Verificacao = z.infer<typeof verificacaoSchema>;
export type Exercicio = z.infer<typeof exercicioSchema>;
export type TipoExercicio = Exercicio["type"];
export type ExercicioDoTipo<T extends TipoExercicio> = Extract<Exercicio, { type: T }>;
