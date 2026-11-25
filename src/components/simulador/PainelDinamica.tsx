"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { useSemTeclado } from "@/lib/toque";
import type { Dinamica, FuncaoValor, MostrarValor } from "@/content/schema";
import { deEndereco } from "@/engine/address";
import { NOMES_FUNCAO, rotuloValor } from "@/engine/dinamica";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";
import { IconeTabelaDinamica } from "./BarraDados";
import { useEscape, useFocoDentro, useFocoPreso } from "./teclado";
import {
  NOMES_AREA,
  campoUsado,
  filtrarItens,
  marcarCampo,
  moverCampo,
  mudarFuncao,
  mudarMostrar,
  removerDaArea,
  type Area,
  type Origem,
} from "./dinamica-acoes";

const AREAS: Area[] = ["filtros", "colunas", "linhas", "valores"];
const FUNCOES: FuncaoValor[] = ["soma", "contagem", "media", "max", "min"];
const TIPO_ARRASTE = "application/x-campo-dinamica";

type Arrastado = { letra: string; origem: Origem };

/**
 * "Campos da Tabela Dinâmica": a lista de campos e as quatro áreas (Filtros,
 * Colunas, Linhas, Valores). Arrastar funciona como no Excel; no celular (sem
 * arrastar), a caixa de seleção e o menu "Mover para" fazem o mesmo.
 * Mostra a tabela dinâmica da célula ativa (ou a última criada).
 */
export function PainelDinamica() {
  const { planilha, store } = useSimulador();
  useVersaoPlanilha();
  const semTeclado = useSemTeclado();
  const ancora = useEstado((e) => e.ancora);
  const [erro, setErro] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Area | "lista" | null>(null);
  const tabelas = planilha.tabelasDinamicas();
  if (tabelas.length === 0) return null;
  const naCelula = planilha.dinamicaEm(ancora);
  const i = naCelula >= 0 ? naCelula : tabelas.length - 1;
  const { config: d, erro: erroTabela } = tabelas[i];
  const campos = planilha.camposDaDinamica(i);
  const nome = (letra: string) => campos.find((c) => c.letra === letra)?.nome ?? letra;
  const numerico = (letra: string) => campos.find((c) => c.letra === letra)?.numerico ?? false;

  const aplicar = (r: { config: Dinamica } | { erro: string }) => {
    if ("erro" in r) return setErro(r.erro);
    setErro(null);
    planilha.configurarDinamica(i, r.config);
  };
  const mover = (letra: string, para: Area | "lista" | "duplicar", origem: Origem) => {
    // O mesmo campo mais uma vez em Valores (no Excel, arrastando-o de novo da lista): "Soma de Valor2".
    if (para === "duplicar") return aplicar(moverCampo(d, letra, "valores", numerico(letra)));
    if (para === "lista") {
      if (origem) aplicar({ config: removerDaArea(d, origem.area, origem.indice) });
      return;
    }
    aplicar(moverCampo(d, letra, para, numerico(letra), origem));
  };

  const arrastar = (x: Arrastado) => (e: DragEvent) => {
    e.dataTransfer.setData(TIPO_ARRASTE, JSON.stringify(x));
    e.dataTransfer.effectAllowed = "move";
  };
  const alvo = (para: Area | "lista") => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(TIPO_ARRASTE)) return;
      e.preventDefault();
      setSobre(para);
    },
    onDragLeave: () => setSobre((s) => (s === para ? null : s)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setSobre(null);
      const x = JSON.parse(e.dataTransfer.getData(TIPO_ARRASTE) || "null") as Arrastado | null;
      if (x) mover(x.letra, para, x.origem);
    },
  });

  // Itens de cada área, com o índice dentro dela.
  const itens = (area: Area): { letra: string; indice: number }[] =>
    area === "valores"
      ? d.valores.map((v, indice) => ({ letra: v.campo, indice }))
      : area === "filtros"
        ? d.filtros.map((f, indice) => ({ letra: f.campo, indice }))
        : d[area].map((letra, indice) => ({ letra, indice }));

  return (
    <section
      aria-label="Campos da Tabela Dinâmica"
      data-testid="painel-dinamica"
      data-foco-proprio
      className="rounded-md border border-zinc-300 bg-white p-3 text-[13px] shadow-sm"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <IconeTabelaDinamica />
        <h3 className="font-semibold">Campos da Tabela Dinâmica</h3>
        {tabelas.length > 1 && <span className="text-xs text-zinc-500">({d.destino}; clique numa tabela para trocar)</span>}
        <button
          type="button"
          className="ml-auto min-h-6 rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-header hover:text-zinc-800"
          onClick={() => {
            planilha.removerDinamica(i);
            setErro(null);
          }}
          data-testid="remover-dinamica"
        >
          Remover tabela dinâmica
        </button>
      </div>
      {(erro || erroTabela) && (
        <p role="alert" className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800" data-testid="erro-dinamica">
          {erro ?? erroTabela}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <div {...alvo("lista")} className={`rounded border p-1 ${sobre === "lista" ? "border-success bg-success/5" : "border-zinc-200"}`}>
          <p className="px-1 pb-1 text-xs text-zinc-500">Escolha os campos:</p>
          <ul className="space-y-0.5" data-testid="lista-campos">
            {campos.map((c) => (
              <li
                key={c.letra}
                draggable
                onDragStart={arrastar({ letra: c.letra, origem: null })}
                className="flex min-h-7 cursor-grab items-center gap-2 rounded px-1 py-0.5 hover:bg-header"
              >
                <input
                  type="checkbox"
                  id={`campo-${c.letra}`}
                  checked={campoUsado(d, c.letra)}
                  onChange={() => aplicar(marcarCampo(d, c.letra, c.numerico))}
                  data-campo={c.nome}
                />
                <label htmlFor={`campo-${c.letra}`} className="min-w-0 flex-1 cursor-pointer truncate py-1">
                  {c.nome}
                </label>
              </li>
            ))}
          </ul>
          <p className="px-1 pt-2 text-[11px] leading-snug text-zinc-500">
            {semTeclado ? "Marque os campos, ou use o ⋯ de cada um para escolher a área." : "Arraste os campos para as áreas, ou use o ⋯ de cada um."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AREAS.map((area) => (
            <div
              key={area}
              {...alvo(area)}
              data-area={area}
              className={`min-h-20 rounded border p-1 ${sobre === area ? "border-success bg-success/5" : "border-zinc-200 bg-zinc-50"}`}
            >
              <p className="flex items-center gap-1 px-1 pb-1 text-xs font-medium text-zinc-600">
                {area === "valores" ? "Σ " : ""}
                {NOMES_AREA[area]}
              </p>
              <ul className="space-y-1">
                {itens(area).map(({ letra, indice }) => (
                  <ItemArea
                    key={`${area}-${indice}`}
                    area={area}
                    rotulo={area === "valores" ? rotuloValor(d.valores[indice].funcao, nome(letra)) : nome(letra)}
                    funcao={area === "valores" ? d.valores[indice].funcao : undefined}
                    mostrar={area === "valores" ? (d.valores[indice].mostrar ?? null) : undefined}
                    mudarMostrar={(m) => aplicar({ config: mudarMostrar(d, indice, m) })}
                    arrastar={arrastar({ letra, origem: { area, indice } })}
                    mover={(para) => mover(letra, para, { area, indice })}
                    mudarFuncao={(f) => aplicar({ config: mudarFuncao(d, indice, f) })}
                    filtro={
                      area === "filtros"
                        ? {
                            itens: planilha.itensDoCampo(i, letra),
                            marcados: d.filtros[indice].valores,
                            aplicar: (v) => aplicar({ config: filtrarItens(d, letra, v) }),
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {naCelula < 0 && (
        <button
          type="button"
          className="mt-2 min-h-6 text-xs text-zinc-500 underline hover:text-zinc-800"
          onClick={() => {
            const p = deEndereco(d.destino);
            store.setState({ ancora: p, foco: p });
          }}
        >
          Ir para a tabela dinâmica ({d.destino})
        </button>
      )}
    </section>
  );
}

type PropsItem = {
  area: Area;
  rotulo: string;
  funcao?: FuncaoValor;
  arrastar: (e: DragEvent) => void;
  mover: (para: Area | "lista" | "duplicar") => void;
  mudarFuncao: (f: FuncaoValor) => void;
  /** "Mostrar Valores como" (só em Valores; `null` = Sem Cálculo). */
  mostrar?: MostrarValor | null;
  mudarMostrar: (m: MostrarValor | null) => void;
  filtro?: { itens: string[]; marcados: string[] | null; aplicar: (v: string[] | null) => void };
};

function ItemArea({ area, rotulo, funcao, mostrar, mudarMostrar, arrastar, mover, mudarFuncao, filtro }: PropsItem) {
  const [aberto, setAberto] = useState(false);
  const botaoFiltroRef = useRef<HTMLButtonElement>(null);
  return (
    <li
      draggable
      onDragStart={arrastar}
      data-item-area={rotulo}
      className="relative flex cursor-grab flex-wrap items-center gap-1 rounded border border-zinc-300 bg-white px-1.5 py-1 shadow-sm"
    >
      {/* Em Valores, o rótulo ("Soma de Valor") ganha a linha toda e os controles vão para baixo. */}
      <span className={`min-w-0 truncate font-medium ${funcao ? "w-full" : "flex-1"}`}>{rotulo}</span>
      {funcao && (
        <select
          aria-label={`Resumir ${rotulo} por`}
          value={funcao}
          onChange={(e) => mudarFuncao(e.target.value as FuncaoValor)}
          className="min-h-6 rounded border border-zinc-300 bg-white px-0.5 text-xs"
          data-testid="funcao-valor"
        >
          {FUNCOES.map((f) => (
            <option key={f} value={f}>
              {NOMES_FUNCAO[f]}
            </option>
          ))}
        </select>
      )}
      {funcao && (
        <select
          aria-label={`Mostrar ${rotulo} como`}
          title="Mostrar Valores como"
          value={mostrar ?? ""}
          onChange={(e) => mudarMostrar((e.target.value || null) as MostrarValor | null)}
          className="min-h-6 min-w-0 rounded border border-zinc-300 bg-white px-0.5 text-xs"
          data-testid="mostrar-valor"
        >
          <option value="">Sem Cálculo</option>
          <option value="totalGeral">% do Total Geral</option>
        </select>
      )}
      {filtro && (
        <button
          ref={botaoFiltroRef}
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="min-h-6 rounded border border-zinc-300 px-1 text-xs hover:bg-header"
          aria-expanded={aberto}
          aria-haspopup="dialog"
          aria-label={`Itens do filtro ${rotulo}`}
          data-testid="itens-filtro-dinamica"
        >
          {filtro.marcados === null ? "(Tudo)" : filtro.marcados.length === 1 ? filtro.marcados[0] || "(vazio)" : "(Vários itens)"} ▾
        </button>
      )}
      {/* "⋯" visível, com o select nativo transparente por cima (funciona no celular sem arrastar).
          O anel aparece no span, porque o select invisível não mostra o foco. */}
      <span className="relative ml-auto inline-flex h-6 w-7 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-600 focus-within:ring-2 focus-within:ring-success hover:bg-header">
        ⋯
        <select
          aria-label={`Mover ${rotulo}`}
          value=""
          onChange={(e) => mover(e.target.value as Area | "lista" | "duplicar")}
          className="absolute inset-0 cursor-pointer opacity-0"
          title="Mover para…"
        >
        <option value="" disabled>
          Mover para…
        </option>
        {AREAS.filter((a) => a !== area || a === "valores").map((a) => (
          <option key={a} value={a} className="text-zinc-900">
            {NOMES_AREA[a]}
          </option>
        ))}
        {area === "valores" && (
          <option value="duplicar" className="text-zinc-900">
            Mais uma vez em Valores
          </option>
        )}
        <option value="lista" className="text-zinc-900">
          Remover campo
        </option>
        </select>
      </span>
      {filtro && aberto && (
        <ItensFiltro
          {...filtro}
          rotulo={rotulo}
          fechar={() => {
            setAberto(false);
            requestAnimationFrame(() => botaoFiltroRef.current?.focus());
          }}
        />
      )}
    </li>
  );
}

/** A lista de caixas do filtro da tabela dinâmica (com "Selecionar Vários Itens" implícito). */
function ItensFiltro({ itens, marcados, aplicar, fechar, rotulo }: NonNullable<PropsItem["filtro"]> & { fechar: () => void; rotulo: string }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(marcados ?? itens));
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEscape(ref, fechar);
  useFocoDentro(ref, "input", false);
  useFocoPreso(ref);
  useEffect(() => {
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fechar();
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [fechar]);
  const todos = itens.every((x) => sel.has(x));
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={`Itens do filtro ${rotulo}`}
      id={id}
      className="absolute top-full left-0 z-40 mt-1 w-52 rounded-md border border-zinc-300 bg-white p-1 shadow-lg"
      data-testid="menu-itens-dinamica"
    >
      <div className="max-h-44 overflow-auto py-1">
        <label className="flex min-h-6 items-center gap-2 px-2 py-0.5 hover:bg-header">
          <input type="checkbox" checked={todos} onChange={() => setSel(todos ? new Set() : new Set(itens))} />
          (Tudo)
        </label>
        {itens.map((x) => (
          <label key={x} className="flex min-h-6 items-center gap-2 px-2 py-0.5 hover:bg-header">
            <input
              type="checkbox"
              checked={sel.has(x)}
              data-item-dinamica={x}
              onChange={() =>
                setSel((s) => {
                  const n = new Set(s);
                  if (n.has(x)) n.delete(x);
                  else n.add(x);
                  return n;
                })
              }
            />
            <span className="truncate">{x === "" ? "(vazio)" : x}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 p-1">
        <button
          type="button"
          disabled={sel.size === 0}
          onClick={() => {
            aplicar(todos ? null : itens.filter((x) => sel.has(x)));
            fechar();
          }}
          className="rounded bg-success px-3 py-0.5 font-medium text-white disabled:opacity-40"
          data-testid="itens-dinamica-ok"
        >
          OK
        </button>
        <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-0.5 hover:bg-header">
          Cancelar
        </button>
      </div>
    </div>
  );
}
