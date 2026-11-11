"use client"; // limites de erro precisam ser Client Components

import { useEffect } from "react";
import { LinkInicio, TelaErro, botaoErro } from "@/components/site/TelaErro";
import { reportarErro } from "@/lib/reportar-erro";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportarErro(error, `error.tsx${error.digest ? ` (${error.digest})` : ""}`), [error]);
  return (
    <TelaErro codigo="#VALOR!" titulo="Algo deu errado nesta página.">
      <p>O erro já foi registrado. Tente de novo; se continuar, recarregue a página. Seu progresso está salvo.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={botaoErro}>
          Tentar de novo
        </button>
        <LinkInicio />
      </div>
    </TelaErro>
  );
}
