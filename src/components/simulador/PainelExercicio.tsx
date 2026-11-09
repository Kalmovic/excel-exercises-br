"use client";

import Link from "next/link";
import type { Exercicio } from "@/content/schema";
import type { Resultado } from "@/grader/corrigir";
import { TextoRico } from "./TextoRico";

type Props = {
  exercicio: Exercicio;
  resultado: Resultado | null;
  tentativas: number;
  dicasVistas: number;
  concluido: boolean;
  proximo?: { slug: string; titulo: string };
  onVerificar: () => void;
  onDica: () => void;
  onReiniciar: () => void;
};

export function PainelExercicio({
  exercicio: ex,
  resultado,
  tentativas,
  dicasVistas,
  concluido,
  proximo,
  onVerificar,
  onDica,
  onReiniciar,
}: Props) {
  const mostrarExplicacao = concluido || tentativas >= ex.tentativasAteExplicacao;
  const alvos = ex.alvos.map((a) => a.celula);

  return (
    <aside className="flex flex-col gap-4">
      <section className="space-y-2 text-[15px] leading-relaxed text-zinc-800">
        {ex.enunciado.map((p, i) => (
          <p key={i}>
            <TextoRico texto={p} />
          </p>
        ))}
        <p className="text-sm text-zinc-500">
          Células do exercício:{" "}
          <span className="rounded bg-amber-50 px-1 font-mono text-amber-900 ring-1 ring-amber-200">
            {alvos.length > 3 ? `${alvos[0]}:${alvos[alvos.length - 1]}` : alvos.join(", ")}
          </span>
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onVerificar}
          data-testid="verificar"
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          Verificar
        </button>
        <button
          type="button"
          onClick={onDica}
          disabled={dicasVistas >= ex.dicas.length}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {dicasVistas === 0 ? "Ver dica" : `Próxima dica (${dicasVistas}/${ex.dicas.length})`}
        </button>
        <button
          type="button"
          onClick={onReiniciar}
          className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          Recomeçar
        </button>
      </div>

      {resultado && (
        <div
          data-testid="resultado"
          className={`rounded-md border p-3 text-sm ${
            resultado.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {resultado.ok ? (
            <p className="font-semibold">Correto! 🎉</p>
          ) : (
            <>
              <p className="mb-1 font-semibold">Ainda não. Tentativa {tentativas}.</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {resultado.falhas.slice(0, 4).map((f, i) => (
                  <li key={i}>{f.mensagem}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {dicasVistas > 0 && (
        <section className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <p className="mb-1 font-semibold">Dicas</p>
          <ol className="list-decimal space-y-1 pl-5">
            {ex.dicas.slice(0, dicasVistas).map((d, i) => (
              <li key={i}>
                <TextoRico texto={d} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {mostrarExplicacao && (
        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800" data-testid="explicacao">
          <p className="mb-1 font-semibold">Explicação</p>
          <div className="space-y-1.5">
            {ex.explicacao.map((p, i) => (
              <p key={i}>
                <TextoRico texto={p} />
              </p>
            ))}
          </div>
        </section>
      )}

      {concluido && proximo && (
        <Link
          href={`/exercicios/${proximo.slug}`}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
        >
          Próximo: {proximo.titulo} →
        </Link>
      )}
      {concluido && !proximo && (
        <Link href="/" className="self-start text-emerald-800 underline">
          Este foi o último exercício do módulo. Voltar para a lista
        </Link>
      )}
    </aside>
  );
}
