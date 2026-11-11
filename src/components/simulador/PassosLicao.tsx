"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";

export type PassoLicao = { slug: string; chave: string; versao: number; rotulo: string };

/** As 5 questões da lição, com o que já foi feito. */
export function PassosLicao({ passos, atual }: { passos: PassoLicao[]; atual: string }) {
  const bruto = useSyncExternalStore(progresso.assinar, () => JSON.stringify(progresso.lerTudo()), () => "{}");
  const tudo = JSON.parse(bruto) as ReturnType<typeof progresso.lerTudo>;
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Questões da lição" data-testid="passos-licao">
      {passos.map((p, i) => {
        const feito = tudo[p.chave]?.versao === p.versao && tudo[p.chave]?.status === "concluido";
        const ehAtual = p.slug === atual;
        return (
          <li key={p.slug}>
            <Link
              href={`/exercicios/${p.slug}`}
              aria-current={ehAtual ? "step" : undefined}
              data-feito={feito || undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                ehAtual ? "border-ink bg-ink text-white" : feito ? "border-success bg-success-bg text-success" : "border-line bg-surface text-muted hover:border-ink"
              }`}
            >
              <span aria-hidden>{feito ? "✓" : i + 1}</span> {p.rotulo}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
