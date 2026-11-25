"use client";

import { useId, useRef, useState } from "react";
import { colunaParaLetras, type Intervalo } from "@/engine/address";
import { useSimulador } from "./contexto";
import { useEscape, useFocoPreso } from "./teclado";

type Nivel = { coluna: number; ordem: "asc" | "desc" };

/**
 * A janela "Classificar" do Excel (Dados → Classificar), resumida: níveis de
 * "Classificar por" / "E depois por", cada um com coluna e ordem, Adicionar e
 * Excluir Nível e "Meus dados contêm cabeçalhos". O primeiro nível manda; os
 * outros só desempatam.
 */
export function ClassificarNiveis({ tabela, cabecalhoInicial, fechar }: { tabela: Intervalo; cabecalhoInicial: boolean; fechar: (classificou?: boolean) => void }) {
  const { planilha, store, entradaRef } = useSimulador();
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEscape(ref, () => fechar());
  useFocoPreso(ref);
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial);
  const colunas = Array.from({ length: tabela.fim.coluna - tabela.inicio.coluna + 1 }, (_, i) => tabela.inicio.coluna + i);
  const [niveis, setNiveis] = useState<Nivel[]>(() => {
    const ativa = store.getState().ancora.coluna;
    return [{ coluna: colunas.includes(ativa) ? ativa : colunas[0], ordem: "asc" }];
  });

  const nome = (c: number) => {
    const t = cabecalho ? planilha.exibicao({ linha: tabela.inicio.linha, coluna: c }).trim() : "";
    return t || `Coluna ${colunaParaLetras(c)}`;
  };
  // Coluna só de números: o Excel troca "A a Z" por "Do Menor para o Maior".
  const numerica = (c: number) => {
    let algum = false;
    for (let l = tabela.inicio.linha + (cabecalho ? 1 : 0); l <= tabela.fim.linha; l++) {
      const v = planilha.valor({ linha: l, coluna: c });
      if (v === null || v === "") continue;
      if (typeof v !== "number") return false;
      algum = true;
    }
    return algum;
  };
  const mudar = (i: number, n: Partial<Nivel>) => setNiveis((xs) => xs.map((x, k) => (k === i ? { ...x, ...n } : x)));
  const livre = colunas.find((c) => !niveis.some((n) => n.coluna === c));

  const ok = (e: React.FormEvent) => {
    e.preventDefault();
    store.getState().classificarNiveis(niveis, cabecalho);
    entradaRef.current?.focus({ preventScroll: true });
    fechar(true);
  };

  const campo = "rounded border border-zinc-300 px-2 py-1 text-[13px] outline-none focus:border-success focus:ring-2 focus:ring-success/40";
  return (
    <form
      ref={ref}
      onSubmit={ok}
      data-foco-proprio
      data-testid="dialogo-classificar"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-titulo`}
      className="space-y-2 rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-semibold" id={`${id}-titulo`}>
          Classificar
        </p>
        <button
          type="button"
          disabled={livre === undefined || niveis.length >= 3}
          onClick={() => livre !== undefined && niveis.length < 3 && setNiveis((xs) => [...xs, { coluna: livre, ordem: "asc" }])}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-header disabled:text-zinc-400"
          data-testid="adicionar-nivel"
        >
          + Adicionar Nível
        </button>
        <button
          type="button"
          disabled={niveis.length === 1}
          onClick={() => setNiveis((xs) => xs.slice(0, -1))}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-header disabled:text-zinc-400"
          data-testid="excluir-nivel"
        >
          Excluir Nível
        </button>
        <label className="flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={cabecalho} onChange={(e) => setCabecalho(e.target.checked)} data-testid="classificar-cabecalho" />
          Meus dados contêm cabeçalhos
        </label>
      </div>
      <ol className="space-y-1.5">
        {niveis.map((n, i) => {
          const num = numerica(n.coluna);
          return (
            <li key={i} className="flex flex-wrap items-center gap-2" data-testid={`nivel-${i}`}>
              <span className="w-28 text-[13px] text-zinc-600">{i === 0 ? "Classificar por" : "E depois por"}</span>
              <select
                value={n.coluna}
                onChange={(e) => mudar(i, { coluna: Number(e.target.value) })}
                className={campo}
                aria-label={`Coluna do nível ${i + 1}`}
                data-testid={`nivel-coluna-${i}`}
                autoFocus={i === 0}
              >
                {colunas.map((c) => (
                  <option key={c} value={c}>
                    {nome(c)}
                  </option>
                ))}
              </select>
              <select
                value={n.ordem}
                onChange={(e) => mudar(i, { ordem: e.target.value as Nivel["ordem"] })}
                className={campo}
                aria-label={`Ordem do nível ${i + 1}`}
                data-testid={`nivel-ordem-${i}`}
              >
                <option value="asc">{num ? "Do Menor para o Maior" : "De A a Z"}</option>
                <option value="desc">{num ? "Do Maior para o Menor" : "De Z a A"}</option>
              </select>
            </li>
          );
        })}
      </ol>
      <div className="flex justify-end gap-2">
        <button type="submit" className="rounded bg-success px-3 py-1 font-medium text-white" data-testid="classificar-ok">
          OK
        </button>
        <button type="button" onClick={() => fechar()} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
          Cancelar
        </button>
      </div>
    </form>
  );
}
