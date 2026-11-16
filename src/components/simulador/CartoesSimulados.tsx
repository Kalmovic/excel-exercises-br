"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";
import { lerTestes } from "@/lib/testes";

type Resumo = { slug: string; titulo: string; cenario: string; descricao: string; temas: string[]; minutos: number; aprovacao: number; tarefas: number };

const ler = () => JSON.stringify(lerTestes());

/** Os três níveis, com o melhor resultado do aluno em cada um (do navegador/conta). */
export function CartoesSimulados({ simulados }: { simulados: Resumo[] }) {
  const bruto = useSyncExternalStore(progresso.assinar, ler, () => "{}");
  const testes = JSON.parse(bruto) as ReturnType<typeof lerTestes>;
  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="niveis-simulado">
      {simulados.map((s) => {
        const r = testes[`simulado-${s.slug}`];
        return (
          <article key={s.slug} className="flex flex-col rounded-3xl border border-line bg-surface p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-extrabold">{s.titulo}</h2>
              {r && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.aprovado ? "bg-success-bg text-success" : "bg-header text-muted"}`}>
                  {r.aprovado ? "Aprovado" : "Melhor"}: {r.acertos}/{r.total}
                </span>
              )}
            </div>
            <p className="font-medium">{s.cenario}</p>
            <p className="mb-4 text-sm text-muted">{s.descricao}</p>
            <p className="mb-2 text-sm">
              <strong>{s.tarefas} tarefas</strong> · <strong>{s.minutos} min</strong> · passa com {s.aprovacao}
            </p>
            <ul className="mb-6 flex flex-wrap gap-1.5">
              {s.temas.map((t) => (
                <li key={t} className="rounded-full bg-bg px-2.5 py-1 text-xs text-muted">
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href={`/simulado/${s.slug}`}
              className="mt-auto rounded-lg bg-ink px-5 py-3 text-center font-semibold text-white hover:bg-ink-soft"
              data-testid={`simulado-${s.slug}`}
            >
              {r ? "Fazer de novo" : "Começar"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
