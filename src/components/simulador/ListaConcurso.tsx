"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";

type Item = { slug: string; titulo: string; banca: string; tema: string; versao: number; certoErrado: boolean };

const lerTudo = () => JSON.stringify(progresso.lerTudo());

/** Lista de questões com filtro por banca e tema, e o que o aluno já fez. */
export function ListaConcurso({ itens, bancas, temas }: { itens: Item[]; bancas: string[]; temas: string[] }) {
  const [banca, setBanca] = useState<string | null>(null);
  const [tema, setTema] = useState<string>("");
  const bruto = useSyncExternalStore(progresso.assinar, lerTudo, () => "{}");
  const tudo = JSON.parse(bruto) as Record<string, progresso.ProgressoExercicio>;

  const visiveis = itens.filter((q) => (!banca || q.banca === banca) && (!tema || q.tema === tema));
  const estado = (q: Item) => {
    const p = tudo[q.slug];
    if (!p || p.versao !== q.versao || p.status !== "concluido") return null;
    return p.historico?.[0] ? "de primeira" : "acertou";
  };
  const feitas = itens.filter((q) => estado(q)).length;

  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium ${ativo ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-muted"}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Banca">
        <button type="button" onClick={() => setBanca(null)} className={chip(banca === null)}>
          Todas as bancas
        </button>
        {bancas.map((b) => (
          <button key={b} type="button" onClick={() => setBanca(b)} className={chip(banca === b)} data-testid={`banca-${b}`}>
            {b}
          </button>
        ))}
        <select
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          className="ml-auto rounded-lg border border-line bg-white px-3 py-2 text-sm"
          aria-label="Tema"
        >
          <option value="">Todos os temas</option>
          {temas.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted">
        {visiveis.length} {visiveis.length === 1 ? "questão" : "questões"} · você já acertou {feitas} de {itens.length}
      </p>
      <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" data-testid="lista-concurso">
        {visiveis.map((q) => {
          const e = estado(q);
          return (
            <li key={q.slug}>
              <Link href={`/concurso/${q.slug}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg sm:px-5">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${e ? "bg-success text-white" : "bg-header text-muted"}`}
                  aria-label={e ? `acertou${e === "de primeira" ? " de primeira" : ""}` : "não feita"}
                >
                  {e ? "✓" : "·"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{q.titulo}</span>
                  <span className="text-xs text-muted">
                    {q.tema}
                    {q.certoErrado ? " · certo ou errado" : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">{q.banca}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
