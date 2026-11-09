import { Fragment } from "react";

/** Renderiza `código` e **negrito** dentro de um parágrafo. */
export function TextoRico({ texto }: { texto: string }) {
  const partes = texto.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] text-emerald-800">
              {p.slice(1, -1)}
            </code>
          );
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
