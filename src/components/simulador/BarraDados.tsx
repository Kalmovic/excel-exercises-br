"use client";

import { IconeFunil } from "./MenuFiltro";
import { useSimulador, useVersaoPlanilha } from "./contexto";

/**
 * Guia "Dados" enxuta: Filtro (Ctrl+Shift+L), Classificar e Limpar. Aparece só
 * nos exercícios que pedem (`ferramentas.dados`). Com o filtro ligado, mostra a
 * contagem da barra de status do Excel ("4 de 12 registros encontrados").
 */
export function BarraDados() {
  const { planilha, store } = useSimulador();
  useVersaoPlanilha();
  const filtro = planilha.filtroAtual();
  const filtrando = !!filtro && Object.keys(filtro.criterios).length > 0;
  const botao = "flex items-center gap-1.5 rounded px-2 py-1 font-medium text-zinc-700 hover:bg-header disabled:text-zinc-400 disabled:hover:bg-transparent";
  // mousedown + preventDefault: não tira o foco (nem a seleção) da grade
  const acao = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    const s = store.getState();
    if (s.modo !== "pronto" && !s.confirmar()) return;
    fn();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-zinc-300 bg-white p-1 text-sm shadow-sm" role="toolbar" aria-label="Dados">
      <span className="px-2 text-xs text-zinc-500">Dados:</span>
      <button
        type="button"
        title="Filtro (Ctrl+Shift+L)"
        aria-pressed={!!filtro}
        data-testid="botao-filtro"
        onMouseDown={acao(() => store.getState().alternarFiltro())}
        className={`${botao} ${filtro ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
      >
        <IconeFunil /> Filtro
      </button>
      <button type="button" title="Classificar de A a Z pela coluna da célula ativa" data-testid="classificar-asc" onMouseDown={acao(() => store.getState().classificar("asc"))} className={botao}>
        A→Z
      </button>
      <button type="button" title="Classificar de Z a A pela coluna da célula ativa" data-testid="classificar-desc" onMouseDown={acao(() => store.getState().classificar("desc"))} className={botao}>
        Z→A
      </button>
      <button type="button" title="Limpar todos os critérios do filtro" disabled={!filtrando} data-testid="limpar-filtros" onMouseDown={acao(() => planilha.limparFiltros())} className={botao}>
        Limpar
      </button>
      {filtrando && (
        <span className="ml-auto px-2 text-xs text-zinc-500" data-testid="registros-encontrados" aria-live="polite">
          {planilha.linhasVisiveis().length} de {planilha.totalDoFiltro()} registros encontrados
        </span>
      )}
    </div>
  );
}
