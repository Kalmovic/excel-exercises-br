"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { EmitirCertificado, lerPendente } from "./EmitirCertificado";

const lerModulo = () => new URLSearchParams(window.location.search).get("modulo") ?? "";

/** Emissão depois do login: usa a aprovação guardada no navegador. */
export function EmitirPendente() {
  const modulo = useSyncExternalStore(() => () => {}, lerModulo, () => "");
  const pendente = useSyncExternalStore(
    () => () => {},
    () => JSON.stringify(modulo ? lerPendente(modulo) : null),
    () => "null",
  );
  const dados = JSON.parse(pendente) as ReturnType<typeof lerPendente>;
  if (!dados)
    return (
      <p className="text-muted">
        Não encontramos uma aprovação guardada neste navegador.{" "}
        <Link href="/trilha" className="text-success underline underline-offset-4">
          Faça o teste do módulo
        </Link>{" "}
        e emita o certificado na tela do resultado.
      </p>
    );
  return <EmitirCertificado modulo={modulo} tituloModulo={dados.titulo} entregas={dados.entregas} />;
}
