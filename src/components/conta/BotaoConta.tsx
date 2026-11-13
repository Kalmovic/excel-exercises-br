"use client";

import Link from "next/link";
import { useEffect } from "react";
import { iniciarConta, useConta } from "@/lib/conta";

/**
 * "Entrar" ou "Minha conta" no cabeçalho. Também liga a conta (sessão e
 * sincronização) em todas as páginas, já que o cabeçalho está em todas.
 */
export function BotaoConta({ className }: { className?: string }) {
  const conta = useConta();
  useEffect(iniciarConta, []);
  const logado = conta.estado === "logado";
  return (
    <Link href={logado ? "/conta" : "/entrar"} className={className} data-testid="botao-conta">
      {logado ? "Minha conta" : "Entrar"}
    </Link>
  );
}
