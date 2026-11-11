"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ComecarCta } from "@/components/site/ComecarCta";
import type { ItemTrilha } from "@/lib/inicio";
import * as progresso from "@/lib/progresso";
import { NOME_DESAFIO } from "@/lib/site";
import { SeloOfensiva } from "@/components/site/SeloOfensiva";

const noServidor = () => "";

/** Desafio de hoje, calculado no servidor (data em São Paulo, número e versão do exercício). */
export type DesafioDeHoje = { slug: string; versao: number; numero: number; rotulo: string } | null;

/**
 * Coluna fixa ao lado do mapa: próximo passo, desafio de hoje e progresso geral.
 * `desafio` undefined = ainda carregando a parte que depende da data.
 */
export function PainelTrilha({ trilha, desafio }: { trilha: ItemTrilha[]; desafio?: DesafioDeHoje }) {
  const bruto = useSyncExternalStore(
    progresso.assinar,
    () => {
      return JSON.stringify({
        desafio: desafio ? (progresso.ler(desafio.slug, desafio.versao) ?? null) : null,
        tudo: progresso.lerTudo(),
        trofeus: Object.keys(progresso.lerTrofeus()).length,
      });
    },
    noServidor,
  );
  const dados = bruto
    ? (JSON.parse(bruto) as {
        desafio: progresso.ProgressoExercicio | null;
        tudo: Record<string, progresso.ProgressoExercicio>;
        trofeus: number;
      })
    : null;
  const feitos = dados ? trilha.filter((i) => dados.tudo[i.slug]?.versao === i.versao && dados.tudo[i.slug]?.status === "concluido").length : 0;
  const desafioFeito = dados?.desafio?.status === "concluido";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-5" aria-label="Próximo passo">
        <p className="mb-3 text-xs font-bold tracking-wider text-success uppercase">Próximo passo</p>
        <ComecarCta trilha={trilha} />
      </section>

      <Link
        href="/desafio"
        className="block rounded-2xl bg-ink p-5 text-white hover:bg-ink-soft"
        data-testid="card-desafio"
      >
        <p className="font-display text-lg font-bold">
          {NOME_DESAFIO}
          {desafio ? ` #${desafio.numero}` : ""} →
        </p>
        {desafio && <p className="text-xs text-white/60">{desafio.rotulo}</p>}
        {!dados || desafio === undefined ? (
          <p className="text-sm text-white/70">Um desafio novo todo dia, o mesmo para todo mundo.</p>
        ) : desafio === null ? (
          <p className="mt-1 text-sm text-white/70">Sem desafio hoje. Veja a solução de ontem.</p>
        ) : desafioFeito ? (
          <p className="mt-1 text-sm text-white/80">
            <span className="mr-2 tracking-widest">{(dados.desafio?.historico ?? [true]).map((ok) => (ok ? "🟩" : "🟨")).join("")}</span>
            Feito hoje. Volte amanhã!
          </p>
        ) : (
          <p className="mt-1 text-sm text-accent">Você ainda não jogou hoje.</p>
        )}
      </Link>

      <section className="rounded-2xl border border-line bg-surface p-5" aria-label="Seu progresso" data-testid="progresso-geral">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-semibold">Seu progresso</p>
          <p className="text-sm text-muted">
            {feitos} de {trilha.length} exercícios
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-header">
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${trilha.length ? (feitos / trilha.length) * 100 : 0}%` }} />
        </div>
        <SeloOfensiva className="mt-3" />
        <p className="mt-2 text-sm text-muted">
          {dados?.trofeus ? `${dados.trofeus} ${dados.trofeus === 1 ? "troféu conquistado" : "troféus conquistados"}. ` : ""}
          Seu progresso fica salvo neste navegador.
        </p>
      </section>
    </div>
  );
}
