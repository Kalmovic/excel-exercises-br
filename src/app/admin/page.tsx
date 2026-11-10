import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { catalogo } from "@/content/catalogo";
import { hojeNoServidor } from "@/content/desafios";
import { ehAdmin } from "@/lib/admin";
import { sair } from "./acoes";

export default function Admin() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
      <Painel />
    </Suspense>
  );
}

async function Painel() {
  if (!(await ehAdmin())) notFound(); // quem não é admin vê 404, como se a página não existisse
  const itens = catalogo();
  const hoje = hojeNoServidor();
  const grupos = [...new Set(itens.map((i) => i.grupo))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Exercícios ({itens.length})</h1>
        <form action={sair}>
          <button type="submit" className="text-sm text-zinc-600 underline">
            Sair do admin
          </button>
        </form>
      </div>
      {grupos.map((g) => (
        <section key={g} className="space-y-2">
          <h2 className="font-semibold">{g}</h2>
          <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white" data-testid={`grupo-${g}`}>
            {itens
              .filter((i) => i.grupo === g)
              .map((i) => {
                const quando = i.data ? (i.data < hoje ? "passado" : i.data === hoje ? "hoje" : "futuro") : null;
                return (
                  <li key={i.slug}>
                    <Link href={`/admin/exercicios/${i.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
                      <span className="flex-1">{i.titulo}</span>
                      {quando && (
                        <span
                          className={`rounded px-1.5 text-xs ${
                            quando === "hoje" ? "bg-emerald-100 text-emerald-900" : quando === "futuro" ? "bg-violet-100 text-violet-900" : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {quando}
                        </span>
                      )}
                      <span className="font-mono text-xs text-zinc-500">{i.detalhe}</span>
                    </Link>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </div>
  );
}
