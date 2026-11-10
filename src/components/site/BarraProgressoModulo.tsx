"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";

type Item = { slug: string; titulo: string; versao: number };

const servidor = () => "{}";

/** Segmentos do módulo: feito, pulado, pendente e o atual. */
export function BarraProgressoModulo({ itens, atual }: { itens: Item[]; atual: string }) {
  const bruto = useSyncExternalStore(progresso.assinar, () => JSON.stringify(progresso.lerTudo()), servidor);
  const tudo = JSON.parse(bruto) as ReturnType<typeof progresso.lerTudo>;
  const status = (i: Item) => (tudo[i.slug]?.versao === i.versao ? tudo[i.slug]?.status : undefined);
  const feitos = itens.filter((i) => status(i) === "concluido").length;

  return (
    <div className="flex items-center gap-3" data-testid="progresso-modulo">
      <ol className="flex flex-1 gap-1" aria-label="Progresso do módulo">
        {itens.map((i, n) => {
          const s = status(i);
          const eAtual = i.slug === atual;
          const cor =
            s === "concluido" ? "bg-emerald-500" : s === "pulado" ? "bg-amber-300" : "bg-zinc-200";
          return (
            <li key={i.slug} className="flex-1">
              <Link
                href={`/exercicios/${i.slug}`}
                title={`${n + 1}. ${i.titulo}${s === "concluido" ? " (feito)" : s === "pulado" ? " (pulado)" : ""}`}
                aria-current={eAtual ? "step" : undefined}
                className={`block h-2 rounded-full ${cor} ${eAtual ? "ring-2 ring-emerald-700 ring-offset-1" : ""}`}
              />
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 text-xs text-zinc-500">
        {feitos} de {itens.length}
      </span>
    </div>
  );
}
