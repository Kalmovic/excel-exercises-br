/**
 * Tabela dinâmica: da configuração (as quatro áreas do painel) para as células
 * que aparecem na grade. Função pura: recebe como ler a origem e devolve a
 * saída relativa ao destino. Quem escreve na planilha é a `Planilha`.
 *
 * Layout como o Excel em português (formato compacto, um campo por área):
 *
 *   Região   (Tudo)            ← um por campo em Filtros, e uma linha em branco
 *
 *   Soma de Valor  Rótulos de Coluna
 *   Rótulos de Linha  Loja  Site  Total Geral
 *   Leste           …     …     …
 *   Total Geral     …     …     …
 */
import type { Dinamica, FuncaoValor } from "@/content/schema";
import { letrasParaColuna, type Intervalo } from "./address";
import { compararParaClassificar } from "./classificar";
import type { ValorCelula } from "./format";

export type CelulaDinamica = {
  dl: number;
  dc: number;
  valor: ValorCelula;
  negrito?: boolean;
  /** Letra do campo de origem cujo formato (R$, %, data) a célula herda. */
  formatoDe?: string;
};

export type SaidaDinamica = { celulas: CelulaDinamica[]; altura: number; largura: number; vazia: boolean };

export type LeitorOrigem = {
  valor: (linha: number, coluna: number) => ValorCelula;
  /** O texto como aparece na célula (agrupa e filtra por ele, como o Excel). */
  texto: (linha: number, coluna: number) => string;
};

export const NOMES_FUNCAO: Record<FuncaoValor, string> = {
  soma: "Soma",
  contagem: "Contagem",
  media: "Média",
  max: "Máx.",
  min: "Mín.",
};

export const ROTULO_LINHA = "Rótulos de Linha";
export const ROTULO_COLUNA = "Rótulos de Coluna";
export const TOTAL_GERAL = "Total Geral";
export const VAZIO = "(vazio)";
export const TUDO = "(Tudo)";
export const VARIOS = "(Vários itens)";

/** "Soma de Valor": o rótulo do campo em Valores. */
export const rotuloValor = (funcao: FuncaoValor, nomeCampo: string) => `${NOMES_FUNCAO[funcao]} de ${nomeCampo}`;

/** Tamanho do quadro vazio que o Excel mostra antes de escolher os campos. */
export const PLACEHOLDER = { altura: 6, largura: 3 };

function agregar(funcao: FuncaoValor, vs: ValorCelula[]): ValorCelula {
  if (funcao === "contagem") return vs.filter((v) => v !== null && v !== "").length;
  const ns = vs.filter((v): v is number => typeof v === "number");
  if (funcao === "soma") return ns.reduce((a, b) => a + b, 0);
  if (ns.length === 0) return funcao === "media" ? { erro: "#DIV/0!" } : 0;
  if (funcao === "media") return ns.reduce((a, b) => a + b, 0) / ns.length;
  return funcao === "max" ? Math.max(...ns) : Math.min(...ns);
}

type Item = { chave: string; valor: ValorCelula };

export function calcularDinamica(d: Dinamica, origem: Intervalo, nomes: Record<string, string>, ler: LeitorOrigem): SaidaDinamica {
  const col = (letra: string) => letrasParaColuna(letra);
  const chaveDe = (l: number, letra: string) => ler.texto(l, col(letra));

  // Linhas de dados (sem o cabeçalho) que passam nos filtros.
  const linhas: number[] = [];
  for (let l = origem.inicio.linha + 1; l <= origem.fim.linha; l++) {
    const passa = d.filtros.every((f) => f.valores === null || f.valores.includes(chaveDe(l, f.campo)));
    if (passa) linhas.push(l);
  }

  // Itens de um campo: textos distintos, na ordem de classificação do Excel; vazio vira "(vazio)" no fim.
  const itens = (letra: string): Item[] => {
    const vistos = new Map<string, ValorCelula>();
    for (const l of linhas) {
      const k = chaveDe(l, letra);
      if (!vistos.has(k)) vistos.set(k, ler.valor(l, col(letra)));
    }
    return [...vistos.entries()]
      .sort((a, b) => compararParaClassificar(a[1], b[1]))
      .map(([chave, valor]) => ({ chave, valor: chave === "" ? VAZIO : valor }));
  };

  const celulas: CelulaDinamica[] = [];
  const por = (dl: number, dc: number, valor: ValorCelula, extra: Partial<CelulaDinamica> = {}) => {
    celulas.push({ dl, dc, valor, ...extra });
  };

  // Área de Filtros, em cima.
  d.filtros.forEach((f, i) => {
    por(i, 0, nomes[f.campo] ?? f.campo, { negrito: true });
    por(i, 1, f.valores === null ? TUDO : f.valores.length === 1 ? f.valores[0] || VAZIO : VARIOS);
  });
  const topo = d.filtros.length ? d.filtros.length + 1 : 0;

  const linhaCampo = d.linhas[0];
  const colunaCampo = d.colunas[0];
  if (!linhaCampo && !colunaCampo && d.valores.length === 0) {
    // Nada escolhido ainda: só o quadro (desenhado pela grade), sem células.
    return { celulas, altura: topo + PLACEHOLDER.altura, largura: Math.max(PLACEHOLDER.largura, d.filtros.length ? 2 : 0), vazia: true };
  }

  const valoresDe = (ls: number[], letra: string) => ls.map((l) => ler.valor(l, col(letra)));
  const conta = (ls: number[], v: Dinamica["valores"][number]) => agregar(v.funcao, valoresDe(ls, v.campo));
  const formatoDoValor = (v: Dinamica["valores"][number]) => (v.funcao === "contagem" ? undefined : v.campo);
  const doItem = (letra: string, item: Item) => (l: number) => chaveDe(l, letra) === (item.valor === VAZIO ? "" : item.chave);

  if (!colunaCampo) {
    // Uma coluna por campo em Valores; uma linha por item do campo em Linhas.
    const rot = d.valores.map((v) => rotuloValor(v.funcao, nomes[v.campo] ?? v.campo));
    if (!linhaCampo) {
      rot.forEach((r, j) => {
        por(topo, j, r, { negrito: true });
        por(topo + 1, j, conta(linhas, d.valores[j]), { formatoDe: formatoDoValor(d.valores[j]) });
      });
      return { celulas, altura: topo + 2, largura: Math.max(rot.length, d.filtros.length ? 2 : 0), vazia: false };
    }
    por(topo, 0, ROTULO_LINHA, { negrito: true });
    rot.forEach((r, j) => por(topo, j + 1, r, { negrito: true }));
    const lista = itens(linhaCampo);
    lista.forEach((item, i) => {
      por(topo + 1 + i, 0, item.valor, { formatoDe: linhaCampo });
      const ls = linhas.filter(doItem(linhaCampo, item));
      d.valores.forEach((v, j) => por(topo + 1 + i, j + 1, conta(ls, v), { formatoDe: formatoDoValor(v) }));
    });
    let altura = topo + 1 + lista.length;
    if (d.valores.length) {
      por(altura, 0, TOTAL_GERAL, { negrito: true });
      d.valores.forEach((v, j) => por(altura, j + 1, conta(linhas, v), { negrito: true, formatoDe: formatoDoValor(v) }));
      altura++;
    }
    return { celulas, altura, largura: Math.max(1 + d.valores.length, d.filtros.length ? 2 : 0), vazia: false };
  }

  // Com campo em Colunas: tabela cruzada (um valor só).
  const v = d.valores[0];
  const colunasItens = itens(colunaCampo);
  const largura = 1 + colunasItens.length + 1;
  if (v && linhaCampo) por(topo, 0, rotuloValor(v.funcao, nomes[v.campo] ?? v.campo), { negrito: true });
  por(topo, 1, ROTULO_COLUNA, { negrito: true });
  if (linhaCampo) por(topo + 1, 0, ROTULO_LINHA, { negrito: true });
  colunasItens.forEach((c, j) => por(topo + 1, 1 + j, c.valor, { negrito: true, formatoDe: colunaCampo }));
  por(topo + 1, largura - 1, TOTAL_GERAL, { negrito: true });
  const daColuna = colunasItens.map((c) => linhas.filter(doItem(colunaCampo, c)));
  const celula = (ls: number[]) => (v ? (ls.length ? conta(ls, v) : null) : null);

  if (!linhaCampo) {
    if (v) {
      por(topo + 2, 0, rotuloValor(v.funcao, nomes[v.campo] ?? v.campo), { negrito: true });
      daColuna.forEach((ls, j) => por(topo + 2, 1 + j, celula(ls), { formatoDe: formatoDoValor(v) }));
      por(topo + 2, largura - 1, celula(linhas), { negrito: true, formatoDe: formatoDoValor(v) });
    }
    return { celulas, altura: topo + (v ? 3 : 2), largura, vazia: false };
  }

  const lista = itens(linhaCampo);
  lista.forEach((item, i) => {
    const r = topo + 2 + i;
    const daLinha = linhas.filter(doItem(linhaCampo, item));
    por(r, 0, item.valor, { formatoDe: linhaCampo });
    daColuna.forEach((ls, j) => por(r, 1 + j, celula(ls.filter((l) => daLinha.includes(l))), { formatoDe: v && formatoDoValor(v) }));
    por(r, largura - 1, celula(daLinha), { negrito: true, formatoDe: v && formatoDoValor(v) });
  });
  const ultima = topo + 2 + lista.length;
  por(ultima, 0, TOTAL_GERAL, { negrito: true });
  daColuna.forEach((ls, j) => por(ultima, 1 + j, celula(ls), { negrito: true, formatoDe: v && formatoDoValor(v) }));
  por(ultima, largura - 1, celula(linhas), { negrito: true, formatoDe: v && formatoDoValor(v) });
  return { celulas, altura: ultima + 1, largura, vazia: false };
}
