import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TesteModulo } from "@/components/simulador/TesteModulo";
import { MODULOS, exercicioPorSlug, moduloPorSlug, proximoModulo, testeDoModulo } from "@/content";

export function generateStaticParams() {
  return MODULOS.filter((m) => testeDoModulo(m.slug).length > 0).map((m) => ({ modulo: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/teste/[modulo]">): Promise<Metadata> {
  const m = moduloPorSlug((await params).modulo);
  return m ? { title: `Teste do Módulo ${m.numero}: ${m.titulo}`, robots: { index: false, follow: true } } : {};
}

export default async function PaginaTeste({ params }: PageProps<"/teste/[modulo]">) {
  const m = moduloPorSlug((await params).modulo);
  const questoes = m ? testeDoModulo(m.slug) : [];
  if (!m || questoes.length === 0) notFound();
  const seguinte = proximoModulo(m.slug);
  const revisar = Object.fromEntries(
    questoes.map((q) => {
      const l = q.revisar ? exercicioPorSlug(q.revisar) : undefined;
      return [q.slug, l ? { slug: l.slug, titulo: l.titulo } : undefined];
    }),
  );
  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/trilha" className="hover:text-zinc-800">
          Trilha
        </Link>{" "}
        / Módulo {m.numero}: {m.titulo} / Teste
      </nav>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Teste do Módulo {m.numero}: {m.titulo}</h1>
        <p className="text-muted">5 questões inéditas, sem dica e com uma tentativa cada. Passa quem acerta 4.</p>
      </header>
      <TesteModulo
        modulo={{ slug: m.slug, numero: m.numero, titulo: m.titulo, icone: m.trofeu.icone, conquista: m.trofeu.descricao }}
        proximo={
          seguinte && {
            numero: seguinte.modulo.numero,
            titulo: seguinte.modulo.titulo,
            href: `/exercicios/${seguinte.primeiro.slug}`,
          }
        }
        questoes={questoes}
        revisar={revisar}
      />
    </div>
  );
}
