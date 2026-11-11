import Link from "next/link";
import type { ReactNode } from "react";

/** Layout comum das páginas de erro e de "não encontrado". */
export function TelaErro({ codigo, titulo, children }: { codigo: string; titulo: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-20" data-testid="tela-erro">
      <p className="font-mono text-lg text-muted">{codigo}</p>
      <h1 className="text-4xl font-extrabold tracking-tight">{titulo}</h1>
      <div className="space-y-4 text-lg text-muted">{children}</div>
    </div>
  );
}

export const botaoErro = "inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft";
export function LinkInicio() {
  return (
    <Link href="/trilha" className="rounded-lg border border-ink bg-surface px-5 py-3 font-semibold text-ink">
      Ir para a trilha
    </Link>
  );
}
