import { exercicioSchema, type Exercicio } from "./schema";
import f1 from "./free/01-soma-total-de-vendas.json";
import f2 from "./free/02-media-minimo-maximo.json";
import f3 from "./free/03-operadores-lucro.json";
import f4 from "./free/04-variacao-percentual.json";
import f5 from "./free/05-referencia-absoluta-comissao.json";
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

/**
 * Só conteúdo GRÁTIS entra no bundle. O conteúdo pro (Fase 3) vem do
 * Supabase, protegido por RLS, e nunca é importado aqui.
 */
const brutos: unknown[] = [i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, f1, f2, f3, f4, f5];

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
    descricao: "SOMA, MÉDIA, MÍNIMO/MÁXIMO, operadores, variação % e referência absoluta.",
    permitePular: false,
    trofeu: {
      icone: "taca",
      descricao: "SOMA, MÉDIA, operadores e o famoso $ já estão no seu repertório.",
    },
  },
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

export function exerciciosDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo);
}

/** Próximo exercício do MESMO módulo (no fim do módulo, undefined). */
export function proximoExercicio(slug: string) {
  const ex = exercicioPorSlug(slug);
  if (!ex) return undefined;
  const lista = exerciciosDoModulo(ex.modulo);
  return lista[lista.findIndex((e) => e.slug === slug) + 1];
}

/** Módulo seguinte na trilha, com o primeiro exercício dele. */
export function proximoModulo(modulo: string) {
  const m = MODULOS[posicaoModulo(modulo) + 1];
  const primeiro = m && exerciciosDoModulo(m.slug)[0];
  return m && primeiro ? { modulo: m, primeiro } : undefined;
}
