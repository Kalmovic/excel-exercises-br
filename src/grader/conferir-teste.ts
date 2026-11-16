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
import type { Exercicio, Formato } from "@/content/schema";
import { deIntervalo } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir } from "./corrigir";

/** O que o aluno deixou na tela em uma questão (o mesmo que o progresso guarda). */
export type RespostaQuestao = {
  conteudos: Record<string, string>;
  formatos?: Record<string, Formato>;
  resposta?: string;
  ativa?: string;
  selecao?: string;
};

const ENDERECO = /^[A-Z]{1,2}[1-9]\d{0,2}$/;
const INTERVALO = /^[A-Z]{1,2}[1-9]\d{0,2}(:[A-Z]{1,2}[1-9]\d{0,2})?$/;
const MAX_CELULAS = 300;
const MAX_TEXTO = 500;

export function conferirQuestao(q: Exercicio, r: RespostaQuestao | undefined): boolean {
  if (!r) return false;
  try {
    const p = Planilha.deExercicio(q);
    // Só células que o aluno pode editar, com endereço e tamanho sãos (entrada vem da internet).
    const entradas = Object.entries(r.conteudos ?? {})
      .filter(([end, texto]) => ENDERECO.test(end) && typeof texto === "string" && texto.length <= MAX_TEXTO && !p.bloqueada(end))
      .slice(0, MAX_CELULAS);
    p.definirVarias(entradas.map(([endereco, bruto]) => ({ endereco, bruto })));
    for (const [end, f] of Object.entries(r.formatos ?? {}).slice(0, MAX_CELULAS))
      if (INTERVALO.test(end) && (f === "moeda" || f === "percentual" || f === "geral")) p.formatar(deIntervalo(end), f);
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
