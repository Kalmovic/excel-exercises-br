import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { desafiosAnteriores, hojeNoServidor, numeroDoDesafio } from "@/content/desafios";
import { dataBR } from "@/lib/data-sp";

export const metadata: Metadata = {
  title: "Desafios de Excel anteriores, com solução",
  description: "Todos os desafios diários de Excel que já passaram, cada um com a solução comentada.",
  alternates: { canonical: "/desafio/anteriores" },
};

export default function Anteriores() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Desafios anteriores</h1>
      <p className="text-zinc-600">
        Cada desafio ganha uma solução comentada no dia seguinte.{" "}
        <Link href="/desafio" className="text-emerald-800 underline">
          Fazer o desafio de hoje
        </Link>
      </p>
      <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
        <Lista />
      </Suspense>
    </div>
  );
}

async function Lista() {
  await connection();
  const lista = desafiosAnteriores(hojeNoServidor());
  if (lista.length === 0) return <p className="text-zinc-500">Ainda não há desafios anteriores.</p>;
  return (
    <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white" data-testid="lista-anteriores">
      {lista.map((d) => (
        <li key={d.data}>
          <Link href={`/desafio/${d.data}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
            <span className="w-12 shrink-0 font-mono text-sm text-zinc-500">#{numeroDoDesafio(d.data)}</span>
            <span className="flex-1">{d.exercicio.titulo}</span>
            <span className="text-sm text-zinc-500">{dataBR(d.data)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
