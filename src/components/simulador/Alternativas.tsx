"use client";

import { useEstado, useSimulador } from "./contexto";

/** Alternativas da múltipla escolha. A escolha fica em `resposta` (o índice, como texto). */
export function Alternativas({ opcoes, bloqueado }: { opcoes: { texto: string }[]; bloqueado: boolean }) {
  const { store } = useSimulador();
  const escolha = useEstado((e) => e.resposta);
  const letras = "abcdef";
  return (
    <fieldset className="min-w-0 space-y-2 [overflow-wrap:anywhere]" data-testid="alternativas" disabled={bloqueado}>
      <legend className="sr-only">Alternativas</legend>
      {opcoes.map((o, i) => {
        const marcada = escolha === String(i);
        return (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-[15px] transition ${
              marcada ? "border-ink bg-accent-soft" : "border-line bg-white hover:border-zinc-400"
            }`}
          >
            <input
              type="radio"
              name="alternativa"
              value={i}
              checked={marcada}
              onChange={() => store.getState().setResposta(String(i))}
              className="mt-1"
            />
            <span>
              <span className="mr-1 font-mono text-muted">({letras[i]})</span> {o.texto}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
