"use client";

import { useEstado, useSimulador } from "./contexto";

/** Campo de resposta em texto, acima da grade (exercícios text_answer). */
export function CampoResposta({ rotulo, onEnviar }: { rotulo: string; onEnviar: () => void }) {
  const { store } = useSimulador();
  const resposta = useEstado((e) => e.resposta);

  return (
    <label className="block rounded-md border border-sky-200 bg-sky-50 p-3" data-foco-proprio>
      <span className="mb-1.5 block text-sm font-medium text-sky-950">{rotulo}</span>
      <input
        data-testid="campo-resposta"
        autoComplete="off"
        spellCheck={false}
        value={resposta}
        onChange={(e) => store.getState().setResposta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnviar();
          }
        }}
        placeholder="Sua resposta"
        className="w-full rounded border border-sky-300 bg-white px-2 py-1.5 font-mono outline-none focus:ring-2 focus:ring-sky-400"
      />
    </label>
  );
}
