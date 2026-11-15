"use client";

import { useEstado, useSimulador } from "./contexto";

const AJUDA = {
  inicio: "Toque na primeira célula do intervalo.",
  fim: "Agora toque na última célula.",
  nenhum: "Toque duas vezes numa célula para digitar.",
};

/**
 * Atalhos para quem não tem teclado nem mouse (celular): no toque não dá para
 * arrastar a seleção nem apertar Ctrl+D. Só aparece em telas de toque.
 */
export function BarraToque() {
  const { planilha, store } = useSimulador();
  const intervalo = useEstado((e) => e.intervaloNoToque);
  const botao = "rounded-md border px-2.5 py-1.5 text-sm font-medium whitespace-nowrap";
  // mousedown + preventDefault: não tira o foco (nem a seleção) da grade
  const acao = (f: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    f();
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2 overflow-x-auto" role="toolbar" aria-label="Atalhos de toque" data-testid="barra-toque">
        <button
          type="button"
          aria-pressed={intervalo !== null}
          onMouseDown={acao(() => store.setState({ intervaloNoToque: intervalo ? null : "inicio" }))}
          className={`${botao} ${intervalo ? "border-ink bg-accent text-ink" : "border-line bg-white text-ink"}`}
          data-testid="selecionar-intervalo"
        >
          ▦ Selecionar intervalo
        </button>
        <button
          type="button"
          onMouseDown={acao(() => store.getState().preencherSelecao("baixo"))}
          className={`${botao} border-line bg-white text-ink`}
          data-testid="preencher-abaixo"
          title="Copia a primeira célula da seleção para as de baixo (Ctrl+D)"
        >
          ↓ Preencher
        </button>
        <button
          type="button"
          onMouseDown={acao(() => planilha.desfazer())}
          className={`${botao} border-line bg-white text-ink`}
          aria-label="Desfazer"
        >
          ↶
        </button>
      </div>
      <p className={`text-xs ${intervalo ? "font-semibold text-ink" : "text-muted"}`} aria-live="polite" data-testid="ajuda-toque">
        {AJUDA[intervalo ?? "nenhum"]}
      </p>
    </div>
  );
}
