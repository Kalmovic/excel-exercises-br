"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { colunaParaLetras } from "@/engine/address";
import { useSimulador, useVersaoPlanilha } from "./contexto";
import { useEscape, useFocoDentro } from "./teclado";

/** Funil do Excel: a coluna tem um critério de filtro. */
export function IconeFunil() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden fill="currentColor">
      <path d="M1 1.5h10L7.2 6.3V10L4.8 11V6.3z" />
    </svg>
  );
}

type Props = { coluna: number; left: number; top: number; fechar: () => void };

/**
 * Menu da seta do AutoFiltro, como no Excel: classificar pela coluna, limpar o
 * filtro dela e escolher, nas caixas de seleção, os valores que ficam visíveis.
 */
export function MenuFiltro({ coluna, left, top, fechar }: Props) {
  const { planilha, store } = useSimulador();
  useVersaoPlanilha();
  const filtro = planilha.filtroAtual();
  const letra = colunaParaLetras(coluna);
  const cabecalho = filtro ? planilha.exibicao({ linha: filtro.intervalo.inicio.linha, coluna }) || `Coluna ${letra}` : "";
  const valores = useMemo(() => planilha.valoresDaColuna(coluna), [planilha, coluna]);
  const atual = filtro?.criterios[letra];
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(atual ? valores.filter((v) => atual.includes(v)) : valores));
  const [busca, setBusca] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Numérica: o Excel troca "A a Z" por "Menor para o Maior".
  const numerica = useMemo(() => {
    if (!filtro) return false;
    let algum = false;
    for (let l = filtro.intervalo.inicio.linha + 1; l <= filtro.intervalo.fim.linha; l++) {
      const v = planilha.valor({ linha: l, coluna });
      if (v === null || v === "") continue;
      if (typeof v !== "number") return false;
      algum = true;
    }
    return algum;
  }, [planilha, filtro, coluna]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [fechar]);
  // Abre com o foco dentro (no 1º item); Esc fecha e o foco volta para quem abriu.
  useEscape(ref, fechar);
  useFocoDentro(ref);

  if (!filtro) return null;

  const visiveis = busca ? valores.filter((v) => (v || "(Vazias)").toLowerCase().includes(busca.toLowerCase())) : valores;
  const todos = visiveis.every((v) => marcados.has(v));
  const alternar = (v: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  const alternarTodos = () =>
    setMarcados((m) => {
      const n = new Set(m);
      for (const v of visiveis) {
        if (todos) n.delete(v);
        else n.add(v);
      }
      return n;
    });

  const aplicar = () => {
    // Com busca, o Excel aplica só o que está marcado entre os resultados da busca.
    const escolhidos = busca ? visiveis.filter((v) => marcados.has(v)) : valores.filter((v) => marcados.has(v));
    planilha.filtrarColuna(coluna, escolhidos.length === valores.length ? null : escolhidos);
    fechar();
  };

  const classificar = (ordem: "asc" | "desc") => {
    store.getState().classificar(ordem, coluna);
    fechar();
  };

  const item = "flex min-h-7 w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-header disabled:text-zinc-400 disabled:hover:bg-transparent";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={`Filtro da coluna ${cabecalho}`}
      data-testid="menu-filtro"
      data-foco-proprio
      className="absolute z-40 w-60 rounded-md border border-zinc-300 bg-white p-1 text-[13px] shadow-lg"
      style={{ left, top }}
    >
      <button type="button" className={item} onClick={() => classificar("asc")} data-testid="filtro-classificar-asc">
        <span aria-hidden className="w-6 text-[10px] font-semibold text-zinc-500">{numerica ? "1→9" : "A→Z"}</span>
        {numerica ? "Classificar do Menor para o Maior" : "Classificar de A a Z"}
      </button>
      <button type="button" className={item} onClick={() => classificar("desc")} data-testid="filtro-classificar-desc">
        <span aria-hidden className="w-6 text-[10px] font-semibold text-zinc-500">{numerica ? "9→1" : "Z→A"}</span>
        {numerica ? "Classificar do Maior para o Menor" : "Classificar de Z a A"}
      </button>
      <div className="my-1 border-t border-zinc-200" />
      <button
        type="button"
        className={item}
        disabled={!atual}
        onClick={() => {
          planilha.filtrarColuna(coluna, null);
          fechar();
        }}
        data-testid="filtro-limpar-coluna"
      >
        <span aria-hidden className="w-6 text-zinc-500">
          <IconeFunil />
        </span>
        Limpar filtro de “{cabecalho}”
      </button>
      <div className="my-1 border-t border-zinc-200" />
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar"
        aria-label="Pesquisar valores"
        className="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-[13px] outline-none focus:border-success focus:ring-2 focus:ring-success/40"
      />
      <div className="max-h-48 overflow-auto rounded border border-zinc-200 py-1">
        <label className="flex min-h-6 cursor-pointer items-center gap-2 px-2 py-0.5 hover:bg-header">
          <input type="checkbox" checked={todos && visiveis.length > 0} onChange={alternarTodos} data-testid="filtro-selecionar-tudo" />
          {busca ? "(Selecionar Todos os Resultados da Pesquisa)" : "(Selecionar Tudo)"}
        </label>
        {visiveis.map((v) => (
          <label key={v} className="flex min-h-6 cursor-pointer items-center gap-2 px-2 py-0.5 hover:bg-header">
            <input type="checkbox" checked={marcados.has(v)} onChange={() => alternar(v)} data-valor-filtro={v} />
            <span className="truncate">{v === "" ? "(Vazias)" : v}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2 p-1">
        <button
          type="button"
          onClick={aplicar}
          disabled={(busca ? visiveis : valores).every((v) => !marcados.has(v))}
          className="rounded bg-success px-3 py-1 font-medium text-white disabled:opacity-40"
          data-testid="filtro-ok"
        >
          OK
        </button>
        <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
          Cancelar
        </button>
      </div>
    </div>
  );
}
