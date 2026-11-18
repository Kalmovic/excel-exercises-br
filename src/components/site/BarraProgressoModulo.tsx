"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";

/** Uma casa do módulo: exercício avulso (Intro) ou lição, com as etapas dela. */
type Item = { slug: string; titulo: string; versao: number; partes?: { chave: string; versao: number }[] };

const servidor = () => "{}";

type Tudo = ReturnType<typeof progresso.lerTudo>;

/** Etapas feitas e total de uma casa. A lição concluída conta inteira. */
export function etapasDaCasa(i: Item, tudo: Tudo): { feitas: number; total: number; status?: progresso.ProgressoExercicio["status"] } {
  const p = tudo[i.slug];
  const status = p?.versao === i.versao ? p.status : undefined;
  const partes = i.partes && i.partes.length > 1 ? i.partes : undefined;
  if (!partes) return { feitas: status === "concluido" ? 1 : 0, total: 1, status };
  if (status === "concluido") return { feitas: partes.length, total: partes.length, status };
  const feitas = partes.filter((q) => tudo[q.chave]?.versao === q.versao && tudo[q.chave]?.status === "concluido").length;
  return { feitas, total: partes.length, status };
}

/**
 * Segmentos do módulo: feito, pulado, pendente e o atual. Numa lição, o
 * segmento enche conforme as etapas feitas, e o contador conta etapas: a lição
 * só fica "feita" com as 5, mas 4 de 5 não é zero.
 */
export function BarraProgressoModulo({ itens, atual }: { itens: Item[]; atual: string }) {
  const bruto = useSyncExternalStore(progresso.assinar, () => JSON.stringify(progresso.lerTudo()), servidor);
  const tudo = JSON.parse(bruto) as Tudo;
  const casas = itens.map((i) => ({ item: i, ...etapasDaCasa(i, tudo) }));
  const feitas = casas.reduce((s, c) => s + c.feitas, 0);
  const total = casas.reduce((s, c) => s + c.total, 0);
  const temLicoes = casas.some((c) => c.total > 1);

  return (
    <div className="flex items-center gap-3" data-testid="progresso-modulo">
      <ol className="flex flex-1 gap-1" aria-label="Progresso do módulo">
        {casas.map(({ item: i, feitas: f, total: t, status: s }, n) => {
          const eAtual = i.slug === atual;
          const completa = f === t;
          const fundo = s === "pulado" && !completa ? "bg-accent" : "bg-zinc-200";
          const detalhe = completa ? " (feito)" : s === "pulado" ? " (pulado)" : t > 1 && f > 0 ? ` (${f} de ${t} etapas)` : "";
          return (
            <li key={i.slug} className="flex-1">
              <Link
                href={`/exercicios/${i.slug}`}
                title={`${n + 1}. ${i.titulo}${detalhe}`}
                aria-label={`${n + 1}. ${i.titulo}${detalhe}`}
                aria-current={eAtual ? "step" : undefined}
                className={`relative block h-2 overflow-hidden rounded-full ${fundo} ${eAtual ? "ring-2 ring-ink ring-offset-1" : ""}`}
              >
                {f > 0 && (
                  <span className="absolute inset-y-0 left-0 bg-success" style={{ width: `${(f / t) * 100}%` }} data-testid="segmento-feito" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 text-xs text-zinc-500" data-testid="contador-progresso">
        {feitas} de {total}
        {temLicoes ? " etapas" : ""}
      </span>
    </div>
  );
}
