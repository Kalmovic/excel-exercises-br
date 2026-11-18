/**
 * Corrige de novo, no servidor, as respostas de um teste de módulo.
 *
 * Por quê: a nota do teste é calculada no navegador, e qualquer um pode
 * mandar "aprovado" pelo console. O certificado só é emitido se as respostas
 * (o que o aluno escreveu em cada célula) passarem nesta correção, feita com o
 * mesmo motor e o mesmo corretor do site, inclusive a checagem contra valor
 * digitado à mão.
 *
 * Função pura: sem navegador e sem banco.
 */
import { recursosSchema, type Exercicio, type Formato, type Recursos } from "@/content/schema";
import { deEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir } from "./corrigir";

/** O que o aluno deixou na tela em uma questão (o mesmo que o progresso guarda). */
export type RespostaQuestao = {
  conteudos: Record<string, string>;
  formatos?: Record<string, Formato>;
  recursos?: Recursos;
  resposta?: string;
  ativa?: string;
  selecao?: string;
};

const ENDERECO = /^[A-Z]{1,2}[1-9]\d{0,2}$/;
/** Célula do aluno, com ou sem a aba na frente ("Vendas!B2", "D'Ávila!B2"). A aba vai até o último "!". */
const ENDERECO_COM_ABA = /^(?:[^:\\/?*[\]]{1,31}!)?([A-Z]{1,2}[1-9]\d{0,2})$/;
const INTERVALO = /^[A-Z]{1,2}[1-9]\d{0,2}(:[A-Z]{1,2}[1-9]\d{0,2})?$/;
const INTERVALO_COM_ABA = /^(?:[^:\\/?*[\]]{1,31}!)?([A-Z]{1,2}[1-9]\d{0,2}(?::[A-Z]{1,2}[1-9]\d{0,2})?)$/;
const MAX_CELULAS = 300;
const MAX_TEXTO = 500;
const FORMATOS = new Set(["moeda", "percentual", "geral"]);

/** A grade da aba (a primeira, sem prefixo) onde fica o endereço; null se a aba não existe. */
function gradeDaAba(q: Exercicio, end: string): { linhas: number; colunas: number } | null {
  const i = end.lastIndexOf("!");
  if (i < 0) return q.grade;
  const nome = end.slice(0, i).replace(/^'(.*)'$/, "$1").toUpperCase();
  if ((q.grade.nome ?? "Planilha1").toUpperCase() === nome) return q.grade;
  return q.abas?.find((a) => a.nome.toUpperCase() === nome)?.grade ?? null;
}

/** O endereço (ou intervalo) cabe inteiro na grade da aba dele. */
function dentroDaGrade(q: Exercicio, end: string, padrao: RegExp): boolean {
  const m = padrao.exec(end);
  const g = m && gradeDaAba(q, end);
  if (!m || !g) return false;
  return m[1].split(":").every((parte) => {
    const p = deEndereco(parte);
    return p.linha < g.linhas && p.coluna < g.colunas;
  });
}

/**
 * Recursos validados de novo (o que chega da internet não é confiável). Se o
 * objeto inteiro não passa, aproveita os campos que passam sozinhos: um campo
 * ruim não apaga o filtro, a tabela dinâmica e as regras.
 */
function recursosValidos(bruto: unknown): Recursos {
  const inteiro = recursosSchema.safeParse(bruto ?? {});
  if (inteiro.success) return inteiro.data;
  if (bruto === null || typeof bruto !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(bruto)) {
    const um = recursosSchema.safeParse({ [k]: v });
    if (um.success) Object.assign(out, um.data);
  }
  return out as Recursos;
}

export function conferirQuestao(q: Exercicio, r: RespostaQuestao | undefined): boolean {
  if (!r) return false;
  try {
    const p = Planilha.deExercicio(q);
    // Só células dentro da grade da aba, com endereço e tamanho sãos (a entrada vem da internet).
    const conteudos = Object.fromEntries(
      Object.entries(r.conteudos ?? {})
        .filter(([end, texto]) => typeof texto === "string" && texto.length <= MAX_TEXTO && dentroDaGrade(q, end, ENDERECO_COM_ABA))
        .slice(0, MAX_CELULAS),
    );
    const formatos = Object.fromEntries(
      Object.entries(r.formatos ?? {})
        .filter(([end, f]) => typeof f === "string" && FORMATOS.has(f) && dentroDaGrade(q, end, INTERVALO_COM_ABA))
        .slice(0, MAX_CELULAS),
    ) as Record<string, Formato>;
    // O mesmo ponto único do Simulador: classificações, células, formatos e o resto dos recursos.
    p.restaurarProgresso({ conteudos, formatos, recursos: recursosValidos(r.recursos) });
    const ativa = r.ativa && ENDERECO.test(r.ativa) ? r.ativa : "A1";
    const selecao = r.selecao && INTERVALO.test(r.selecao) ? r.selecao : ativa;
    return corrigir(q, p, {
      ativa,
      selecao,
      resposta: typeof r.resposta === "string" ? r.resposta.slice(0, MAX_TEXTO) : "",
      mudancasPeloMouse: 0,
      // O servidor não sabe se foi com o mouse; o exercício "só teclado" não pesa no certificado.
      semTecladoFisico: true,
    }).ok;
  } catch {
    return false;
  }
}

/** Acertos de cada questão do teste, na ordem das questões. */
export function conferirTeste(questoes: Exercicio[], respostas: (RespostaQuestao | undefined)[]): boolean[] {
  return questoes.map((q, i) => conferirQuestao(q, respostas[i]));
}

