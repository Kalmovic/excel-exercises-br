"use client";

import { useState } from "react";

/** Copia um texto (ex.: link de convite) e mostra "Copiado!" por 2 segundos. */
export function BotaoCopiar({ texto, rotulo = "Copiar link", testid }: { texto: string; rotulo?: string; testid?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          window.prompt("Copie o link:", texto);
        }
      }}
      className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-soft"
      data-testid={testid}
    >
      <span aria-live="polite">{copiado ? "Copiado!" : rotulo}</span>
    </button>
  );
}
