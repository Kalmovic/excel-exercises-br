import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SimuladoVaga } from "@/components/simulador/SimuladoVaga";
import { SIMULADOS, simuladoPorSlug } from "@/content/simulados";

export function generateStaticParams() {
  return SIMULADOS.map((s) => ({ nivel: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/simulado/[nivel]">): Promise<Metadata> {
  const s = simuladoPorSlug((await params).nivel);
  return s ? { title: `Simulado de teste de Excel: ${s.titulo}`, robots: { index: false, follow: true } } : {};
}

export default async function Pagina({ params }: PageProps<"/simulado/[nivel]">) {
  const s = simuladoPorSlug((await params).nivel);
  if (!s) notFound();
  return (
    <div className="space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/simulado" className="hover:text-zinc-800">
          Simulados de vaga
        </Link>{" "}
        / {s.titulo}
      </nav>
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Simulado {s.titulo}</h1>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">Pro</span>
        </div>
        <p className="text-muted">
          {s.cenario}: {s.questoes.length} tarefas em {s.minutos} minutos.
        </p>
      </header>
      <SimuladoVaga simulado={s} />
    </div>
  );
}
