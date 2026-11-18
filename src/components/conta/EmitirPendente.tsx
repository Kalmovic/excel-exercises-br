"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { APROVACAO } from "@/lib/testes";
import { EmitirCertificado, lerPendente, listarPendentes } from "./EmitirCertificado";

type Estado = {
  modulo: string;
  pendente: ReturnType<typeof lerPendente>;
  /** Sem `?modulo`: todas as aprovações guardadas neste navegador. */
  lista: { modulo: string; titulo: string }[];
};

const nada = () => () => {};
// Snapshot em texto: o React compara por valor, e um objeto novo a cada leitura re-renderiza sem fim.
const ler = () => {
  const modulo = new URLSearchParams(window.location.search).get("modulo") ?? "";
  const e: Estado = { modulo, pendente: modulo ? lerPendente(modulo) : null, lista: modulo ? [] : listarPendentes() };
  return JSON.stringify(e);
};
const noServidor = () => "";

const link = "text-success underline underline-offset-4";
/** Só slugs de módulo viram link para o teste (o parâmetro vem da URL). */
const hrefTeste = (modulo: string) => (/^[a-z][a-z0-9-]{0,40}$/.test(modulo) ? `/teste/${modulo}` : "/trilha");

/** Emissão depois do login: usa a aprovação guardada no navegador. */
export function EmitirPendente() {
  const bruto = useSyncExternalStore(nada, ler, noServidor);
  const estado = useMemo(() => (bruto ? (JSON.parse(bruto) as Estado) : null), [bruto]);
  if (!estado)
    return (
      <p className="text-muted" aria-busy="true">
        Procurando sua aprovação…
      </p>
    );
  const { modulo, pendente, lista } = estado;

  if (modulo && pendente) return <EmitirCertificado modulo={modulo} tituloModulo={pendente.titulo} entregas={pendente.entregas} />;

  if (modulo)
    return (
      <div className="space-y-2 text-muted" data-testid="sem-aprovacao">
        <p>Não encontramos neste navegador uma aprovação no teste deste módulo.</p>
        <p>
          O certificado sai do teste do módulo: passe com pelo menos {APROVACAO} acertos e ele aparece na tela do resultado.{" "}
          <Link href={hrefTeste(modulo)} className={link}>
            Fazer o teste do módulo
          </Link>
        </p>
        <p className="text-sm">Fez o teste em outro aparelho ou navegador? A aprovação fica guardada onde você fez o teste.</p>
      </div>
    );

  if (lista.length > 0)
    return (
      <div className="space-y-3" data-testid="aprovacoes-guardadas">
        <p className="text-muted">Estas aprovações estão guardadas neste navegador. Escolha o certificado para emitir:</p>
        <ul className="space-y-2">
          {lista.map((p) => (
            <li key={p.modulo}>
              <Link href={`/certificado/emitir?modulo=${encodeURIComponent(p.modulo)}`} className={`${link} font-semibold`}>
                {p.titulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-2 text-muted" data-testid="sem-aprovacao">
      <p>Ainda não há nenhuma aprovação guardada neste navegador.</p>
      <p>
        Cada módulo termina com um teste de 5 questões. Passe com pelo menos {APROVACAO} acertos e o certificado aparece na tela do
        resultado.{" "}
        <Link href="/trilha" className={link}>
          Ver a trilha e os testes
        </Link>
      </p>
    </div>
  );
}
