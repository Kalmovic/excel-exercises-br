import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { MODULOS, exercicioPorSlug, exercicios, proximoExercicio } from "@/content";

export function generateStaticParams() {
  return exercicios.filter((e) => e.plano === "free").map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/exercicios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ex = exercicioPorSlug(slug);
  if (!ex) return {};
  return { title: ex.titulo, description: ex.enunciado.join(" ").replace(/[`*]/g, "") };
}

export default async function PaginaExercicio({ params }: PageProps<"/exercicios/[slug]">) {
  const { slug } = await params;
  const ex = exercicioPorSlug(slug);
  if (!ex || ex.plano !== "free") notFound();
  const prox = proximoExercicio(slug);
  const modulo = MODULOS.find((m) => m.slug === ex.modulo);
  const trilha = {
    modulo: ex.modulo,
    titulo: modulo?.titulo ?? ex.modulo,
    itens: exercicios
      .filter((e) => e.modulo === ex.modulo && e.plano === "free")
      .map((e) => ({ slug: e.slug, versao: e.versao })),
  };

  return (
    <div className="space-y-4">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Módulo 1: Fundamentos
        </Link>{" "}
        / Exercício {ex.ordem}
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{ex.titulo}</h1>
      <SimuladorCarregavel
        exercicio={ex}
        proximo={prox ? { slug: prox.slug, titulo: prox.titulo } : undefined}
        trilha={trilha}
      />
    </div>
  );
}
