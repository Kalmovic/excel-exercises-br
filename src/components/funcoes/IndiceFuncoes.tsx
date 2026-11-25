"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

export type ItemIndice = { slug: string; nome: string; ingles: string; categoria: string; descricao: string; letra: string };
type Categoria = { slug: string; titulo: string };

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** "Cont.Se" e "contse" se encontram: sem acento, sem pontuação, sem maiúsculas. */
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * O índice A–Z do guia: a lista inteira já vem no HTML (para buscadores e sem
 * JavaScript); a busca e o filtro de categoria só escondem o que não serve.
 */
export function IndiceFuncoes({ itens, categorias }: { itens: ItemIndice[]; categorias: readonly Categoria[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const idBusca = useId();
  const tituloCategoria = new Map(categorias.map((c) => [c.slug, c.titulo]));

  const visiveis = useMemo(() => {
    const q = normalizar(busca);
    return itens.filter(
      (i) => (!categoria || i.categoria === categoria) && (!q || normalizar(i.nome).includes(q) || normalizar(i.ingles).includes(q)),
    );
  }, [itens, busca, categoria]);

  const porLetra = new Map<string, ItemIndice[]>();
  for (const i of visiveis) porLetra.set(i.letra, [...(porLetra.get(i.letra) ?? []), i]);

  const botao = (ativo: boolean) =>
    `rounded-full border px-3 py-1 text-sm font-medium ${ativo ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink"}`;

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="space-y-1">
          <label htmlFor={idBusca} className="text-sm font-medium">
            Buscar função (em português ou inglês)
          </label>
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: PROCV, SOMASE, VLOOKUP"
            data-testid="busca-funcoes"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-base outline-none focus:border-success"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!categoria} onClick={() => setCategoria("")} className={botao(!categoria)}>
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={categoria === c.slug}
              onClick={() => setCategoria(categoria === c.slug ? "" : c.slug)}
              className={botao(categoria === c.slug)}
              data-testid={`categoria-${c.slug}`}
            >
              {c.titulo}
            </button>
          ))}
        </div>
        <nav aria-label="Letras" className="flex flex-wrap gap-1 font-mono text-sm">
          {LETRAS.map((l) =>
            porLetra.has(l) ? (
              <a key={l} href={`#letra-${l}`} className="rounded px-2 py-1 font-semibold text-success hover:bg-success-bg">
                {l}
              </a>
            ) : (
              <span key={l} className="px-2 py-1 text-zinc-500/60" aria-hidden="true">
                {l}
              </span>
            ),
          )}
        </nav>
        <p className="text-sm text-zinc-500" aria-live="polite" data-testid="contagem-funcoes">
          {visiveis.length === 1 ? "1 função" : `${visiveis.length} funções`}
        </p>
      </div>

      {visiveis.length === 0 && (
        <p className="rounded-lg bg-warning-bg p-4 text-muted">
          Nenhuma função encontrada. Tente o nome em português (PROCV) ou em inglês (VLOOKUP), ou limpe o filtro.
        </p>
      )}

      {[...porLetra.entries()].map(([letra, lista]) => (
        <section key={letra} id={`letra-${letra}`} className="scroll-mt-4 space-y-2">
          <h2 className="font-display text-2xl font-bold">{letra}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lista.map((i) => (
              <li key={i.slug} data-testid="item-funcao">
                <Link
                  href={`/funcoes/${i.slug}`}
                  className="block h-full rounded-lg border border-line bg-surface p-3 hover:border-ink"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono font-semibold text-ink">{i.nome}</span>
                    <span className="font-mono text-xs text-zinc-500">{i.ingles}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted [overflow-wrap:anywhere]">{i.descricao}</span>
                  <span className="mt-2 inline-block rounded bg-header px-2 py-0.5 text-xs text-zinc-500">
                    {tituloCategoria.get(i.categoria)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
