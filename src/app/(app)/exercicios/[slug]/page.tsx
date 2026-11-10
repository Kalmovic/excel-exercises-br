import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { BarraProgressoModulo } from "@/components/site/BarraProgressoModulo";
import { dadosDaTrilha } from "@/content/trilha";
import { exercicioPorSlug, exercicios, moduloPorSlug, proximoExercicio } from "@/content";

export function generateStaticParams() {
  return exercicios.filter((e) => e.plano === "free").map((e) => ({ slug: e.slug }));
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
  if (!ex || ex.plano !== "free") notFound();
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
      </nav>
      <BarraProgressoModulo itens={trilha.itensComTitulo} atual={ex.slug} />
      <h1 className="text-2xl font-bold tracking-tight">{ex.titulo}</h1>
      <SimuladorCarregavel
        key={ex.slug}
        exercicio={ex}
        proximo={prox ? { slug: prox.slug, titulo: prox.titulo } : undefined}
        trilha={trilha.simulador}
      />
    </div>
  );
}
