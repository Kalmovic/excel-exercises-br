import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { desafioDoDia, hojeNoServidor, numeroDoDesafio, rotuloNivel } from "@/content/desafios";
import { dataBR, somarDias } from "@/lib/data-sp";
import { NOME_DESAFIO } from "@/lib/site";
import { upsellDoExercicio } from "@/content/modulos-pro";

export const metadata: Metadata = {
  title: `${NOME_DESAFIO}: desafio diário de Excel`,
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
        <h1 className="text-2xl font-bold tracking-tight">{NOME_DESAFIO}</h1>
        <p className="text-zinc-600">Ainda não há desafio para hoje. Volte amanhã!</p>
        <Link href="/desafio/anteriores" className="text-success underline">
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
          {NOME_DESAFIO} <strong className="text-zinc-800">#{numero}</strong> · {dataBR(hoje)}
          <SeloNivel nivel={desafio.nivel} caso={desafio.caso} />
        </span>
        <span className="flex gap-4">
          {ontem && (
            <Link href={`/desafio/${ontem.data}`} className="hover:text-zinc-800">
              Solução de ontem
            </Link>
          )}
          <Link href="/desafio/anteriores" className="hover:text-zinc-800">
            Anteriores <span className="rounded bg-accent px-1 text-xs text-ink">Pro</span>
          </Link>
        </span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{desafio.exercicio.titulo}</h1>
      <p className="text-sm text-zinc-500">
        O mesmo desafio para todo mundo. Sem dicas: a solução comentada sai amanhã. A dificuldade sobe durante a
        semana: segunda é nível 1; sexta, nível 3; no fim de semana, um caso real com várias etapas.
      </p>
      <SimuladorCarregavel
        key={hoje}
        exercicio={desafio.exercicio}
        previa={<PreviaExercicio exercicio={desafio.exercicio} />}
        desafio={{ numero, data: hoje, rotulo: rotuloNivel(desafio), upsell: upsellDoExercicio(desafio.exercicio) }}
      />
    </>
  );
}

function SeloNivel({ nivel, caso }: { nivel: number; caso: boolean }) {
  return (
    <span
      data-testid="selo-nivel"
      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
        caso ? "bg-violet-100 text-violet-900" : ["", "bg-warning-bg text-ink", "bg-accent text-ink", "bg-rose-100 text-rose-900"][nivel]
      }`}
    >
      {rotuloNivel({ nivel, caso })}
    </span>
  );
}
