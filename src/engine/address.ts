export type Pos = { linha: number; coluna: number }; // base 0
export type Intervalo = { inicio: Pos; fim: Pos };

export function colunaParaLetras(coluna: number): string {
  let s = "";
  let n = coluna + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letrasParaColuna(letras: string): number {
  let n = 0;
  for (const ch of letras.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function paraEndereco({ linha, coluna }: Pos): string {
  return `${colunaParaLetras(coluna)}${linha + 1}`;
}

export function deEndereco(endereco: string): Pos {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(endereco.trim());
  if (!m) throw new Error(`Endereço inválido: ${endereco}`);
  return { linha: Number(m[2]) - 1, coluna: letrasParaColuna(m[1]) };
}

/** Normaliza para que `inicio` seja o canto superior esquerdo. */
export function normalizar(a: Pos, b: Pos): Intervalo {
  return {
    inicio: { linha: Math.min(a.linha, b.linha), coluna: Math.min(a.coluna, b.coluna) },
    fim: { linha: Math.max(a.linha, b.linha), coluna: Math.max(a.coluna, b.coluna) },
  };
}

export function contem(i: Intervalo, p: Pos): boolean {
  return (
    p.linha >= i.inicio.linha &&
    p.linha <= i.fim.linha &&
    p.coluna >= i.inicio.coluna &&
    p.coluna <= i.fim.coluna
  );
}

export function intervaloParaTexto(i: Intervalo): string {
  const a = paraEndereco(i.inicio);
  const b = paraEndereco(i.fim);
  return a === b ? a : `${a}:${b}`;
}

export function* posicoes(i: Intervalo): Generator<Pos> {
  for (let linha = i.inicio.linha; linha <= i.fim.linha; linha++)
    for (let coluna = i.inicio.coluna; coluna <= i.fim.coluna; coluna++) yield { linha, coluna };
}

/** Texto de intervalo -> Intervalo. Aceita "B2", "B2:D5", "D5:B2" e "$B$2". */
export function deIntervalo(texto: string): Intervalo {
  const [a, b = a] = texto.trim().toUpperCase().replace(/\$/g, "").split(":");
  return normalizar(deEndereco(a), deEndereco(b));
}

/** Normaliza "d5:b2" para "B2:D5" e "C3:C3" para "C3". */
export function normalizarIntervalo(texto: string): string {
  return intervaloParaTexto(deIntervalo(texto));
}
