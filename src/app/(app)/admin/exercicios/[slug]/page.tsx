import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { catalogo } from "@/content/catalogo";
import { ehAdmin } from "@/lib/admin";

export default function AdminExercicio({ params }: PageProps<"/admin/exercicios/[slug]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/admin/exercicios/[slug]">["params"] }) {
  // Primeiro a checagem: sem admin, nada do exercício (nem o título) é montado.
  if (!(await ehAdmin())) notFound();
  const { slug } = await params;
  const itens = catalogo();
  const i = itens.findIndex((x) => x.slug === slug);
  if (i === -1) notFound();
  const item = itens[i];
  const anterior = itens[i - 1];
  const seguinte = itens[i + 1];
  const publico = item.data ? null : `/exercicios/${item.slug}`;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          <Link href="/admin" className="hover:text-zinc-800">
            Admin
          </Link>{" "}
          / {item.grupo} / <span className="font-mono">{item.detalhe}</span>
        </span>
        <span className="flex gap-4">
          {anterior && (
            <Link href={`/admin/exercicios/${anterior.slug}`} className="hover:text-zinc-800" data-testid="admin-anterior">
              ← Anterior
            </Link>
          )}
          {seguinte && (
            <Link href={`/admin/exercicios/${seguinte.slug}`} className="hover:text-zinc-800" data-testid="admin-seguinte">
              Seguinte →
            </Link>
          )}
          {publico && (
            <Link href={publico} className="hover:text-zinc-800">
              Abrir como aluno
            </Link>
          )}
        </span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{item.titulo}</h1>
      <SimuladorCarregavel key={item.slug} exercicio={item.exercicio} admin />
    </div>
  );
}
