import { exercicioSchema, type Exercicio } from "./schema";
import i1 from "./free/intro/01-nome-da-celula.json";
import i2 from "./free/intro/02-clicar-em-uma-celula.json";
import i3 from "./free/intro/03-navegar-pelo-teclado.json";
import i4 from "./free/intro/04-selecionar-intervalo.json";
import i5 from "./free/intro/05-digitar-um-valor.json";
import i6 from "./free/intro/06-editar-uma-celula.json";
import i7 from "./free/intro/07-ler-a-barra-de-formulas.json";
import i8 from "./free/intro/08-primeira-formula.json";
import i9 from "./free/intro/09-formato-moeda.json";
import i10 from "./free/intro/10-formato-porcentagem.json";
import demo from "./free/demo/soma-gastos.json";
import mFundamentos from "./modulos/fundamentos.json";
import mLogica from "./modulos/logica.json";
import mCondicionais from "./modulos/condicionais.json";
import mBusca from "./modulos/busca.json";
import mTexto from "./modulos/texto.json";
import mDatas from "./modulos/datas.json";
import mArrays from "./modulos/arrays.json";
import mCasos from "./modulos/casos.json";
import xFundamentos from "./extras/fundamentos.json";
import xLogica from "./extras/logica.json";
import xCondicionais from "./extras/condicionais.json";
import xBusca from "./extras/busca.json";
import xTexto from "./extras/texto.json";
import xDatas from "./extras/datas.json";
import xArrays from "./extras/arrays.json";
import xCasos from "./extras/casos.json";

/**
 * Os exercícios só chegam ao navegador um por página (as páginas são de
 * servidor). Na Fase 3, o conteúdo Pro sai daqui e passa a vir do banco,
 * protegido por RLS; ver `exercicioLiberado` em `src/lib/acesso-conteudo.ts`.
 */
const brutos: unknown[] = [
  ...[i1, i2, i3, i4, i5, i6, i7, i8, i9, i10],
  ...mFundamentos,
  ...mLogica,
  ...mCondicionais,
  ...mBusca,
  ...mTexto,
  ...mDatas,
  ...mArrays,
  ...mCasos,
  // prática extra (Pro): fora da trilha principal, listada no fim de cada módulo
  ...[xFundamentos, xLogica, xCondicionais, xBusca, xTexto, xDatas, xArrays, xCasos].flat(),
];

/** Módulo da trilha (exceto Intro e Fundamentos) com o troféu padrão. */
const modulo = (numero: number, slug: string, titulo: string, descricao: string, trofeu: string): Modulo => ({
  slug,
  numero,
  titulo,
  descricao,
  permitePular: false,
  trofeu: { icone: "taca", descricao: trofeu },
});

export type Modulo = {
  slug: string;
  /** Número exibido ("Módulo 0"). A ordem da trilha segue a ordem deste array. */
  numero: number;
  titulo: string;
  descricao: string;
  /** Mostra o botão "Pular questão". */
  permitePular: boolean;
  trofeu: { icone: "medalha" | "taca"; descricao: string };
};

export const MODULOS: readonly Modulo[] = [
  {
    slug: "intro",
    numero: 0,
    titulo: "Intro",
    descricao: "Para quem nunca abriu uma planilha: células, seleção, edição, barra de fórmulas e formatação.",
    permitePular: true,
    trofeu: {
      icone: "medalha",
      descricao:
        "Células, intervalos, edição, a barra de fórmulas e sua primeira fórmula: o básico está feito. Próxima parada: Fundamentos.",
    },
  },
  {
    slug: "fundamentos",
    numero: 1,
    titulo: "Fundamentos",
    descricao: "SOMA, MÉDIA, MÍNIMO/MÁXIMO, operadores, porcentagem, ARRED e o famoso $.",
    permitePular: false,
    trofeu: {
      icone: "taca",
      descricao: "SOMA, MÉDIA, operadores e o famoso $ já estão no seu repertório.",
    },
  },
  modulo(2, "logica", "Lógica", "SE, E, OU, SES e SEERRO: a planilha que toma decisões.", "Sua planilha agora decide sozinha: SE, E, OU, SES e SEERRO."),
  modulo(3, "condicionais", "Contar e somar com condição", "CONT.SE, SOMASE, SOMASES, MÉDIASE e companhia.", "Contar e somar só o que importa: CONT.SE, SOMASE e as versões com várias condições."),
  modulo(4, "busca", "Busca", "PROCV, PROCH, ÍNDICE + CORRESP e PROCX.", "PROCV, ÍNDICE + CORRESP e PROCX: você encontra qualquer coisa numa tabela."),
  modulo(5, "texto", "Texto", "Juntar, cortar e limpar textos: ESQUERDA, EXT.TEXTO, ARRUMAR, SUBSTITUIR.", "Juntar, cortar e limpar textos: dados bagunçados não te assustam mais."),
  modulo(6, "datas", "Datas", "Diferença entre datas, DATA, DATADIF, dias úteis, FIMMÊS e DATAM.", "Prazos, idades, dias úteis e vencimentos, tudo calculado."),
  modulo(7, "arrays", "Arrays dinâmicos", "FILTRO, CLASSIFICAR, ÚNICO e SEQUÊNCIA: uma fórmula, muitos resultados.", "FILTRO, CLASSIFICAR e ÚNICO: o Excel moderno já é seu."),
  modulo(8, "casos", "Casos reais", "Financiamento, ranking, estoque, comissão, orçamento e boletim.", "Trilha completa! Você resolve problemas reais de planilha do começo ao fim."),
];

const posicaoModulo = (slug: string) => {
  const i = MODULOS.findIndex((m) => m.slug === slug);
  return i === -1 ? MODULOS.length : i;
};

/** Ordem da trilha: módulo (na ordem de MODULOS) e depois `ordem` dentro do módulo. */
export const exercicios: Exercicio[] = brutos
  .map((b) => exercicioSchema.parse(b))
  .sort((a, b) => posicaoModulo(a.modulo) - posicaoModulo(b.modulo) || a.ordem - b.ordem);

/** Exercício da landing ("Experimente agora"). Fora da trilha e do sitemap. */
export const exercicioDemo: Exercicio = exercicioSchema.parse(demo);

export function exercicioPorSlug(slug: string) {
  return exercicios.find((e) => e.slug === slug);
}

export function moduloPorSlug(slug: string) {
  return MODULOS.find((m) => m.slug === slug);
}

/** Trilha principal do módulo (sem a prática extra). Define progresso, "próximo" e troféu. */
export function exerciciosDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo && !e.extra);
}

/** Prática extra do módulo (Pro). */
export function extrasDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo && e.extra);
}

/** A trilha inteira, sem a prática extra. */
export const exerciciosDaTrilha = () => exercicios.filter((e) => !e.extra);

/** Próximo exercício do MESMO módulo (no fim do módulo, undefined). */
export function proximoExercicio(slug: string) {
  const ex = exercicioPorSlug(slug);
  if (!ex) return undefined;
  const lista = ex.extra ? extrasDoModulo(ex.modulo) : exerciciosDoModulo(ex.modulo);
  return lista[lista.findIndex((e) => e.slug === slug) + 1];
}

/** Módulo seguinte na trilha, com o primeiro exercício dele. */
export function proximoModulo(modulo: string) {
  const m = MODULOS[posicaoModulo(modulo) + 1];
  const primeiro = m && exerciciosDoModulo(m.slug)[0];
  return m && primeiro ? { modulo: m, primeiro } : undefined;
}
