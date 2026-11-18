import { Fragment } from "react";

export type ParteTextoRico = { tipo: "texto" | "codigo" | "negrito" | "italico"; texto: string };

/**
 * `código`, **negrito** e *itálico*, nessa ordem de prioridade. Dentro do código
 * nada é interpretado. O itálico só vale com o asterisco colado no texto por
 * dentro e solto por fora: `2*3*4` e `A1 * B1 * C1` continuam literais.
 * `\*` é um asterisco literal (fora do código), também dentro do negrito.
 */
const MARCAS = /`([^`]+)`|\*\*((?:\\\*|[^*])+)\*\*|(?<![\p{L}\p{N}*\\])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\p{L}\p{N}*])/gu;

const literal = (t: string) => t.replace(/\\\*/g, "*");

export function partesTextoRico(texto: string): ParteTextoRico[] {
  const partes: ParteTextoRico[] = [];
  let desde = 0;
  for (const m of texto.matchAll(MARCAS)) {
    if (m.index > desde) partes.push({ tipo: "texto", texto: literal(texto.slice(desde, m.index)) });
    if (m[1] !== undefined) partes.push({ tipo: "codigo", texto: m[1] });
    else if (m[2] !== undefined) partes.push({ tipo: "negrito", texto: literal(m[2]) });
    else partes.push({ tipo: "italico", texto: m[3] });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) partes.push({ tipo: "texto", texto: literal(texto.slice(desde)) });
  return partes;
}

/** Renderiza `código`, **negrito** e *itálico* dentro de um parágrafo. */
export function TextoRico({ texto }: { texto: string }) {
  return (
    <>
      {partesTextoRico(texto).map((p, i) => {
        if (p.tipo === "codigo")
          return (
            <code key={i} className="rounded bg-header px-1 py-0.5 font-mono text-[0.9em] text-success [overflow-wrap:anywhere] [box-decoration-break:clone]">
              {p.texto}
            </code>
          );
        if (p.tipo === "negrito") return <strong key={i}>{p.texto}</strong>;
        if (p.tipo === "italico") return <em key={i}>{p.texto}</em>;
        return <Fragment key={i}>{p.texto}</Fragment>;
      })}
    </>
  );
}
