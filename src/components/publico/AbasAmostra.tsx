"use client";

import { useEffect, useState, type ReactNode } from "react";

type Aba = { id: string; rotulo: string; detalhe: string; conteudo: ReactNode };

/**
 * Abas das lições jogáveis da página Pro. Só a aba ativa fica montada: cada
 * simulador puxa o foco do teclado para a própria grade, e dois ao mesmo
 * tempo brigariam por ele. `#amostra-<id>` na URL abre direto naquela aba.
 */
export function AbasAmostra({ abas }: { abas: Aba[] }) {
  const [ativa, setAtiva] = useState(abas[0].id);

  useEffect(() => {
    const deHash = () => {
      const id = window.location.hash.replace("#amostra-", "");
      if (abas.some((a) => a.id === id)) setAtiva(id);
    };
    deHash();
    window.addEventListener("hashchange", deHash);
    return () => window.removeEventListener("hashchange", deHash);
  }, [abas]);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Lições para experimentar" className="flex flex-wrap gap-2">
        {abas.map((a) => {
          const sel = a.id === ativa;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={sel}
              aria-controls={`painel-${a.id}`}
              data-testid={`aba-amostra-${a.id}`}
              onClick={() => setAtiva(a.id)}
              className={`rounded-xl border px-4 py-2 text-left transition ${
                sel ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"
              }`}
            >
              <span className="block font-semibold">{a.rotulo}</span>
              <span className={`block text-xs ${sel ? "text-white/70" : "text-muted"}`}>{a.detalhe}</span>
            </button>
          );
        })}
      </div>
      {abas.map((a) =>
        a.id === ativa ? (
          <div key={a.id} role="tabpanel" id={`painel-${a.id}`} aria-labelledby={`aba-${a.id}`}>
            {a.conteudo}
          </div>
        ) : null,
      )}
    </div>
  );
}
