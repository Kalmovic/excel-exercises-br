import Link from "next/link";
import type { ReactNode } from "react";

/** Página provisória para links da landing que ainda não têm conteúdo. */
export function EmBreve({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8" data-testid="em-breve">
      <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-ink">Em breve</span>
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
      <div className="space-y-3 text-lg text-muted">{children}</div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/trilha" className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
          Começar grátis
        </Link>
        <Link href="/desafio" className="rounded-lg border border-ink bg-surface px-4 py-2 font-medium text-ink">
          Jogar o desafio de hoje
        </Link>
      </div>
    </div>
  );
}
