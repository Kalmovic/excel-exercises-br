"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from "react";
import {
  colunaParaLetras,
  contem,
  intervaloParaTexto,
  normalizar,
  paraEndereco,
  type Pos,
} from "@/engine/address";
import { alinhamento } from "@/engine/format";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";

const LARGURA_PADRAO = 96;
const ALTURA = 26;
const LARGURA_CABECALHO = 44;

/** Caracteres depois dos quais um clique insere uma referência na fórmula. */
const ACEITA_REFERENCIA = /[=(;+\-*/^&<>:]\s*$/;

export function Grade({ larguras }: { larguras?: Record<string, number> }) {
  const { planilha, store, entradaRef, alvos, formatacao, selecaoFixa } = useSimulador();
  const versao = useVersaoPlanilha();
  const ancora = useEstado((e) => e.ancora);
  const foco = useEstado((e) => e.foco);
  const modo = useEstado((e) => e.modo);
  const rascunho = useEstado((e) => e.rascunho);
  const copiado = useEstado((e) => e.copiado);
  const alca = useEstado((e) => e.alca);
  const arrasto = useEstado((e) => e.arrasto);
  const celebrando = useEstado((e) => e.celebrando);

  const selecao = normalizar(ancora, foco);
  const colunas = useMemo(
    () =>
      Array.from({ length: planilha.colunas }, (_, c) => larguras?.[colunaParaLetras(c)] ?? LARGURA_PADRAO),
    [planilha.colunas, larguras],
  );
  const esquerda = (c: number) => LARGURA_CABECALHO + colunas.slice(0, c).reduce((a, b) => a + b, 0);
  const larguraTotal = esquerda(planilha.colunas);

  // Depois de inserir uma referência pelo clique, põe o cursor logo após ela.
  // useLayoutEffect roda antes do navegador processar a próxima tecla.
  const cursorPendente = useRef<number | null>(null);
  useLayoutEffect(() => {
    const pos = cursorPendente.current;
    if (pos === null) return;
    cursorPendente.current = null;
    entradaRef.current?.focus();
    entradaRef.current?.setSelectionRange(pos, pos);
  }, [rascunho, entradaRef]);

  // Mantém o foco no input da grade (ele captura a digitação, inclusive acentos).
  useEffect(() => {
    // Não rouba o foco de campos que têm o próprio foco (barra de fórmulas, campo de resposta).
    if (document.activeElement?.closest("[data-foco-proprio]")) return;
    entradaRef.current?.focus({ preventScroll: true });
  }, [ancora, modo, entradaRef]);

  useEffect(() => {
    const soltar = () => store.getState().terminarArrasto();
    window.addEventListener("mouseup", soltar);
    return () => window.removeEventListener("mouseup", soltar);
  }, [store]);

  const apontandoReferencia = () => {
    const { modo, rascunho } = store.getState();
    const el = entradaRef.current;
    if (modo === "pronto" || !rascunho.startsWith("=")) return false;
    const cursor = el?.selectionStart ?? rascunho.length;
    return ACEITA_REFERENCIA.test(rascunho.slice(0, cursor));
  };

  const aoPressionarCelula = (e: MouseEvent, p: Pos) => {
    e.preventDefault();
    const s = store.getState();
    // Modo "apontar": clicar numa célula enquanto digita uma fórmula insere a referência.
    if (apontandoReferencia() && !(p.linha === s.ancora.linha && p.coluna === s.ancora.coluna)) {
      const el = entradaRef.current;
      const cursor = el?.selectionStart ?? s.rascunho.length;
      const ref = paraEndereco(p);
      const novo = s.rascunho.slice(0, cursor) + ref + s.rascunho.slice(cursor);
      cursorPendente.current = cursor + ref.length;
      s.setRascunho(novo);
      return;
    }
    if (s.modo !== "pronto" && !s.confirmar()) return;
    s.selecionarPeloMouse(p, e.shiftKey);
    store.setState({ arrasto: "selecao" });
  };

  const aoEntrarCelula = (p: Pos) => {
    const s = store.getState();
    if (s.arrasto === "selecao") s.selecionarPeloMouse(p, true);
    if (s.arrasto === "alca") s.moverAlca(p);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    const s = store.getState();
    const ctrl = e.ctrlKey || e.metaKey;
    const tecla = e.key;

    if (s.modo === "pronto") {
      const setas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (setas[tecla]) {
        e.preventDefault();
        s.mover(...setas[tecla], e.shiftKey);
        return;
      }
      if (tecla === "Enter") {
        e.preventDefault();
        s.mover(e.shiftKey ? -1 : 1, 0);
        return;
      }
      if (tecla === "Tab") {
        e.preventDefault();
        s.mover(0, e.shiftKey ? -1 : 1);
        return;
      }
      if (tecla === "F2") {
        e.preventDefault();
        s.iniciarEdicao("editar");
        return;
      }
      if (tecla === "Delete" || tecla === "Backspace") {
        e.preventDefault();
        s.apagarSelecao();
        return;
      }
      if (tecla === "Escape") {
        store.setState({ copiado: null, mensagem: null });
        return;
      }
      if (ctrl) {
        // Ctrl+Shift+4 (R$) e Ctrl+Shift+5 (%), como no Excel. e.code ignora o layout do teclado.
        if (formatacao && e.shiftKey && (e.code === "Digit4" || e.code === "Digit5")) {
          e.preventDefault();
          s.formatarSelecao(e.code === "Digit4" ? "moeda" : "percentual");
          return;
        }
        const k = tecla.toLowerCase();
        if (k === "c") return (e.preventDefault(), s.copiar());
        if (k === "v") return (e.preventDefault(), s.colar());
        if (k === "z") return (e.preventDefault(), e.shiftKey ? planilha.refazer() : planilha.desfazer());
        if (k === "y") return (e.preventDefault(), planilha.refazer());
        if (k === "d") return (e.preventDefault(), s.preencherSelecao("baixo"));
        if (k === "r") return (e.preventDefault(), s.preencherSelecao("direita"));
      }
      return; // demais teclas caem no onChange (inicia edição)
    }

    // inserir / editar
    if (tecla === "Enter") {
      e.preventDefault();
      if (s.confirmar()) s.mover(e.shiftKey ? -1 : 1, 0);
      return;
    }
    if (tecla === "Tab") {
      e.preventDefault();
      if (s.confirmar()) s.mover(0, e.shiftKey ? -1 : 1);
      return;
    }
    if (tecla === "Escape") {
      e.preventDefault();
      s.cancelar();
      return;
    }
    if (tecla === "F2") {
      e.preventDefault();
      store.setState({ modo: s.modo === "inserir" ? "editar" : "inserir" });
      return;
    }
    // No modo inserir, setas confirmam e movem, exceto em fórmulas
    // (lá elas movem o cursor, o que é mais previsível para quem está aprendendo).
    if (s.modo === "inserir" && tecla.startsWith("Arrow") && !s.rascunho.startsWith("=")) {
      e.preventDefault();
      if (!s.confirmar()) return;
      const d: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      s.mover(...d[tecla]);
    }
  };

  const aoDigitar = (valor: string) => {
    const s = store.getState();
    if (s.modo === "pronto") {
      if (s.iniciarEdicao("inserir", valor)) return;
      // célula bloqueada: descarta o que foi digitado
      if (entradaRef.current) entradaRef.current.value = "";
      return;
    }
    s.setRascunho(valor);
  };

  const iniciarEdicaoNaAtiva = () => store.getState().iniciarEdicao("editar");

  const editando = modo !== "pronto";
  const larguraEditor = Math.max(colunas[ancora.coluna], (rascunho.length + 2) * 8);

  return (
    <div className="overflow-auto rounded-md border border-zinc-300 bg-white shadow-sm" data-testid="grade">
      <div
        className="relative select-none font-[Calibri,Carlito,Arial,sans-serif] text-[13px]"
        style={{ width: larguraTotal, height: ALTURA * (planilha.linhas + 1) }}
        onMouseLeave={() => {
          if (store.getState().arrasto === "alca") store.setState({ alca: null });
        }}
      >
        {/* canto */}
        <div
          className="absolute border-r border-b border-zinc-300 bg-header"
          style={{ left: 0, top: 0, width: LARGURA_CABECALHO, height: ALTURA }}
        />
        {/* cabeçalhos de coluna */}
        {colunas.map((w, c) => {
          const ativa = c >= selecao.inicio.coluna && c <= selecao.fim.coluna;
          return (
            <div
              key={`c${c}`}
              className={`absolute flex items-center justify-center border-r border-b border-zinc-300 ${
                ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-500"
              }`}
              style={{ left: esquerda(c), top: 0, width: w, height: ALTURA }}
            >
              {colunaParaLetras(c)}
            </div>
          );
        })}
        {/* linhas */}
        {Array.from({ length: planilha.linhas }, (_, l) => {
          const ativa = l >= selecao.inicio.linha && l <= selecao.fim.linha;
          return (
            <div
              key={`l${l}`}
              className={`absolute flex items-center justify-center border-r border-b border-zinc-300 ${
                ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-500"
              }`}
              style={{ left: 0, top: ALTURA * (l + 1), width: LARGURA_CABECALHO, height: ALTURA }}
            >
              {l + 1}
            </div>
          );
        })}
        {/* células */}
        {Array.from({ length: planilha.linhas }, (_, l) =>
          colunas.map((w, c) => {
            const p = { linha: l, coluna: c };
            const end = paraEndereco(p);
            return (
              <Celula
                key={end}
                endereco={end}
                pos={p}
                left={esquerda(c)}
                top={ALTURA * (l + 1)}
                largura={w}
                naSelecao={contem(selecao, p) && !(l === ancora.linha && c === ancora.coluna)}
                alvo={alvos.has(end)}
                celebrando={celebrando && alvos.has(end)}
                versao={versao}
                onPressionar={aoPressionarCelula}
                onEntrar={aoEntrarCelula}
                onDuploClique={iniciarEdicaoNaAtiva}
              />
            );
          }),
        )}
        {/* área copiada (tracejado) */}
        {copiado && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-success"
            style={{
              left: esquerda(copiado.inicio.coluna) - 1,
              top: ALTURA * (copiado.inicio.linha + 1) - 1,
              width: esquerda(copiado.fim.coluna + 1) - esquerda(copiado.inicio.coluna) + 1,
              height: ALTURA * (copiado.fim.linha - copiado.inicio.linha + 1) + 1,
            }}
          />
        )}
        {/* contorno da seleção */}
        <div
          className="pointer-events-none absolute border-2 border-success"
          style={{
            left: esquerda(selecao.inicio.coluna) - 1,
            top: ALTURA * (selecao.inicio.linha + 1) - 1,
            width: esquerda(selecao.fim.coluna + 1) - esquerda(selecao.inicio.coluna) + 1,
            height: ALTURA * (selecao.fim.linha - selecao.inicio.linha + 1) + 1,
          }}
        />
        {/* destino da alça */}
        {alca && (
          <div
            className="pointer-events-none absolute border border-dashed border-zinc-600 bg-zinc-500/10"
            style={{
              left: esquerda(alca.inicio.coluna),
              top: ALTURA * (alca.inicio.linha + 1),
              width: esquerda(alca.fim.coluna + 1) - esquerda(alca.inicio.coluna),
              height: ALTURA * (alca.fim.linha - alca.inicio.linha + 1),
            }}
          />
        )}
        {/* alça de preenchimento */}
        {!editando && !selecaoFixa && (
          <div
            data-testid="alca"
            title="Arraste para copiar a fórmula"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              store.getState().iniciarAlca();
            }}
            className="absolute z-10 h-[7px] w-[7px] cursor-crosshair border border-white bg-success"
            style={{
              left: esquerda(selecao.fim.coluna + 1) - 4,
              top: ALTURA * (selecao.fim.linha + 2) - 4,
            }}
          />
        )}
        {/* input da célula ativa: invisível no modo pronto, editor nos outros */}
        <input
          ref={entradaRef}
          data-testid="editor-celula"
          aria-label={`Célula ${paraEndereco(ancora)}`}
          autoComplete="off"
          spellCheck={false}
          value={editando ? rascunho : ""}
          onChange={(e) => aoDigitar(e.target.value)}
          onKeyDown={aoTeclar}
          className={`absolute z-20 border-2 border-success px-1 font-[inherit] text-[13px] outline-none ${
            editando ? "bg-white text-zinc-900 opacity-100 shadow-md" : "opacity-0"
          }`}
          style={{
            left: esquerda(ancora.coluna) - 1,
            top: ALTURA * (ancora.linha + 1) - 1,
            width: editando ? larguraEditor + 2 : colunas[ancora.coluna] + 2,
            height: ALTURA + 1,
            caretColor: editando ? undefined : "transparent",
            cursor: arrasto ? "crosshair" : undefined,
            pointerEvents: editando ? "auto" : "none",
          }}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {intervaloParaTexto(selecao)}
      </span>
    </div>
  );
}

type PropsCelula = {
  endereco: string;
  pos: Pos;
  left: number;
  top: number;
  largura: number;
  naSelecao: boolean;
  alvo: boolean;
  celebrando: boolean;
  /** Muda a cada recálculo; força a célula a ler o valor novo do motor. */
  versao: number;
  onPressionar: (e: MouseEvent, p: Pos) => void;
  onEntrar: (p: Pos) => void;
  onDuploClique: () => void;
};

function Celula({ endereco, pos, left, top, largura, naSelecao, alvo, celebrando, onPressionar, onEntrar, onDuploClique }: PropsCelula) {
  const { planilha } = useSimulador();
  const valor = planilha.valor(pos);
  const circular = planilha.circular(pos);
  const alinh = circular ? "direita" : alinhamento(valor);
  const erro = typeof valor === "object" && valor !== null && !circular;
  return (
    <div
      data-celula={endereco}
      onMouseDown={(e) => onPressionar(e, pos)}
      onMouseEnter={() => onEntrar(pos)}
      onDoubleClick={onDuploClique}
      className={`absolute overflow-hidden whitespace-nowrap border-r border-b border-line px-1 leading-[25px] ${
        celebrando
          ? "bg-success-bg motion-safe:animate-acerto"
          : naSelecao
            ? "bg-success-bg"
            : alvo
              ? "bg-accent-soft"
              : "bg-white"
      } ${planilha.negrito(endereco) ? "font-bold" : ""} ${erro ? "text-red-700" : circular ? "text-ink" : "text-zinc-900"}`}
      style={{
        left,
        top,
        width: largura,
        height: ALTURA,
        textAlign: alinh === "direita" ? "right" : alinh === "centro" ? "center" : "left",
      }}
      title={
        circular
          ? `${endereco}: referência circular`
          : alvo
            ? `${endereco}: célula do exercício`
            : undefined
      }
    >
      {planilha.exibicao(endereco)}
    </div>
  );
}
