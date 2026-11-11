import "server-only";
import { celulasDestacadas } from "@/content/destaque";
import type { Exercicio } from "@/content/schema";
import { colunaParaLetras, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { alinhamento } from "@/engine/format";

export type CelulaEstatica = {
  end: string;
  texto: string;
  alinh: "esquerda" | "direita" | "centro";
  negrito: boolean;
  alvo: boolean;
};

export type GradeMontada = { larguras: number[]; linhas: CelulaEstatica[][] };

/** Mesmas medidas da Grade interativa, para a troca na hidratação não pular. */
export const LARGURA_PADRAO = 96;
export const ALTURA = 26;
export const LARGURA_CABECALHO = 44;

/**
 * Monta no servidor a grade como o aluno a vê ao abrir o exercício (ou já
 * resolvida, para as páginas de solução). Roda o mesmo motor do navegador.
 */
export function montarGrade(ex: Exercicio, { comSolucao = false } = {}): GradeMontada {
  const p = Planilha.deExercicio(ex);
  const alvos = new Set(celulasDestacadas(ex));
  if (comSolucao && ex.type === "formula")
    p.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
  const linhas = Array.from({ length: p.linhas }, (_, l) =>
    Array.from({ length: p.colunas }, (_, c) => {
      const pos = { linha: l, coluna: c };
      const end = paraEndereco(pos);
      return { end, texto: p.exibicao(end), alinh: alinhamento(p.valor(pos)), negrito: p.negrito(end), alvo: alvos.has(end) };
    }),
  );
  const larguras = Array.from({ length: p.colunas }, (_, c) => ex.grade.larguras?.[colunaParaLetras(c)] ?? LARGURA_PADRAO);
  p.destruir();
  return { larguras, linhas };
}
