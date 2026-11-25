/**
 * Guia "Funções de A a Z" (/funcoes): uma página por função do catálogo do
 * simulador. Os textos ficam em funcoes.json; a assinatura e a descrição curta
 * vêm do catálogo (src/engine/catalogo.ts), para não haver duas versões.
 * Todo exemplo é conferido no motor (funcoes.test.ts): o resultado mostrado é
 * o que a planilha calcula.
 */
import { z } from "zod";
import { colunaParaLetras, deEndereco, paraEndereco } from "@/engine/address";
import { funcaoDoCatalogo } from "@/engine/catalogo";
import { Planilha } from "@/engine/engine";
import { funcoesUsadas } from "@/engine/formula";
import { exercicioPorSlug, exercicios, moduloPorSlug } from "./index";
import { formatoSchema, type Exercicio } from "./schema";
import { temPaginaDeExercicio } from "@/lib/acesso-conteudo";
import bruto from "./funcoes.json";

export const CATEGORIAS = [
  { slug: "fundamentos", titulo: "Fundamentos", modulo: "fundamentos" },
  { slug: "logica", titulo: "Lógica", modulo: "logica" },
  { slug: "condicionais", titulo: "Contar e somar com condição", modulo: "condicionais" },
  { slug: "busca", titulo: "Busca", modulo: "busca" },
  { slug: "texto", titulo: "Texto", modulo: "texto" },
  { slug: "datas", titulo: "Datas", modulo: "datas" },
  { slug: "arrays", titulo: "Arrays dinâmicos", modulo: "arrays" },
  { slug: "financas", titulo: "Finanças", modulo: "casos" },
] as const;

export type CategoriaFuncao = (typeof CATEGORIAS)[number]["slug"];

const endereco = z.string().regex(/^[A-Z][1-9]\d*$/, "Endereço no formato A1");

const exemploSchema = z.object({
  /** A pergunta que o exemplo responde, como numa situação de escritório. */
  situacao: z.string().min(10),
  /** As células a partir de A1, como se digitam ("R$ 1.200,00", "15/03/2026", "=A2/B2"). A linha 1 é o cabeçalho. */
  dados: z.array(z.array(z.string())).min(1).max(12),
  /** Onde a fórmula vai. */
  celula: endereco,
  formula: z.string().startsWith("="),
  /** Formato da célula da fórmula (como no Excel, quando o resultado não herda o formato). */
  formato: formatoSchema.optional(),
  /** Data e hora fixas para HOJE() e AGORA() ("2026-03-10T09:00:00", horário local). */
  hoje: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/).optional(),
  /** O que a célula mostra. Com array dinâmico, as linhas e colunas do resultado derramado. */
  resultado: z.union([z.string(), z.array(z.array(z.string()).min(1)).min(1)]),
  explicacao: z.string().min(10),
});

const funcaoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  ingles: z.string().min(1),
  categoria: z.enum(CATEGORIAS.map((c) => c.slug) as [CategoriaFuncao, ...CategoriaFuncao[]]),
  paraQueServe: z.string().min(40),
  argumentos: z.array(z.object({ nome: z.string().min(1), opcional: z.boolean().optional(), explicacao: z.string().min(5) })),
  exemplo: exemploSchema,
  cuidados: z.array(z.string().min(10)).min(1).max(3),
  relacionadas: z.array(z.string()).min(1).max(5),
});

export type Exemplo = z.infer<typeof exemploSchema>;
export type FuncaoGuia = z.infer<typeof funcaoSchema> & {
  /** Como o Excel mostra ao digitar: PROCV(valor_procurado; matriz_tabela; …). */
  assinatura: string;
  /** Uma linha, do catálogo do simulador. */
  descricao: string;
};

/** Na ordem do catálogo (por categoria). */
export const FUNCOES_DO_CATALOGO: FuncaoGuia[] = z
  .array(funcaoSchema)
  .parse(bruto)
  .map((f) => {
    const c = funcaoDoCatalogo(f.nome);
    if (!c) throw new Error(`Função fora do catálogo: ${f.nome}`);
    return { ...f, assinatura: `${c.nome}(${c.args.join("; ")})`, descricao: c.desc };
  });

/** Em ordem alfabética, como no índice. */
export const FUNCOES: FuncaoGuia[] = [...FUNCOES_DO_CATALOGO].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

export const funcaoPorSlug = (slug: string) => FUNCOES.find((f) => f.slug === slug);

export const categoriaPorSlug = (slug: string) => CATEGORIAS.find((c) => c.slug === slug)!;

/** Letra do índice A–Z: sem acento (ÉNÚM fica no E, ÚNICO no U). */
export const letraDe = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "")[0].toUpperCase();

// --- exemplo ---------------------------------------------------------------

/** Linhas e colunas do resultado (1 × 1 para um valor só). */
const tamanhoResultado = (ex: Exemplo) =>
  typeof ex.resultado === "string" ? { linhas: 1, colunas: 1 } : { linhas: ex.resultado.length, colunas: Math.max(...ex.resultado.map((l) => l.length)) };

/** Até onde vai a grade do exemplo: os dados e a fórmula com o que ela derrama. */
export function dimensoesDoExemplo(ex: Exemplo) {
  const p = deEndereco(ex.celula);
  const r = tamanhoResultado(ex);
  return {
    linhas: Math.max(ex.dados.length, p.linha + r.linhas),
    colunas: Math.max(...ex.dados.map((l) => l.length), p.coluna + r.colunas),
  };
}

/** A planilha do exemplo, com os dados e a fórmula já digitada. Lança erro se a fórmula não for aceita. */
export function planilhaDoExemplo(ex: Exemplo): Planilha {
  const { linhas, colunas } = dimensoesDoExemplo(ex);
  const celulas: Record<string, { entrada: string }> = {};
  ex.dados.forEach((linha, l) =>
    linha.forEach((entrada, c) => {
      if (entrada !== "") celulas[paraEndereco({ linha: l, coluna: c })] = { entrada };
    }),
  );
  const p = new Planilha({ linhas: linhas + 1, colunas: colunas + 1, celulas }, { formatos: ex.formato ? { [ex.celula]: ex.formato } : {} });
  const r = p.definir(ex.celula, ex.formula);
  if (!r.ok) throw new Error(`Fórmula recusada em ${ex.celula}: ${ex.formula}`);
  return p;
}

/** As células do resultado, com o que cada uma mostra (endereço → texto). */
export function celulasDoResultado(ex: Exemplo): Map<string, string> {
  const p = deEndereco(ex.celula);
  const linhas = typeof ex.resultado === "string" ? [[ex.resultado]] : ex.resultado;
  const m = new Map<string, string>();
  linhas.forEach((linha, l) => linha.forEach((t, c) => m.set(paraEndereco({ linha: p.linha + l, coluna: p.coluna + c }), t)));
  return m;
}

export type CelulaDaGrade = { endereco: string; texto: string; tipo: "cabecalho" | "dado" | "resultado" | "vazia"; numero: boolean };

const pareceNumero = (t: string) => /^-?(R\$\s?)?[\d.]+(,\d+)?%?$|^\d{2}\/\d{2}\/\d{4}$|^\d{1,2}:\d{2}$/.test(t.trim());

/**
 * A grade para mostrar na página: os dados (com o que a célula mostra, pelo
 * motor) e o resultado da fórmula (o do JSON, que o teste confere no motor;
 * assim HOJE() mostra o dia combinado no exemplo, não o do build).
 */
export function gradeDoExemplo(ex: Exemplo) {
  const { linhas, colunas } = dimensoesDoExemplo(ex);
  const p = planilhaDoExemplo(ex);
  const resultado = celulasDoResultado(ex);
  return {
    colunas: Array.from({ length: colunas }, (_, c) => colunaParaLetras(c)),
    linhas: Array.from({ length: linhas }, (_, l) =>
      Array.from({ length: colunas }, (_, c): CelulaDaGrade => {
        const end = paraEndereco({ linha: l, coluna: c });
        const doResultado = resultado.get(end);
        if (doResultado !== undefined) return { endereco: end, texto: doResultado, tipo: "resultado", numero: pareceNumero(doResultado) };
        const entrada = ex.dados[l]?.[c] ?? "";
        if (entrada === "") return { endereco: end, texto: "", tipo: "vazia", numero: false };
        const texto = p.exibicao(end);
        return { endereco: end, texto, tipo: l === 0 ? "cabecalho" : "dado", numero: l > 0 && typeof p.valor(end) === "number" };
      }),
    ),
  };
}

// --- pratique ----------------------------------------------------------------

/** As fórmulas da solução de um exercício (alvos ou células da solução). */
export function formulasDaSolucao(e: Exercicio): string[] {
  if (e.type === "formula") return e.alvos.map((a) => a.solucaoReferencia);
  if (e.type === "ferramenta") return Object.values(e.solucao.celulas ?? {}).filter((f) => f.startsWith("="));
  return [];
}

export type Pratica = { slug: string; titulo: string; modulo: string; gratis: boolean; extra: boolean };

const posicao = new Map(exercicios.map((e, i) => [e.slug, i]));

/**
 * Lições e exercícios da trilha cuja solução usa a função. Uma questão de
 * lição leva à lição (a questão principal). Primeiro o que é grátis, depois a
 * trilha principal antes da prática extra, e na ordem da trilha.
 */
export function praticasDaFuncao(f: Pick<FuncaoGuia, "ingles">, limite = 4): Pratica[] {
  const destinos = new Map<string, Exercicio>();
  for (const e of exercicios) {
    if (!temPaginaDeExercicio(e)) continue;
    if (!formulasDaSolucao(e).some((formula) => funcoesUsadas(formula).includes(f.ingles))) continue;
    const destino = e.licao ? exercicioPorSlug(e.licao) : e;
    if (destino && temPaginaDeExercicio(destino) && !destinos.has(destino.slug)) destinos.set(destino.slug, destino);
  }
  return [...destinos.values()]
    .sort(
      (a, b) =>
        Number(a.plano !== "free") - Number(b.plano !== "free") ||
        Number(!!a.extra) - Number(!!b.extra) ||
        (posicao.get(a.slug) ?? 0) - (posicao.get(b.slug) ?? 0),
    )
    .slice(0, limite)
    .map((e) => {
      const m = moduloPorSlug(e.modulo);
      return {
        slug: e.slug,
        titulo: e.titulo,
        modulo: m ? `Módulo ${m.numero}: ${m.titulo}` : e.modulo,
        gratis: e.plano === "free",
        extra: !!e.extra,
      };
    });
}
