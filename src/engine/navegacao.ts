import type { Pos } from "./address";

/**
 * Ctrl+seta, como no Excel: dentro de um bloco de dados vai até a última
 * célula preenchida; de uma célula vazia (ou da borda do bloco) salta até a
 * próxima preenchida; sem nada pela frente, vai até a borda da planilha.
 */
export function ateABorda(
  p: Pos,
  dl: number,
  dc: number,
  preenchida: (p: Pos) => boolean,
  linhas: number,
  colunas: number,
): Pos {
  const dentro = (q: Pos) => q.linha >= 0 && q.linha < linhas && q.coluna >= 0 && q.coluna < colunas;
  const passo = (q: Pos) => ({ linha: q.linha + dl, coluna: q.coluna + dc });
  let atual = p;
  let prox = passo(atual);
  if (!dentro(prox)) return atual;
  if (preenchida(atual) && preenchida(prox)) {
    // anda pelo bloco até a última preenchida
    while (dentro(prox) && preenchida(prox)) {
      atual = prox;
      prox = passo(atual);
    }
    return atual;
  }
  // salta as vazias até a próxima preenchida (ou a borda)
  while (dentro(prox)) {
    atual = prox;
    if (preenchida(atual)) return atual;
    prox = passo(atual);
  }
  return atual;
}

/** Última linha e última coluna com conteúdo (Ctrl+End). */
export function ultimaUsada(preenchida: (p: Pos) => boolean, linhas: number, colunas: number): Pos {
  let linha = 0;
  let coluna = 0;
  for (let l = 0; l < linhas; l++)
    for (let c = 0; c < colunas; c++)
      if (preenchida({ linha: l, coluna: c })) {
        linha = Math.max(linha, l);
        coluna = Math.max(coluna, c);
      }
  return { linha, coluna };
}
