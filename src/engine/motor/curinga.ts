/**
 * Curingas do Excel (* qualquer sequência, ? um caractere, ~ escapa o seguinte)
 * sem expressão regular: o tempo é no máximo proporcional a texto × padrão,
 * mesmo com muitos * seguidos ("*a*a*a…*b"), que travavam a versão com RegExp.
 */

/** Pedaço do padrão: um caractere literal, QUALQUER (?) ou ESTRELA (*). */
type Peca = string | typeof QUALQUER | typeof ESTRELA;
const QUALQUER = 0;
const ESTRELA = 1;

function pecas(padrao: string): Peca[] {
  const out: Peca[] = [];
  for (let i = 0; i < padrao.length; i++) {
    const ch = padrao[i];
    if (ch === "~" && i + 1 < padrao.length && "*?~".includes(padrao[i + 1])) out.push(padrao[++i]);
    else if (ch === "*") { if (out[out.length - 1] !== ESTRELA) out.push(ESTRELA); }
    else if (ch === "?") out.push(QUALQUER);
    else out.push(ch);
  }
  return out;
}

/** O padrão tem algum curinga (ou ~) a interpretar? */
export const temCuringa = (padrao: string) => /[*?~]/.test(padrao);

/** O texto inteiro casa com o padrão? Sem diferenciar maiúsculas. */
export function casaCuringa(padrao: string, texto: string): boolean {
  const p = pecas(padrao.toLowerCase());
  const s = texto.toLowerCase();
  let i = 0, j = 0, estrela = -1, marca = 0;
  while (j < s.length) {
    if (i < p.length && p[i] !== ESTRELA && (p[i] === QUALQUER || p[i] === s[j])) { i++; j++; }
    else if (i < p.length && p[i] === ESTRELA) { estrela = i++; marca = j; }
    else if (estrela >= 0) { i = estrela + 1; j = ++marca; }
    else return false;
  }
  while (i < p.length && p[i] === ESTRELA) i++;
  return i === p.length;
}

/**
 * Primeira posição (a partir de `inicio`, base 0) em que um trecho do texto casa
 * com o padrão, como o LOCALIZAR; -1 se não há. Sem diferenciar maiúsculas.
 * O padrão é uma sequência de segmentos separados por *: o casamento mais à
 * esquerda começa na primeira ocorrência do primeiro segmento, e os seguintes
 * são achados gulosamente (se não couberem depois dela, não cabem depois de
 * nenhuma outra). Tempo proporcional a texto × padrão.
 */
export function localizarCuringa(padrao: string, texto: string, inicio = 0): number {
  const p = pecas(padrao.toLowerCase());
  const s = texto.toLowerCase();
  if (inicio > s.length) return -1;
  const segmentos: Peca[][] = [[]];
  for (const x of p) if (x === ESTRELA) segmentos.push([]); else segmentos[segmentos.length - 1].push(x);
  const achar = (seg: Peca[], de: number) => {
    for (let i = de; i + seg.length <= s.length; i++) {
      let k = 0;
      while (k < seg.length && (seg[k] === QUALQUER || seg[k] === s[i + k])) k++;
      if (k === seg.length) return i;
    }
    return -1;
  };
  const primeiro = achar(segmentos[0], inicio);
  if (primeiro < 0) return -1;
  let pos = primeiro + segmentos[0].length;
  for (const seg of segmentos.slice(1)) {
    const i = achar(seg, pos);
    if (i < 0) return -1;
    pos = i + seg.length;
  }
  return primeiro;
}
