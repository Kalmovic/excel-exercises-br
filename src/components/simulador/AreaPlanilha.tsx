"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useStore } from "zustand";
import type { Exercicio } from "@/content/schema";
import { intervaloParaTexto, normalizar, type Pos } from "@/engine/address";
import { BarraDados } from "./BarraDados";
import { BarraFormatacao } from "./BarraFormatacao";
import { BarraFormulas } from "./BarraFormulas";
import { BarraToque } from "./BarraToque";
import { Contexto, type ContextoSimulador } from "./contexto";
import { Grade } from "./Grade";
import { PainelDinamica } from "./PainelDinamica";
import { PainelGrafico } from "./PainelGrafico";
import { navegarItens } from "./teclado";
import { criarStore, type StoreSimulador } from "./store";

type Props = {
  ex: Exercicio;
  nucleo: Omit<ContextoSimulador, "entradaRef">;
  entradaRef: RefObject<HTMLInputElement | null>;
  barraToque: boolean;
};

/** Nome de aba como vai na fórmula: com aspas simples quando tem espaço ou começa com número. */
export const prefixoDaAba = (nome: string) => (/^[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*$/.test(nome) ? `${nome}!` : `'${nome.replace(/'/g, "''")}'!`);

/**
 * Barras, barra de fórmulas, grade e painéis. Com várias abas, também a barra
 * de abas embaixo da grade, um store por aba (cada uma lembra a própria
 * seleção, como no Excel) e o "apontar em outra aba": com uma fórmula em
 * edição, clicar em outra aba e numa célula insere `Vendas!B2` na fórmula; o
 * Enter grava e volta para a aba de origem.
 */
export function AreaPlanilha({ ex, nucleo, entradaRef, barraToque }: Props) {
  const pasta = nucleo.planilha.pasta;
  const abas = useMemo(() => pasta?.abas ?? [nucleo.planilha], [pasta, nucleo.planilha]);
  const nomes = pasta?.nomes() ?? [];
  // A primeira aba usa o store do exercício (correção, progresso); as outras ganham o seu.
  const stores = useMemo<StoreSimulador[]>(() => abas.map((p, i) => (i === 0 ? nucleo.store : criarStore(p))), [abas, nucleo.store]);
  const [ativa, setAtiva] = useState(0);
  const [origem, setOrigem] = useState<number | null>(null);
  const aba = Math.min(ativa, abas.length - 1);

  // Fórmula sendo escrita na aba de origem (para desenhar as referências desta aba e inserir as novas).
  const storeOrigem = stores[origem ?? aba];
  const rascunhoOrigem = useStore(storeOrigem, (s) => s.rascunho);
  const modoOrigem = useStore(storeOrigem, (s) => s.modo);

  // Gravou (Enter) ou cancelou (Esc) a fórmula que apontava para outra aba: volta para a origem.
  // (Ajuste de estado durante a renderização, o padrão do React para estado derivado.)
  if (origem !== null && modoOrigem === "pronto") {
    setAtiva(origem);
    setOrigem(null);
  }

  // O trecho inserido pelo último clique: cliques seguidos o substituem, como no Excel.
  const segmento = useRef<{ ini: number; fim: number; rascunho: string } | null>(null);
  const apontarExterno = (de: Pos, ate: Pos) => {
    if (origem === null) return;
    const st = stores[origem];
    const s = st.getState();
    const texto = prefixoDaAba(nomes[aba]) + intervaloParaTexto(normalizar(de, ate));
    const seg = segmento.current;
    const [ini, fim] = seg && seg.rascunho === s.rascunho ? [seg.ini, seg.fim] : [s.cursor, s.cursor];
    const novo = s.rascunho.slice(0, ini) + texto + s.rascunho.slice(fim);
    s.setRascunho(novo);
    st.setState({ cursor: ini + texto.length });
    segmento.current = { ini, fim: ini + texto.length, rascunho: novo };
    // A digitação continua na barra de fórmulas (a célula de origem está em outra aba).
    requestAnimationFrame(() => {
      const barra = document.querySelector<HTMLInputElement>('[data-testid="barra-formulas"]');
      barra?.focus();
      barra?.setSelectionRange(ini + texto.length, ini + texto.length);
    });
  };

  const trocarAba = (i: number) => {
    if (i === aba) return;
    if (origem !== null) {
      // Voltando para a aba da fórmula: continua editando lá.
      if (i === origem) setOrigem(null);
      setAtiva(i);
      return;
    }
    const s = stores[aba].getState();
    if (s.modo !== "pronto") {
      if (s.rascunho.startsWith("=")) {
        segmento.current = null;
        setOrigem(aba);
        setAtiva(i);
        return;
      }
      if (!s.confirmar()) return;
    }
    setAtiva(i);
  };

  const contextoDa = (i: number): ContextoSimulador => ({
    ...nucleo,
    entradaRef,
    planilha: abas[i],
    store: stores[i],
    // Os destaques do exercício valem para a primeira aba (onde ficam as respostas).
    alvos: i === 0 ? nucleo.alvos : new Set(),
    ...(pasta ? { nomeAba: nomes[i] } : {}),
  });
  const ctxAba: ContextoSimulador = {
    ...contextoDa(aba),
    ...(origem !== null ? { apontarExterno, formulaExterna: rascunhoOrigem } : {}),
  };
  const larguras = aba === 0 ? ex.grade.larguras : ex.abas?.[aba - 1]?.grade.larguras;

  return (
    <>
      <Contexto.Provider value={ctxAba}>
        {nucleo.formatacao && <BarraFormatacao />}
        {(nucleo.dados || nucleo.dinamica || nucleo.condicional || nucleo.grafico || nucleo.validacao) && <BarraDados />}
        {barraToque && <BarraToque />}
      </Contexto.Provider>
      {/* Apontando de outra aba: a barra de fórmulas é a da célula de origem. */}
      <Contexto.Provider value={origem !== null ? contextoDa(origem) : ctxAba}>
        <BarraFormulas />
      </Contexto.Provider>
      <Contexto.Provider value={ctxAba}>
        <Grade key={aba} larguras={larguras} />
        {pasta && (
          <div
            role="tablist"
            aria-label="Abas da planilha"
            className="flex flex-wrap items-end gap-0.5 border-t-2 border-zinc-300 pl-2"
            data-testid="abas"
            onKeyDown={(e) => {
              // ← → Home End trocam de aba (com o foco junto), como numa lista de abas.
              const alvo = navegarItens(e, '[role="tab"]', "horizontal");
              if (alvo) trocarAba(nomes.indexOf(alvo.dataset.aba ?? ""));
            }}
          >
            {nomes.map((nome, i) => (
              <button
                key={nome}
                type="button"
                role="tab"
                aria-selected={i === aba}
                tabIndex={i === aba ? 0 : -1}
                data-aba={nome}
                // mousedown + preventDefault: o clique não tira o foco da grade; o click vem também do Enter e do Espaço.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => trocarAba(i)}
                className={`-mt-0.5 min-h-7 rounded-b-md border border-t-0 px-3 py-1 text-[13px] ${
                  i === aba ? "border-zinc-300 bg-white font-semibold text-success shadow-sm" : "border-transparent text-zinc-600 hover:bg-white/70"
                }`}
              >
                {nome}
              </button>
            ))}
            {origem !== null && (
              <span className="ml-2 pb-1 text-xs text-zinc-500" data-testid="aviso-apontar">
                Clique ou toque numa célula para usar na fórmula de {nomes[origem]} · Enter grava
              </span>
            )}
          </div>
        )}
        {nucleo.dinamica && <PainelDinamica />}
        {nucleo.grafico && <PainelGrafico />}
      </Contexto.Provider>
    </>
  );
}
