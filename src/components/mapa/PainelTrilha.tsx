"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ComecarCta } from "@/components/site/ComecarCta";
import type { ItemTrilha } from "@/lib/inicio";
import * as progresso from "@/lib/progresso";
import { NOME_DESAFIO } from "@/lib/site";
import { SeloOfensiva } from "@/components/site/SeloOfensiva";
import { useConta } from "@/lib/conta";

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
  const conta = useConta();

  const desafioPendente = desafio && dados && !desafioFeito;

  return (
    <div className="space-y-3">
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5" aria-label="Seu progresso" data-testid="progresso-geral">
        {/* Aluno novo: só o botão de começar. Números e ofensiva aparecem depois do 1º exercício. */}
        {feitos > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">
              {feitos} de {trilha.length} exercícios
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-header">
              <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${(feitos / trilha.length) * 100}%` }} />
            </div>
          </div>
        )}
        {/* Uma questão feita já conta para a ofensiva, mesmo sem lição completa. */}
        <SeloOfensiva ocultarVazio />
        <ComecarCta trilha={trilha} />
        {feitos > 0 && conta.estado === "anonimo" && (
          <p className="text-sm text-muted">
            <Link href="/entrar?proximo=/trilha" className="text-success underline-offset-4 hover:underline">
              Crie uma conta
            </Link>{" "}
            para não perder seu progresso.
          </p>
        )}
      </section>

      <Link
        href="/desafio"
        className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-3.5 text-white hover:bg-ink-soft"
        data-testid="card-desafio"
      >
        <span className="min-w-0">
          <span className="block font-display font-bold">
            {NOME_DESAFIO}
            {desafio ? ` #${desafio.numero}` : ""}
          </span>
          {desafio && <span className="block text-xs text-white/60">{desafio.rotulo}</span>}
        </span>
        <span className="shrink-0 text-sm">
          {desafio === null ? (
            <span className="text-white/70">Ver o de ontem →</span>
          ) : desafioFeito ? (
            <span className="tracking-widest" title="Feito hoje">
              {(dados?.desafio?.historico ?? [true]).map((ok) => (ok ? "🟩" : "🟨")).join("")}
            </span>
          ) : desafioPendente ? (
            <span className="font-semibold text-accent">Jogar →</span>
          ) : (
            <span className="text-white/70">→</span>
          )}
        </span>
      </Link>
    </div>
  );
}
