import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { desafioDoDia, hojeNoServidor, numeroDoDesafio } from "@/content/desafios";
import { dataBR, somarDias } from "@/lib/data-sp";

export const metadata: Metadata = {
  title: "Desafio diário de Excel",
  description:
    "Um desafio de Excel novo todo dia, o mesmo para todo mundo, numa planilha no navegador com fórmulas em português. Sem dicas: a solução comentada sai no dia seguinte.",
  alternates: { canonical: "/desafio" },
};

export default function PaginaDesafio() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-zinc-500">Carregando o desafio de hoje…</p>}>
        <DesafioDeHoje />
      </Suspense>
    </div>
  );
}

/** Roda a cada request: a data vem do servidor, em São Paulo. */
async function DesafioDeHoje() {
  await connection();
  const hoje = hojeNoServidor();
  const desafio = desafioDoDia(hoje);
  const ontem = desafioDoDia(somarDias(hoje, -1));

  if (!desafio) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Desafio diário</h1>
        <p className="text-zinc-600">Ainda não há desafio para hoje. Volte amanhã!</p>
        <Link href="/desafio/anteriores" className="text-emerald-800 underline">
          Ver desafios anteriores
        </Link>
      </div>
    );
  }

  const numero = numeroDoDesafio(hoje);
  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>
          Desafio diário <strong className="text-zinc-800">#{numero}</strong> · {dataBR(hoje)}
        </span>
        <span className="flex gap-4">
          {ontem && (
            <Link href={`/desafio/${ontem.data}`} className="hover:text-zinc-800">
              Solução de ontem
            </Link>
          )}
          <Link href="/desafio/anteriores" className="hover:text-zinc-800">
            Anteriores
          </Link>
        </span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{desafio.exercicio.titulo}</h1>
      <p className="text-sm text-zinc-500">O mesmo desafio para todo mundo. Sem dicas: a solução comentada sai amanhã.</p>
      <SimuladorCarregavel key={hoje} exercicio={desafio.exercicio} desafio={{ numero, data: hoje }} />
    </>
  );
}
