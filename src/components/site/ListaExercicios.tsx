"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";

type Item = { slug: string; titulo: string; ordem: number; nivel: number; versao: number };

const servidor = () => "{}";

export function ListaExercicios({ itens }: { itens: Item[] }) {
  const bruto = useSyncExternalStore(
    progresso.assinar,
    () => JSON.stringify(progresso.lerTudo()),
    servidor,
  );
  const tudo = JSON.parse(bruto) as ReturnType<typeof progresso.lerTudo>;
  const feitos = itens.filter((i) => tudo[i.slug]?.versao === i.versao && tudo[i.slug]?.status === "concluido");

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-500">
        {feitos.length} de {itens.length} concluídos
      </p>
      <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {itens.map((i) => {
          const p = tudo[i.slug];
          const feito = p?.versao === i.versao && p?.status === "concluido";
          const comecado = p?.versao === i.versao && !feito;
          return (
            <li key={i.slug}>
              <Link
                href={`/exercicios/${i.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    feito ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {feito ? "✓" : i.ordem}
                </span>
                <span className="flex-1">{i.titulo}</span>
                {comecado && <span className="text-xs text-amber-700">em andamento</span>}
                <span className="text-xs text-zinc-400">{"●".repeat(i.nivel)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
