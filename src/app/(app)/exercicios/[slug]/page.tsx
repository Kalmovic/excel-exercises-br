import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { BarraProgressoModulo } from "@/components/site/BarraProgressoModulo";
import { dadosDaTrilha } from "@/content/trilha";
import { exercicioPorSlug, exercicios, moduloPorSlug, proximoExercicio } from "@/content";
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

  return (
    <div className="space-y-4">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Módulo {modulo?.numero}: {modulo?.titulo}
        </Link>{" "}
        / Exercício {ex.ordem}
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
    </div>
  );
}
