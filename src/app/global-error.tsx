"use client";

import { useEffect } from "react";
import { reportarErro } from "@/lib/reportar-erro";

/** Erro no próprio layout raiz: renderiza o documento inteiro, sem os estilos globais. */
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportarErro(error, "global-error"), [error]);
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f7f2", color: "#16181d", padding: "4rem 1rem" }}>
        <title>Algo deu errado | Planilhês</title>
        <main style={{ maxWidth: 560, margin: "0 auto" }}>
          <p style={{ fontFamily: "monospace", color: "#4a4e57" }}>#VALOR!</p>
          <h1 style={{ fontSize: 36, margin: "8px 0 16px" }}>Algo deu errado.</h1>
          <p style={{ color: "#4a4e57" }}>O erro já foi registrado. Seu progresso está salvo neste navegador.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, background: "#16181d", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 600 }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
