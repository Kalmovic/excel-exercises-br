"use client";

import { useEstado, useSimulador } from "./contexto";

/**
 * Atalhos para quem não tem teclado nem mouse (celular): no toque não dá para
 * arrastar a seleção, segurar Shift ou apertar Ctrl+D. Só aparece em telas de toque.
 */
export function BarraToque() {
  const { planilha, store } = useSimulador();
  const estender = useEstado((e) => e.estenderNoToque);
  const botao = "rounded-md border px-2.5 py-1.5 text-sm font-medium whitespace-nowrap";

  return (
    <div className="space-y-1">
      <div className="flex gap-2" role="toolbar" aria-label="Atalhos de toque" data-testid="barra-toque">
        <button
          type="button"
          aria-pressed={estender}
          // mousedown + preventDefault: não tira o foco (nem a seleção) da grade
          onMouseDown={(e) => {
            e.preventDefault();
            store.setState({ estenderNoToque: !estender });
          }}
          className={`${botao} ${estender ? "border-ink bg-accent text-ink" : "border-line bg-white text-ink"}`}
          data-testid="estender-selecao"
          title="Estender seleção: o próximo toque marca a outra ponta do intervalo"
        >
          ↔ Estender
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            store.getState().preencherSelecao("baixo");
          }}
          className={`${botao} border-line bg-white text-ink`}
          data-testid="preencher-abaixo"
          title="Preencher para baixo (copia a primeira linha da seleção para as de baixo)"
        >
          ↓ Preencher
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            planilha.desfazer();
          }}
          className={`${botao} border-line bg-white text-ink`}
        >
          ↶ Desfazer
        </button>
      </div>
      <p className="min-h-4 text-xs text-muted" aria-live="polite">
        {estender ? "Agora toque na outra ponta do intervalo." : ""}
      </p>
    </div>
  );
}
