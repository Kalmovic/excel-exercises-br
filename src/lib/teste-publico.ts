/**
 * O teste do módulo como o navegador recebe: sem gabarito.
 *
 * Por quê: a página /teste/[modulo] é pública e pré-renderizada. Tudo o que vai
 * para o componente do navegador fica legível no HTML e no .rsc. Com o
 * exercício inteiro, dava para ler a fórmula de referência, o valor esperado
 * e a alternativa certa, e emitir o certificado sem estudar.
 *
 * `exercicioParaTeste` troca cada segredo por um valor neutro, mantendo o tipo
 * `Exercicio` válido (o Simulador desenha a questão do mesmo jeito). Quem
 * corrige é o servidor, em POST /api/teste/corrigir, com o exercício original.
 */
import { z } from "zod";
import type { Exercicio, Verificacao } from "@/content/schema";
import type { RespostaQuestao } from "@/grader/conferir-teste";

/** Texto no lugar da explicação: ela só pode existir no servidor. */
export const EXPLICACAO_DO_TESTE = "A correção do teste é feita no servidor.";

export function exercicioParaTeste(ex: Exercicio): Exercicio {
  // Fora: dicas, explicação real, erros comuns (os padrões mostram a resposta certa
  // por exclusão), roteiro do vídeo e as células da checagem anti-valor-digitado.
  const { toque } = ex;
  const base = {
    ...sem(ex, "errosComuns", "video", "toque"),
    grade: semPerturbacao(ex.grade),
    ...(ex.abas ? { abas: ex.abas.map((a) => ({ ...a, grade: semPerturbacao(a.grade) })) } : {}),
    dicas: [],
    explicacao: [EXPLICACAO_DO_TESTE],
    ...(toque ? { toque: { enunciado: toque.enunciado } } : {}),
  };
  switch (base.type) {
    case "formula": {
      const q = sem(base, "funcoesExigidas", "funcoesProibidas");
      return {
        ...q,
        // A célula fica (a tela destaca onde escrever); o resultado e a fórmula, não.
        alvos: q.alvos.map((a) => ({ celula: a.celula, exigeFormula: a.exigeFormula, esperado: 0, solucaoReferencia: "=0", ...(a.formato ? { formato: a.formato } : {}) })),
      };
    }
    case "type_value":
      return { ...base, alvos: base.alvos.map((a) => ({ celula: a.celula, esperado: 0 })) };
    case "format_cell":
      // O intervalo aparece no enunciado da tela; o formato pedido está no texto da questão.
      return { ...base, alvos: base.alvos.map((a) => ({ intervalo: a.intervalo, formato: "moeda" as const })) };
    case "text_answer":
      return { ...base, aceitas: ["?"] };
    case "click_cell":
      return { ...base, celula: "A1" };
    case "select_range":
      return { ...base, intervalo: "A1" };
    case "multiple_choice": {
      const q = sem(base, "conferir");
      // Sem dica em nenhuma: a única alternativa sem dica seria a certa.
      return { ...q, correta: 0, opcoes: q.opcoes.map((o) => ({ texto: o.texto })) };
    }
    case "ferramenta": {
      // Só as células onde o aluno escreve (é o que a tela destaca), sem o valor esperado.
      const celulas: Verificacao[] = base.verificacoes.flatMap((v) => (v.tipo === "celula" ? [{ tipo: "celula" as const, celula: v.celula, esperado: 0 }] : []));
      return { ...base, verificacoes: celulas.length > 0 ? celulas : [{ tipo: "filtroAtivo" }], solucao: {} };
    }
  }
}

/** Sem as células da checagem anti-valor-digitado (diriam quais células importam). */
function semPerturbacao<G extends Exercicio["grade"]>(grade: G) {
  return sem(grade, "variaveis", "alternativas");
}

/** Cópia rasa sem as chaves pedidas (mantém a união de tipos de exercício separada por `type`). */
type Sem<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
function sem<T extends object, K extends keyof T>(obj: T, ...chaves: K[]): Sem<T, K> {
  const copia: Partial<T> = { ...obj };
  for (const k of chaves) delete copia[k];
  return copia as Sem<T, K>;
}

/**
 * O que o navegador manda de uma questão (o formato de RespostaQuestao).
 * Com limites: chega da internet (300 células de até 500 caracteres, os mesmos
 * da correção). `recursos` passa sem validar aqui: conferirQuestao valida campo
 * por campo, e um campo ruim não deve derrubar a questão inteira.
 */
export const respostaQuestaoSchema = z.object({
  conteudos: z.record(z.string().max(40), z.string().max(500)).refine((o) => Object.keys(o).length <= 300, "Células demais."),
  formatos: z
    .record(z.string().max(20), z.enum(["moeda", "percentual", "geral"]))
    .refine((o) => Object.keys(o).length <= 300, "Formatos demais.")
    .optional(),
  recursos: z.unknown().optional(),
  resposta: z.string().max(2000).optional(),
  ativa: z.string().max(20).optional(),
  selecao: z.string().max(20).optional(),
});

/** A resposta validada, no tipo da correção (os recursos são conferidos lá dentro). */
export const comoRespostaQuestao = (r: z.infer<typeof respostaQuestaoSchema>) => r as RespostaQuestao;
