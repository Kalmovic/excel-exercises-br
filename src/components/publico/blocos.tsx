import Link from "next/link";
import type { ReactNode } from "react";
import { LinkRastreado } from "@/components/site/LinkRastreado";
import type { Evento } from "@/lib/eventos";

/** Peças das páginas por público (emprego, concurso, empresas, universidades). */

export function Topo({ selo, titulo, children, cta }: { selo: string; titulo: string; children: ReactNode; cta?: ReactNode }) {
  return (
    <header className="max-w-3xl space-y-4">
      <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">{selo}</span>
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{titulo}</h1>
      <div className="space-y-3 text-lg text-muted">{children}</div>
      {cta && <div className="flex flex-wrap gap-3 pt-2">{cta}</div>}
    </header>
  );
}

export function Secao({ id, rotulo, titulo, children }: { id?: string; rotulo?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-5">
      <div>
        {rotulo && <p className="mb-1 text-xs font-bold tracking-wider text-success uppercase">{rotulo}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

export function Cartoes({ itens }: { itens: { titulo: string; texto: ReactNode; selo?: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((c) => (
        <div key={c.titulo} className="rounded-xl border border-line bg-surface p-5">
          <p className="mb-1 font-semibold">
            {c.titulo}
            {c.selo && <span className="ml-2 rounded-full bg-header px-2 py-0.5 text-[11px] font-semibold text-muted">{c.selo}</span>}
          </p>
          <div className="text-sm text-muted">{c.texto}</div>
        </div>
      ))}
    </div>
  );
}

export function Passos({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {itens.map(([titulo, texto], i) => (
        <li key={titulo} className="rounded-xl border border-line bg-surface p-5">
          <span className="mb-3 grid h-8 w-8 place-items-center rounded-md bg-accent font-bold">{i + 1}</span>
          <p className="mb-1 font-semibold">{titulo}</p>
          <div className="text-sm text-muted">{texto}</div>
        </li>
      ))}
    </ol>
  );
}

export function Perguntas({ itens }: { itens: [string, string][] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {itens.map(([p, r]) => (
        <details key={p} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
            {p}
            <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <p className="mt-3 text-muted">{r}</p>
        </details>
      ))}
    </div>
  );
}

export const botaoEscuro = "inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink-soft";
export const botaoClaro = "inline-block rounded-lg border border-ink bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-bg";

export function CtaTrilha({ local, texto = "Começar grátis" }: { local: Extract<Evento, { nome: "cta_landing" }>["local"]; texto?: string }) {
  return (
    <LinkRastreado href="/trilha" className={botaoEscuro} evento={{ nome: "cta_landing", local }}>
      {texto}
    </LinkRastreado>
  );
}

export function LinkExercicio({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <Link href={`/exercicios/${slug}`} className="font-medium text-success underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
