"use client";

import { useState } from "react";
import { deEndereco, deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { IconeFunil } from "./MenuFiltro";
import { FormatacaoCondicional } from "./MenuCondicional";
import { InserirGrafico } from "./PainelGrafico";
import { useSimulador, useVersaoPlanilha } from "./contexto";

/**
 * Guia "Dados" enxuta. Com `ferramentas.dados`: Filtro (Ctrl+Shift+L),
 * Classificar e Limpar, e a contagem da barra de status do Excel ("4 de 12
 * registros encontrados"). Com `ferramentas.dinamica`: Tabela dinâmica.
 */
export function BarraDados() {
  const { planilha, store, dados, dinamica, condicional, grafico } = useSimulador();
  useVersaoPlanilha();
  const [inserindo, setInserindo] = useState(false);
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
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-zinc-300 bg-white p-1 text-sm shadow-sm" role="toolbar" aria-label="Ferramentas">
        {dados && (
          <>
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
          </>
        )}
        {condicional && <FormatacaoCondicional classeBotao={botao} />}
        {grafico && <InserirGrafico classeBotao={botao} />}
        {dinamica && (
          <button
            type="button"
            title="Inserir uma tabela dinâmica com os dados selecionados"
            aria-expanded={inserindo}
            data-testid="botao-dinamica"
            onMouseDown={acao(() => setInserindo((x) => !x))}
            className={`${botao} ${inserindo ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
          >
            <IconeTabelaDinamica /> Tabela dinâmica
          </button>
        )}
        {filtrando && (
          <span className="ml-auto px-2 text-xs text-zinc-500" data-testid="registros-encontrados" aria-live="polite">
            {planilha.linhasVisiveis().length} de {planilha.totalDoFiltro()} registros encontrados
          </span>
        )}
      </div>
      {inserindo && <InserirDinamica fechar={() => setInserindo(false)} />}
    </div>
  );
}

export function IconeTabelaDinamica() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="1" width="12" height="12" rx="1" />
      <path d="M1 5h12M5 1v12" />
      <path d="M8 8.5h3M9.5 7v3" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * A janela "Criar Tabela Dinâmica", resumida: o intervalo dos dados (vem da
 * seleção ou da região atual, como no Excel) e a célula onde ela começa.
 */
function InserirDinamica({ fechar }: { fechar: () => void }) {
  const { planilha, store, entradaRef } = useSimulador();
  const [inicial] = useState(() => {
    const s = store.getState();
    const sel = s.selecao();
    const umaCelula = sel.inicio.linha === sel.fim.linha && sel.inicio.coluna === sel.fim.coluna;
    const origem = umaCelula ? planilha.regiaoAtual(sel.inicio) : sel;
    // Duas colunas depois dos dados; sem espaço, três linhas abaixo.
    const aoLado = { linha: origem.inicio.linha, coluna: origem.fim.coluna + 2 };
    const destino = aoLado.coluna < planilha.colunas ? aoLado : { linha: origem.fim.linha + 3, coluna: origem.inicio.coluna };
    return { origem: intervaloParaTexto(origem), destino: paraEndereco(destino) };
  });
  const [origem, setOrigem] = useState(inicial.origem);
  const [destino, setDestino] = useState(inicial.destino);
  const [erro, setErro] = useState<string | null>(null);

  const criar = (e: React.FormEvent) => {
    e.preventDefault();
    let o, d;
    try {
      o = deIntervalo(origem.replace(/\$/g, ""));
      d = deEndereco(destino.replace(/\$/g, ""));
    } catch {
      setErro("Escreva a origem como A1:E15 e o destino como G1.");
      return;
    }
    const r = planilha.inserirDinamica(o, d);
    if (!r.ok) return setErro(r.mensagem);
    store.setState({ ancora: d, foco: d, mensagem: null });
    fechar();
    entradaRef.current?.focus({ preventScroll: true });
  };

  const campo = "w-28 rounded border border-zinc-300 px-2 py-1 font-mono text-[13px] uppercase outline-none focus:border-success";
  return (
    <form
      onSubmit={criar}
      data-foco-proprio
      data-testid="inserir-dinamica"
      className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-sm"
    >
      <p className="w-full font-semibold">Criar Tabela Dinâmica</p>
      <label className="space-y-1">
        <span className="block text-xs text-zinc-500">Tabela/Intervalo</span>
        <input value={origem} onChange={(e) => setOrigem(e.target.value)} className={campo} data-testid="dinamica-origem" autoFocus />
      </label>
      <label className="space-y-1">
        <span className="block text-xs text-zinc-500">Local (célula de início)</span>
        <input value={destino} onChange={(e) => setDestino(e.target.value)} className={campo} data-testid="dinamica-destino" />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-success px-3 py-1 font-medium text-white" data-testid="dinamica-ok">
          OK
        </button>
        <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
          Cancelar
        </button>
      </div>
      {erro && (
        <p className="w-full text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}
