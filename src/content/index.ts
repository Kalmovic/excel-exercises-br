import { chaveProgresso, type LicaoDoExercicio } from "./licao";
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
import iTeste from "./free/intro/teste.json";
import demo from "./free/demo/soma-gastos.json";
import mFundamentos from "./modulos/fundamentos.json";
import mLogica from "./modulos/logica.json";
import mCondicionais from "./modulos/condicionais.json";
import mBusca from "./modulos/busca.json";
import mTexto from "./modulos/texto.json";
import mDatas from "./modulos/datas.json";
import mArrays from "./modulos/arrays.json";
import mDados from "./modulos/dados.json";
import mDinamica from "./modulos/dinamica.json";
import mDestaque from "./modulos/destaque.json";
import mGraficos from "./modulos/graficos.json";
import mValidacao from "./modulos/validacao.json";
import mAbas from "./modulos/abas.json";
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
  ...[i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, ...iTeste],
  ...mFundamentos,
  ...mLogica,
  ...mCondicionais,
  ...mBusca,
  ...mTexto,
  ...mDatas,
  ...mArrays,
  ...mDados,
  ...mDinamica,
  ...mDestaque,
  ...mGraficos,
  ...mValidacao,
  ...mAbas,
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
    descricao: "SOMA, MÉDIA, MÍNIMO/MÁXIMO, operadores, porcentagem, o famoso $, ARRED e SOMARPRODUTO.",
    permitePular: false,
    trofeu: {
      icone: "taca",
      descricao: "SOMA, MÉDIA, operadores e o famoso $ já estão no seu repertório.",
    },
  },
  modulo(2, "logica", "Lógica", "SE, E, OU, NÃO, SES e SEERRO: prazos, reembolsos, honorários e regras de cliente, com a planilha tomando as decisões.", "Sua planilha agora decide sozinha: SE, E, OU, NÃO, SES e SEERRO."),
  modulo(3, "condicionais", "Contar e somar com condição", "CONT.SE, SOMASE, SOMASES, MÉDIASE e MÁXIMOSES, com curingas, períodos de datas e o relatório do mês.", "Contar e somar só o que importa: CONT.SE, SOMASE e as versões com várias condições."),
  modulo(4, "busca", "Busca", "PROCV, PROCH, ÍNDICE + CORRESP e PROCX: faixas, duas condições, o registro mais recente e a conferência de cadastro.", "PROCV, ÍNDICE + CORRESP e PROCX: você encontra qualquer coisa numa tabela."),
  modulo(5, "texto", "Texto", "Juntar, cortar e limpar textos: ESQUERDA, EXT.TEXTO, LOCALIZAR, ARRUMAR, SUBSTITUIR e TEXTO.", "Juntar, cortar e limpar textos: dados bagunçados não te assustam mais."),
  modulo(6, "datas", "Datas", "HOJE, DATADIF, FIMMÊS e DATAM, dia da semana, prazos em dias úteis e horas trabalhadas: prazos, vencimentos e banco de horas.", "Prazos, idades, dias úteis e vencimentos, tudo calculado."),
  modulo(7, "arrays", "Arrays dinâmicos", "FILTRO, CLASSIFICAR e ÚNICO: uma fórmula, muitos resultados.", "FILTRO, CLASSIFICAR e ÚNICO: o Excel moderno já é seu."),
  modulo(8, "dados", "Organizar dados", "Classificar, filtrar e SUBTOTAL: arrumar e resumir a tabela direto na grade.", "Classificar, filtrar e somar só o que aparece: a tabela fica do jeito que você precisa."),
  modulo(9, "dinamica", "Tabela dinâmica", "Resumir uma tabela inteira arrastando campos: totais, contagens, médias, tabelas cruzadas, filtros, % do total e PROCV em cima do resumo.", "Tabela dinâmica dominada: você resume qualquer base de dados em segundos."),
  modulo(10, "destaque", "Formatação condicional", "A planilha que aponta o problema: realçar valores, duplicados, a linha inteira com fórmula (E, OU), escala de cor, barras e a ordem das regras.", "Formatação condicional dominada: sua planilha mostra sozinha o que importa."),
  modulo(11, "graficos", "Gráficos", "Colunas, linhas, barras e pizza: escolher o gráfico certo, título, rótulos e as pegadinhas de como o Excel lê os dados.", "Gráficos dominados: você escolhe o tipo certo e evita as armadilhas do Excel."),
  modulo(12, "validacao", "Validação de dados", "Listas suspensas, números e datas dentro da regra, mensagens e como achar o que já estava errado.", "Validação de dados dominada: sua planilha só aceita o que faz sentido."),
  modulo(13, "abas", "Várias abas", "Fórmulas que leem outras abas: somar, buscar com PROCV e SOMASE, montar o resumo do trimestre, consolidar por categoria e conferir uma lista contra a outra.", "Várias abas dominadas: sua planilha cresce sem virar bagunça."),
  modulo(14, "casos", "Casos reais", "Comissão por faixa, controle de estoque, parcelamento com PGTO, multa e juros de boleto atrasado e o desconto do INSS.", "Trilha completa! Você resolve problemas reais de planilha do começo ao fim."),
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

/** Casa da trilha: exercício avulso (Intro) ou a questão principal de uma lição. */
const ehCasa = (e: Exercicio) => !e.extra && !e.teste && (!e.etapa || e.etapa === 1);

/** Trilha principal do módulo (lições, sem a prática extra nem o teste). Define progresso, "próximo" e troféu. */
export function exerciciosDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo && ehCasa(e));
}

/** As questões de uma lição, na ordem (1 = principal … 5 = múltipla escolha). */
export function questoesDaLicao(licao: string) {
  return exercicios.filter((e) => e.licao === licao && !e.teste).sort((a, b) => (a.etapa ?? 0) - (b.etapa ?? 0));
}

/** Dados da lição para o simulador marcar "lição concluída" (undefined fora de lição). */
export function licaoDoExercicio(ex: Exercicio): LicaoDoExercicio | undefined {
  if (!ex.licao) return undefined;
  const partes = questoesDaLicao(ex.licao);
  const principal = partes[0];
  return { slug: ex.licao, versao: principal.versao, partes: partes.map((q) => ({ chave: chaveProgresso(q), versao: q.versao })) };
}

/** As 5 questões do teste do módulo. */
export function testeDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo && e.teste).sort((a, b) => a.ordem - b.ordem);
}

/** Prática extra do módulo (Pro). */
export function extrasDoModulo(modulo: string) {
  return exercicios.filter((e) => e.modulo === modulo && e.extra);
}

/** A trilha inteira: uma casa por lição, sem a prática extra nem os testes. */
export const exerciciosDaTrilha = () => exercicios.filter(ehCasa);

/** Próximo exercício do MESMO módulo (no fim do módulo, undefined). */
export function proximoExercicio(slug: string) {
  const ex = exercicioPorSlug(slug);
  if (!ex) return undefined;
  if (ex.licao) {
    // Dentro da lição: a próxima questão; depois da última, a próxima lição.
    const questoes = questoesDaLicao(ex.licao);
    const seguinte = questoes[questoes.findIndex((e) => e.slug === slug) + 1];
    if (seguinte) return seguinte;
    const casas = exerciciosDoModulo(ex.modulo);
    return casas[casas.findIndex((e) => e.slug === ex.licao) + 1];
  }
  const lista = ex.extra ? extrasDoModulo(ex.modulo) : exerciciosDoModulo(ex.modulo);
  return lista[lista.findIndex((e) => e.slug === slug) + 1];
}

/** Módulo seguinte na trilha, com o primeiro exercício dele. */
export function proximoModulo(modulo: string) {
  const m = MODULOS[posicaoModulo(modulo) + 1];
  const primeiro = m && exerciciosDoModulo(m.slug)[0];
  return m && primeiro ? { modulo: m, primeiro } : undefined;
}
