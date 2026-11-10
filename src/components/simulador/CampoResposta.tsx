"use client";

import { useState } from "react";
import { useEstado, useSimulador } from "./contexto";

/** Campo de resposta em texto, acima da grade (exercícios text_answer). */
export function CampoResposta({ rotulo, onEnviar }: { rotulo: string; onEnviar: () => void }) {
  const { store } = useSimulador();
  const resposta = useEstado((e) => e.resposta);
  const [aviso, setAviso] = useState(false);
  // A graça é ler e digitar: copiar da barra de fórmulas e colar aqui pularia o exercício.
  const bloquear = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setAviso(true);
  };

  return (
    <label className="block rounded-md border border-line bg-warning-bg p-3" data-foco-proprio>
      <span className="mb-1.5 block text-sm font-medium text-ink">{rotulo}</span>
      <input
        data-testid="campo-resposta"
        autoComplete="off"
        spellCheck={false}
        value={resposta}
        onChange={(e) => {
          setAviso(false);
          store.getState().setResposta(e.target.value);
        }}
        onPaste={bloquear}
        onDrop={bloquear}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnviar();
          }
        }}
        placeholder="Sua resposta"
        className="w-full rounded border border-line bg-white px-2 py-1.5 font-mono outline-none focus:ring-2 focus:ring-accent"
      />
      {aviso && (
        <span className="mt-1.5 block text-sm text-ink" data-testid="aviso-colar">
          Colar está desativado aqui: digite a resposta.
        </span>
      )}
    </label>
  );
}
