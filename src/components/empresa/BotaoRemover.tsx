"use client";

import { useActionState } from "react";
import { removerMembro, type ResultadoRemover } from "@/app/(app)/empresa/acoes";

const ERROS: Record<Exclude<ResultadoRemover, "removido">, string> = {
  nao_membro: "Essa pessoa já não está na equipe.",
  nao_gestor: "Só o gestor da equipe pode remover.",
  erro: "Não deu certo agora. Tente de novo.",
};

/** Remover da equipe (com confirmação). A vaga volta a ficar livre. */
export function BotaoRemover({ usuarioId, quem }: { usuarioId: string; quem: string }) {
  const [resultado, acao, enviando] = useActionState<ResultadoRemover | null>(removerMembro.bind(null, usuarioId), null);
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(`Remover ${quem} da equipe? A pessoa perde o Pro da empresa e a vaga fica livre.`)) e.preventDefault();
      }}
      className="inline"
    >
      <button type="submit" disabled={enviando} className="text-sm text-red-700 underline-offset-4 hover:underline disabled:opacity-50" data-testid="remover-membro">
        {enviando ? "Removendo…" : "Remover"}
      </button>
      {resultado && resultado !== "removido" && (
        <span className="ml-2 text-xs text-red-700" role="alert">
          {ERROS[resultado]}
        </span>
      )}
    </form>
  );
}
