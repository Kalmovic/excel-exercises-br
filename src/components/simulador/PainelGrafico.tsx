"use client";

import { useEffect, useRef, useState } from "react";
import type { Grafico, TipoGrafico } from "@/content/schema";
import { deEndereco, deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";
import { GraficoSvg } from "./GraficoSvg";
import { MenuItens } from "./MenuCondicional";
import { navegarItens } from "./teclado";

const TIPOS: { tipo: TipoGrafico; rotulo: string; dica: string }[] = [
  { tipo: "colunas", rotulo: "Colunas", dica: "Comparar valores entre categorias" },
  { tipo: "barras", rotulo: "Barras", dica: "Comparar, com nomes longos ou muitas categorias" },
  { tipo: "linhas", rotulo: "Linhas", dica: "Mostrar a evolução ao longo do tempo" },
  { tipo: "pizza", rotulo: "Pizza", dica: "Mostrar partes de um todo (uma série só)" },
];

export function IconeGrafico({ tipo }: { tipo: TipoGrafico }) {
  const c = "currentColor";
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      {tipo === "colunas" && (
        <g fill={c}>
          <rect x="2" y="8" width="3" height="6" />
          <rect x="6.5" y="4" width="3" height="10" />
          <rect x="11" y="6" width="3" height="8" />
        </g>
      )}
      {tipo === "barras" && (
        <g fill={c}>
          <rect x="2" y="2" width="7" height="3" />
          <rect x="2" y="6.5" width="12" height="3" />
          <rect x="2" y="11" width="9" height="3" />
        </g>
      )}
      {tipo === "linhas" && <path d="M1.5 12 L5.5 7 L9 9.5 L14.5 3" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />}
      {tipo === "pizza" && (
        <g>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke={c} strokeWidth="1.4" />
          <path d="M8 8 V1.8 A6.2 6.2 0 0 1 14 9.5 Z" fill={c} />
        </g>
      )}
    </svg>
  );
}

/** Botão "Inserir Gráfico" com os quatro tipos. Usa a seleção (ou a região atual, com uma célula só). */
export function InserirGrafico({ classeBotao }: { classeBotao: string }) {
  const { planilha, store, entradaRef } = useSimulador();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto && !erro) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setErro(null);
      }
    };
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [aberto, erro]);

  const inserir = (tipo: TipoGrafico) => {
    setAberto(false);
    const sel = store.getState().selecao();
    const umaCelula = sel.inicio.linha === sel.fim.linha && sel.inicio.coluna === sel.fim.coluna;
    const r = planilha.inserirGrafico(tipo, umaCelula ? planilha.regiaoAtual(sel.inicio) : sel);
    if (!r.ok) {
      botaoRef.current?.focus();
      return setErro(r.mensagem);
    }
    setErro(null);
    // O gráfico novo fica selecionado (abre o Design do Gráfico); o foco volta para a grade.
    entradaRef.current?.focus({ preventScroll: true });
    store.setState({ graficoAtivo: r.indice ?? null });
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-haspopup="menu"
        data-testid="botao-grafico"
        // mousedown + preventDefault: não tira a seleção da grade; o click também vem do Enter e do Espaço.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const s = store.getState();
          if (s.modo !== "pronto" && !s.confirmar()) return;
          setAberto((a) => !a);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className={`${classeBotao} ${aberto ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
      >
        <IconeGrafico tipo="colunas" /> Inserir Gráfico ▾
      </button>
      {aberto && (
        <MenuItens
          rotulo="Inserir Gráfico"
          testid="menu-grafico"
          fechar={() => {
            setAberto(false);
            requestAnimationFrame(() => botaoRef.current?.focus());
          }}
        >
          {TIPOS.map((t) => (
            <button
              key={t.tipo}
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-tipo-grafico={t.tipo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserir(t.tipo)}
              className="flex w-full items-start gap-3 rounded px-2 py-1.5 text-left hover:bg-header focus:bg-header focus:outline-none"
            >
              <span className="mt-0.5 text-[#4472C4]">
                <IconeGrafico tipo={t.tipo} />
              </span>
              <span>
                <span className="block font-medium">{t.rotulo}</span>
                <span className="block text-xs text-zinc-500">{t.dica}</span>
              </span>
            </button>
          ))}
        </MenuItens>
      )}
      {erro && (
        <p role="alert" className="absolute top-full left-0 z-40 mt-1 w-72 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * "Design do Gráfico": aparece quando um gráfico está selecionado. Tipo,
 * título, rótulos de dados, Alternar Linha/Coluna, intervalo e posição.
 */
export function PainelGrafico() {
  const { planilha, store, entradaRef } = useSimulador();
  useVersaoPlanilha();
  const ativo = useEstado((e) => e.graficoAtivo);
  const g = ativo !== null ? planilha.graficos()[ativo] : undefined;
  if (ativo === null || !g) return null;
  return (
    <Design
      key={`${ativo}-${planilha.graficos().length}`}
      indice={ativo}
      g={g}
      fechar={() => {
        store.setState({ graficoAtivo: null });
        entradaRef.current?.focus({ preventScroll: true });
      }}
    />
  );
}

function Design({ indice, g, fechar }: { indice: number; g: Grafico; fechar: () => void }) {
  const { planilha } = useSimulador();
  const [titulo, setTitulo] = useState(g.titulo);
  const [dados, setDados] = useState(g.dados);
  const [posicao, setPosicao] = useState(g.posicao);
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (x: Partial<Grafico>) => {
    setErro(null);
    planilha.configurarGrafico(indice, { ...g, ...x });
  };
  const aplicarTitulo = () => titulo !== g.titulo && mudar({ titulo: titulo.slice(0, 80) });
  const aplicarDados = () => {
    try {
      const d = intervaloParaTexto(deIntervalo(dados.replace(/\$/g, "")));
      if (d !== g.dados) mudar({ dados: d });
      setDados(d);
    } catch {
      setErro("Escreva o intervalo como A1:B7.");
    }
  };
  const aplicarPosicao = () => {
    try {
      const p = paraEndereco(deEndereco(posicao.replace(/\$/g, "")));
      if (p !== g.posicao) mudar({ posicao: p });
      setPosicao(p);
    } catch {
      setErro("Escreva a posição como uma célula, por exemplo E2.");
    }
  };
  const campo = "rounded border border-zinc-300 px-2 py-1 text-[13px] outline-none focus:border-success focus:ring-2 focus:ring-success/40";
  const enter = (fn: () => void) => (e: React.KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), fn());

  return (
    <section aria-label="Design do Gráfico" data-testid="painel-grafico" data-foco-proprio className="space-y-3 rounded-md border border-zinc-300 bg-white p-3 text-[13px] shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Design do Gráfico</h3>
        <button type="button" onClick={fechar} className="ml-auto min-h-6 rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-header">
          Fechar
        </button>
      </div>
      {/* Celular: a grade é estreita e o gráfico fica ao lado dos dados; a prévia mostra o que mudou. */}
      <div className="overflow-hidden rounded border border-zinc-200 sm:hidden" data-testid="previa-grafico">
        <GraficoSvg dados={planilha.dadosDoGrafico(indice)} tipo={g.tipo} titulo={g.titulo} rotulos={g.rotulos} largura={320} altura={210} />
      </div>
      <div
        className="flex flex-wrap gap-1"
        role="radiogroup"
        aria-label="Tipo de gráfico"
        onKeyDown={(e) => {
          // Setas trocam o tipo (o foco anda junto), como num grupo de opções.
          const alvo = navegarItens(e, '[role="radio"]', "ambas");
          if (alvo) mudar({ tipo: alvo.dataset.mudarTipo as TipoGrafico });
        }}
      >
        {TIPOS.map((t) => (
          <button
            key={t.tipo}
            type="button"
            role="radio"
            aria-checked={g.tipo === t.tipo}
            tabIndex={g.tipo === t.tipo ? 0 : -1}
            title={t.dica}
            data-mudar-tipo={t.tipo}
            onClick={() => mudar({ tipo: t.tipo })}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 ${g.tipo === t.tipo ? "border-success bg-success/10 font-medium" : "border-zinc-300 hover:bg-header"}`}
          >
            <span className="text-[#4472C4]">
              <IconeGrafico tipo={t.tipo} />
            </span>
            {t.rotulo}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-xs text-zinc-500">Título do gráfico</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={aplicarTitulo}
            onKeyDown={enter(aplicarTitulo)}
            className={`${campo} w-full`}
            placeholder="Título do Gráfico"
            data-testid="grafico-titulo"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 pb-1">
            <input type="checkbox" checked={g.rotulos} onChange={(e) => mudar({ rotulos: e.target.checked })} data-testid="grafico-rotulos" />
            Rótulos de dados
          </label>
          <button type="button" onClick={() => mudar({ alternar: !g.alternar })} className="rounded border border-zinc-300 px-2 py-1 hover:bg-header" data-testid="grafico-alternar">
            Alternar Linha/Coluna
          </button>
        </div>
        <label className="space-y-1">
          <span className="block text-xs text-zinc-500">Dados (Selecionar Dados)</span>
          <input value={dados} onChange={(e) => setDados(e.target.value)} onBlur={aplicarDados} onKeyDown={enter(aplicarDados)} className={`${campo} w-28 font-mono uppercase`} data-testid="grafico-dados" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-zinc-500">Posição (canto superior esquerdo)</span>
          <input value={posicao} onChange={(e) => setPosicao(e.target.value)} onBlur={aplicarPosicao} onKeyDown={enter(aplicarPosicao)} className={`${campo} w-20 font-mono uppercase`} data-testid="grafico-posicao" />
        </label>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          planilha.removerGrafico(indice);
          fechar();
        }}
        className="min-h-6 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-header hover:text-red-700"
        data-testid="excluir-grafico"
      >
        Excluir gráfico
      </button>
    </section>
  );
}
