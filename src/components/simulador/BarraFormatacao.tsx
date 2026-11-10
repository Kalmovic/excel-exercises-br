"use client";

import type { Formato } from "@/content/schema";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";

const BOTOES: { formato: Extract<Formato, string>; rotulo: string; titulo: string; teste: string }[] = [
  { formato: "moeda", rotulo: "R$", titulo: "Formato de moeda (Ctrl+Shift+4)", teste: "formatar-moeda" },
  { formato: "percentual", rotulo: "%", titulo: "Formato de porcentagem (Ctrl+Shift+5)", teste: "formatar-percentual" },
  { formato: "geral", rotulo: "Geral", titulo: "Sem formato", teste: "formatar-geral" },
];

/** Barra de formatação simples. Aparece só nos exercícios que pedem. */
export function BarraFormatacao() {
  const { planilha, store } = useSimulador();
  useVersaoPlanilha();
  const ancora = useEstado((e) => e.ancora);
  const atual = planilha.formatoDe(ancora) ?? "geral";

  return (
    <div className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white p-1 text-sm shadow-sm" role="toolbar" aria-label="Formatação">
      <span className="px-2 text-xs text-zinc-500">Número:</span>
      {BOTOES.map((b) => {
        const ativo = atual === b.formato;
        return (
          <button
            key={b.formato}
            type="button"
            title={b.titulo}
            aria-pressed={ativo}
            data-testid={b.teste}
            // mousedown + preventDefault: não tira o foco (nem a seleção) da grade
            onMouseDown={(e) => {
              e.preventDefault();
              store.getState().formatarSelecao(b.formato);
            }}
            className={`min-w-9 rounded px-2 py-1 font-medium ${
              ativo ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300" : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {b.rotulo}
          </button>
        );
      })}
    </div>
  );
}
