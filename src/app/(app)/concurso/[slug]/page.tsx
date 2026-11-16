import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { QUESTOES_CONCURSO, proximaQuestao, questaoPorSlug } from "@/content/concurso";

export function generateStaticParams() {
  return QUESTOES_CONCURSO.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/concurso/[slug]">): Promise<Metadata> {
  const q = questaoPorSlug((await params).slug);
  return q ? { title: `${q.titulo} (estilo ${q.banca})`, robots: { index: false, follow: true } } : {};
}

export default async function Pagina({ params }: PageProps<"/concurso/[slug]">) {
  const q = questaoPorSlug((await params).slug);
  if (!q) notFound();
  const n = QUESTOES_CONCURSO.indexOf(q) + 1;
  const prox = proximaQuestao(q.slug);
  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/concurso" className="hover:text-zinc-800">
          Excel para concurso
        </Link>{" "}
        / Questão {n} de {QUESTOES_CONCURSO.length}
      </nav>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-ink px-2.5 py-0.5 font-semibold text-white" data-testid="banca-questao">
            Estilo {q.banca}
          </span>
          <span className="rounded-full bg-header px-2.5 py-0.5 text-muted">{q.tema}</span>
          <span className="text-xs text-muted">Questão inédita</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{q.titulo}</h1>
      </header>
      <SimuladorCarregavel exercicio={q} previa={<PreviaExercicio exercicio={q} />} avulso />
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <Link href="/concurso" className="rounded-lg border border-line bg-white px-4 py-2 font-medium hover:bg-bg">
          ← Todas as questões
        </Link>
        {prox && (
          <Link href={`/concurso/${prox.slug}`} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft" data-testid="proxima-questao">
            Próxima questão →
          </Link>
        )}
      </div>
    </div>
  );
}
