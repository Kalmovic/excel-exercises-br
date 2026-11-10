import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { desafioDoDia, desafiosAnteriores, hojeNoServidor, numeroDoDesafio, rotuloNivel } from "@/content/desafios";
import { usuarioEhPro } from "@/lib/acesso";
import { dataBR, somarDias } from "@/lib/data-sp";

export const metadata: Metadata = {
  title: "Arquivo de desafios de Excel",
  description: "Todos os desafios diários de Excel que já passaram, com a solução comentada. Exclusivo do plano Pro.",
  // Página de assinante: fora do índice de busca (as soluções individuais continuam indexáveis).
  robots: { index: false, follow: true },
};

export default function Anteriores() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Arquivo de desafios</h1>
      <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

/** A checagem de Pro roda no servidor: sem Pro, a lista nem vai no HTML. */
async function Conteudo() {
  await connection();
  const hoje = hojeNoServidor();
  const lista = desafiosAnteriores(hoje);

  if (!(await usuarioEhPro())) {
    const ontem = desafioDoDia(somarDias(hoje, -1));
    return (
      <section className="space-y-4 rounded-xl border border-accent bg-accent-soft p-6" data-testid="arquivo-bloqueado">
        <p className="text-lg font-semibold text-ink">O arquivo completo é do plano Pro</p>
        <p className="text-ink">
          {lista.length > 0
            ? `${lista.length} ${lista.length === 1 ? "desafio anterior" : "desafios anteriores"}, cada um com a solução comentada.`
            : "Todos os desafios que já passaram, cada um com a solução comentada."}{" "}
          Com o Pro, você também refaz qualquer um deles na planilha.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-md bg-accent px-4 py-2 font-medium text-ink">Pro: em breve</span>
          {ontem && (
            <Link href={`/desafio/${ontem.data}`} className="text-ink underline">
              Ver a solução de ontem (grátis)
            </Link>
          )}
          <Link href="/desafio" className="text-ink underline">
            Fazer o desafio de hoje
          </Link>
        </div>
      </section>
    );
  }

  if (lista.length === 0) return <p className="text-zinc-500">Ainda não há desafios anteriores.</p>;
  return (
    <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-line bg-white" data-testid="lista-anteriores">
      {lista.map((d) => (
        <li key={d.data}>
          <Link href={`/desafio/${d.data}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
            <span className="w-12 shrink-0 font-mono text-sm text-zinc-500">#{numeroDoDesafio(d.data)}</span>
            <span className="flex-1">{d.exercicio.titulo}</span>
            <span className="text-xs text-zinc-500">{rotuloNivel(d)}</span>
            <span className="text-sm text-zinc-500">{dataBR(d.data)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
