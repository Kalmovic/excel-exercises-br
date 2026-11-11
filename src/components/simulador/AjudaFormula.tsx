"use client";

import { Fragment, type KeyboardEvent, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import {
  alternarReferencia,
  argumentoDestacado,
  completar,
  funcaoNoCursor,
  palavraNoCursor,
  sugestoes,
} from "@/engine/autocompletar";
import { useEstado, useSimulador } from "./contexto";
import type { StoreSimulador } from "./store";

/** O que mostrar abaixo da célula enquanto se digita uma fórmula. */
function calcular(modo: string, rascunho: string, cursor: number, fechadas: boolean) {
  if (modo === "pronto" || !rascunho.startsWith("=")) return { lista: [], atual: null };
  const c = Math.min(cursor, rascunho.length);
  const palavra = palavraNoCursor(rascunho, c);
  const lista = palavra && !fechadas ? sugestoes(palavra.prefixo) : [];
  return { lista, atual: lista.length ? null : funcaoNoCursor(rascunho, c) };
}

/** Props para os dois campos de edição (célula e barra) manterem o cursor no store. */
export function rastrearCursor(store: StoreSimulador) {
  const atualizar = (e: SyntheticEvent<HTMLInputElement>) => {
    const pos = e.currentTarget.selectionStart;
    if (pos !== null && pos !== store.getState().cursor) store.setState({ cursor: pos });
  };
  return { onSelect: atualizar, onKeyUp: atualizar, onClick: atualizar };
}

function aplicar(store: StoreSimulador, el: HTMLInputElement | null, r: { texto: string; cursor: number }) {
  // flushSync: o input precisa do valor novo antes de posicionarmos o cursor.
  flushSync(() => {
    store.getState().setRascunho(r.texto);
    store.setState({ cursor: r.cursor });
  });
  el?.setSelectionRange(r.cursor, r.cursor);
}

/**
 * Teclas do autocompletar e do F4, para a célula e a barra de fórmulas.
 * Devolve true se a tecla foi tratada aqui.
 */
export function teclaDeFormula(e: KeyboardEvent<HTMLInputElement>, store: StoreSimulador): boolean {
  const s = store.getState();
  if (s.modo === "pronto") return false;
  const el = e.currentTarget;
  const cursor = el.selectionStart ?? s.rascunho.length;

  if (e.key === "F4") {
    e.preventDefault();
    const r = alternarReferencia(s.rascunho, cursor);
    if (r) aplicar(store, el, r);
    return true;
  }

  const { lista } = calcular(s.modo, s.rascunho, cursor, s.sugestoesFechadas);
  if (lista.length === 0) return false;
  const i = Math.min(s.indiceSugestao, lista.length - 1);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const d = e.key === "ArrowDown" ? 1 : -1;
    store.setState({ indiceSugestao: (i + d + lista.length) % lista.length });
    return true;
  }
  if (e.key === "Tab" || e.key === "Enter") {
    e.preventDefault();
    aplicar(store, el, completar(s.rascunho, cursor, lista[i].nome));
    return true;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    store.setState({ sugestoesFechadas: true });
    return true;
  }
  return false;
}

/** Lista de funções ou dica de argumentos, posicionada pela Grade. */
export function AjudaFormula({ left, top }: { left: number; top: number }) {
  const { store, entradaRef } = useSimulador();
  const modo = useEstado((e) => e.modo);
  const rascunho = useEstado((e) => e.rascunho);
  const cursor = useEstado((e) => e.cursor);
  const fechadas = useEstado((e) => e.sugestoesFechadas);
  const indice = useEstado((e) => e.indiceSugestao);
  const { lista, atual } = calcular(modo, rascunho, cursor, fechadas);
  if (!lista.length && !atual) return null;

  const estilo = { left, top };
  const caixa = "absolute z-30 max-w-[min(420px,90vw)] rounded-md border border-zinc-300 bg-white text-[13px] shadow-lg";

  if (lista.length) {
    const ativo = Math.min(indice, lista.length - 1);
    return (
      <ul role="listbox" aria-label="Funções" className={`${caixa} w-72 py-1`} style={estilo} data-testid="sugestoes">
        {lista.map((f, i) => (
          <li
            key={f.nome}
            role="option"
            aria-selected={i === ativo}
            onMouseDown={(e) => {
              e.preventDefault(); // não tira o foco do campo
              const el =
                document.activeElement instanceof HTMLInputElement ? document.activeElement : entradaRef.current;
              const s = store.getState();
              aplicar(store, el, completar(s.rascunho, el?.selectionStart ?? s.cursor, f.nome));
            }}
            onMouseEnter={() => store.setState({ indiceSugestao: i })}
            className={`cursor-pointer px-2 py-1 ${i === ativo ? "bg-accent-soft" : ""}`}
          >
            <span className="font-mono font-semibold text-ink">{f.nome}</span>
            {i === ativo && <span className="block text-xs text-zinc-600">{f.desc}</span>}
          </li>
        ))}
        <li className="border-t border-line px-2 pt-1 text-[11px] text-zinc-500" aria-hidden>
          Tab ou Enter para escolher · Esc fecha
        </li>
      </ul>
    );
  }

  const { funcao, argumento } = atual!;
  const destaque = argumentoDestacado(funcao, argumento);
  return (
    <div role="tooltip" className={`${caixa} w-max px-2 py-1`} style={estilo} data-testid="dica-argumentos">
      <p className="font-mono text-zinc-700">
        {funcao.nome}(
        {funcao.args.map((a, i) => (
          <Fragment key={i}>
            {i > 0 && "; "}
            {i === destaque ? <strong className="text-ink">{a}</strong> : a}
          </Fragment>
        ))}
        )
      </p>
      <p className="text-xs text-zinc-500">{funcao.desc}</p>
    </div>
  );
}
