import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TextoRico } from "@/components/simulador/TextoRico";
import { desafioDoDia, hojeNoServidor, numeroDoDesafio, rotuloNivel } from "@/content/desafios";
import { GradeEstatica } from "@/components/previa/GradeEstatica";
import { montarGrade } from "@/components/previa/montar";
import { dataBR, ehDataISO } from "@/lib/data-sp";
import { NOME_DESAFIO } from "@/lib/site";

/** O título não usa o conteúdo do desafio: assim nem o <title> de um desafio futuro vaza. */
export async function generateMetadata({ params }: PageProps<"/desafio/[data]">): Promise<Metadata> {
  const { data } = await params;
  if (!ehDataISO(data)) return {};
  return {
    title: `Solução do desafio de Excel de ${dataBR(data)}`,
    description: `Solução comentada do desafio diário de Excel de ${dataBR(data)}, com a fórmula em português e a explicação passo a passo.`,
    alternates: { canonical: `/desafio/${data}` },
  };
}

export default function PaginaSolucao({ params }: PageProps<"/desafio/[data]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
      <Solucao params={params} />
    </Suspense>
  );
}

async function Solucao({ params }: { params: PageProps<"/desafio/[data]">["params"] }) {
  await connection();
  const { data } = await params;
  const hoje = hojeNoServidor();
  // Só publica desafios que já passaram. O de hoje e os futuros dão 404.
  if (!ehDataISO(data) || data >= hoje) notFound();
  const desafio = desafioDoDia(data);
  if (!desafio || desafio.exercicio.type !== "formula") notFound();

  const ex = desafio.exercicio;
  const numero = numeroDoDesafio(data);
  // Planilha resolvida, montada no servidor, para mostrar a tabela com o resultado.
  const grade = montarGrade(ex, { comSolucao: true });

  const primeiro = ex.alvos[0];
  const ultimo = ex.alvos[ex.alvos.length - 1];

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/desafio" className="hover:text-zinc-800">
          {NOME_DESAFIO}
        </Link>{" "}
        / #{numero} · {dataBR(data)}
      </nav>
      <header className="space-y-2">
        <p className="text-sm font-medium text-success">
          Solução comentada · desafio #{numero} · {rotuloNivel(desafio)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{ex.titulo}</h1>
      </header>

      <section className="space-y-2 leading-relaxed text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">O desafio</h2>
        {ex.enunciado.map((t, i) => (
          <p key={i}>
            <TextoRico texto={t} />
          </p>
        ))}
      </section>

      <GradeEstatica grade={grade} solucao />

      <section className="space-y-3 leading-relaxed text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">A solução</h2>
        <p>
          Em <strong>{primeiro.celula}</strong>:{" "}
          <code className="rounded bg-header px-1.5 py-0.5 font-mono text-success">{primeiro.solucaoReferencia}</code>
          {ex.alvos.length > 1 && (
            <>
              , copiada até <strong>{ultimo.celula}</strong>
            </>
          )}
          .
        </p>
        {ex.explicacao.map((t, i) => (
          <p key={i}>
            <TextoRico texto={t} />
          </p>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <Link href="/desafio" className="rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
          Fazer o desafio de hoje
        </Link>
        <Link href="/desafio/anteriores" className="text-sm text-zinc-600 hover:text-zinc-900">
          Todos os desafios anteriores <span className="rounded bg-accent px-1 text-xs text-ink">Pro</span>
        </Link>
      </div>
    </article>
  );
}
