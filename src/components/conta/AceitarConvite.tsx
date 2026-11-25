"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrarNaEquipe } from "@/app/(app)/convite/[codigo]/acoes";
import { MENSAGEM_CONVITE, type ResultadoConvite } from "@/lib/empresas";

/** Botão "Entrar na equipe" e o resultado (vaga ocupada, lotada, vencida…). */
export function AceitarConvite({ codigo, email, empresa }: { codigo: string; email: string; empresa: string }) {
  const [resultado, acao, enviando] = useActionState<ResultadoConvite | null>(entrarNaEquipe.bind(null, codigo), null);
  const ok = resultado === "entrou" || resultado === "ja_membro";
  if (ok)
    return (
      <div className="space-y-4" data-testid="convite-ok">
        <p className="text-lg font-semibold text-success" role="status">
          {MENSAGEM_CONVITE[resultado]}
        </p>
        <Link href="/trilha" className="inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
          Começar a trilha
        </Link>
      </div>
    );
  return (
    <form action={acao} className="space-y-4">
      <p>
        Você vai entrar na equipe <strong>{empresa}</strong> com a conta <strong className="break-all">{email}</strong>.
      </p>
      {resultado && (
        <p className="text-sm text-red-700" role="alert" data-testid="convite-erro">
          {MENSAGEM_CONVITE[resultado]}
        </p>
      )}
      <button type="submit" disabled={enviando} className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft disabled:opacity-50" data-testid="entrar-equipe">
        {enviando ? "Entrando…" : "Entrar na equipe"}
      </button>
    </form>
  );
}
