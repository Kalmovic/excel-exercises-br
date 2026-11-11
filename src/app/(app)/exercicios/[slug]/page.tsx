import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { BarraProgressoModulo } from "@/components/site/BarraProgressoModulo";
import { dadosDaTrilha } from "@/content/trilha";
import { exercicioPorSlug, exercicios, exerciciosDoModulo, extrasDoModulo, moduloPorSlug, proximoExercicio } from "@/content";
import { exercicioLiberado } from "@/lib/acesso-conteudo";

export function generateStaticParams() {
  return exercicios.filter(exercicioLiberado).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/exercicios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ex = exercicioPorSlug(slug);
  if (!ex) return {};
  return {
    title: ex.titulo,
    description: ex.enunciado.join(" ").replace(/[`*]/g, ""),
    alternates: { canonical: `/exercicios/${ex.slug}` },
  };
}

export default async function PaginaExercicio({ params }: PageProps<"/exercicios/[slug]">) {
  const { slug } = await params;
  const ex = exercicioPorSlug(slug);
  if (!ex || !exercicioLiberado(ex)) notFound();
  const prox = proximoExercicio(slug);
  const modulo = moduloPorSlug(ex.modulo);
  const trilha = dadosDaTrilha(ex.modulo);
  const principais = exerciciosDoModulo(ex.modulo);
  // A prática extra aparece no último exercício do módulo e nas próprias páginas de prática.
  const extras = ex.extra || principais[principais.length - 1]?.slug === ex.slug ? extrasDoModulo(ex.modulo) : [];

  return (
    <div className="space-y-4">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Módulo {modulo?.numero}: {modulo?.titulo}
        </Link>{" "}
        / {ex.extra ? "Prática extra" : `Exercício ${ex.ordem}`}
        {ex.plano === "pro" && (
          <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-ink" title="Aberto para todos durante os testes">
            Pro · aberto nos testes
          </span>
        )}
      </nav>
      <BarraProgressoModulo itens={trilha.itensComTitulo} atual={ex.slug} />
      <h1 className="text-2xl font-bold tracking-tight">{ex.titulo}</h1>
      <SimuladorCarregavel
        key={ex.slug}
        exercicio={ex}
        previa={<PreviaExercicio exercicio={ex} />}
        proximo={prox ? { slug: prox.slug, titulo: prox.titulo } : undefined}
        trilha={trilha.simulador}
      />
      {extras.length > 0 && (
        <section className="space-y-2 rounded-xl border border-line bg-surface p-4" data-testid="pratica-extra">
          <h2 className="font-semibold">
            Prática extra: {modulo?.titulo}{" "}
            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-ink">Pro</span>
          </h2>
          <p className="text-sm text-muted">Mais {extras.length} exercícios com as mesmas funções, em situações diferentes.</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {extras.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/exercicios/${x.slug}`}
                  className={`hover:underline ${x.slug === ex.slug ? "font-semibold text-ink" : "text-success"}`}
                >
                  {x.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
