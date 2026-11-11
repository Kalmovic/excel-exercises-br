/**
 * Como o Excel mostra o que não cabe na coluna:
 * - texto alinhado à esquerda invade as células vazias à direita;
 * - número (inclusive data e moeda) vira `####`.
 */
export type CelulaDaLinha = {
  texto: string;
  tipo: "texto" | "numero" | "outro";
  /** Sem conteúdo: deixa o texto da esquerda passar por cima. */
  vazia: boolean;
  negrito: boolean;
  largura: number;
};

export type Ajuste = { texto: string; larguraVisivel: number };

/** Espaço interno da célula (px-1 dos dois lados). */
export const RESPIRO = 8;

export function ajustarLinha(cels: CelulaDaLinha[], medir: (texto: string, negrito: boolean) => number): Ajuste[] {
  return cels.map((c, i) => {
    const sem = { texto: c.texto, larguraVisivel: c.largura };
    if (!c.texto) return sem;
    const precisa = medir(c.texto, c.negrito);
    if (precisa <= c.largura - RESPIRO) return sem;
    if (c.tipo === "numero") {
      const n = Math.max(1, Math.floor((c.largura - RESPIRO) / medir("#", c.negrito)));
      return { texto: "#".repeat(n), larguraVisivel: c.largura };
    }
    if (c.tipo !== "texto") return sem;
    let largura = c.largura;
    for (let j = i + 1; j < cels.length && cels[j].vazia && precisa > largura - RESPIRO; j++) largura += cels[j].largura;
    return { texto: c.texto, larguraVisivel: largura };
  });
}

/** Largura que faz o conteúdo caber (duplo clique na borda do cabeçalho). */
export function larguraParaCaber(textos: { texto: string; negrito: boolean }[], medir: (t: string, n: boolean) => number) {
  const maior = Math.max(0, ...textos.filter((t) => t.texto).map((t) => medir(t.texto, t.negrito)));
  return Math.max(40, Math.ceil(maior + RESPIRO + 4));
}
