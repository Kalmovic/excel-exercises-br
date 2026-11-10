"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import type { Exercicio } from "@/content/schema";
import type { Resultado } from "@/grader/corrigir";
import { TextoRico } from "./TextoRico";
import { descricaoAlvos } from "@/content/destaque";

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
  /** Presente só em módulos que permitem pular. */
  onPular?: () => void;
  proximoModulo?: { titulo: string; href: string };
  /** Conteúdo extra depois do resultado (ex.: compartilhar o desafio). */
  extra?: ReactNode;
  botaoVerificarRef?: Ref<HTMLButtonElement>;
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
  onPular,
  proximoModulo,
  extra,
  botaoVerificarRef,
}: Props) {
  const mostrarExplicacao = concluido || tentativas >= ex.tentativasAteExplicacao;
  const alvos = descricaoAlvos(ex);

  return (
    <aside className="flex flex-col gap-4">
      <section className="space-y-2 text-[15px] leading-relaxed text-zinc-800">
        {ex.enunciado.map((p, i) => (
          <p key={i}>
            <TextoRico texto={p} />
          </p>
        ))}
        {alvos && (
          <p className="text-sm text-zinc-500">
            Células do exercício:{" "}
            <span className="rounded bg-accent-soft px-1 font-mono text-ink ring-1 ring-accent">{alvos}</span>
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onVerificar}
          ref={botaoVerificarRef}
          data-testid="verificar"
          className="rounded-md bg-ink px-4 py-2 font-medium text-white shadow-sm hover:bg-ink-soft"
        >
          Verificar
        </button>
        {ex.dicas.length > 0 && (
          <button
            type="button"
            onClick={onDica}
            disabled={dicasVistas >= ex.dicas.length}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-bg disabled:opacity-40"
          >
            {dicasVistas === 0 ? "Ver dica" : `Próxima dica (${dicasVistas}/${ex.dicas.length})`}
          </button>
        )}
        <button
          type="button"
          onClick={onReiniciar}
          className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          Recomeçar
        </button>
        {onPular && (
          <button
            type="button"
            onClick={onPular}
            data-testid="pular"
            className="ml-auto rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
          >
            Pular questão →
          </button>
        )}
      </div>

      {resultado && (
        <div
          key={tentativas}
          data-testid="resultado"
          className={`rounded-md border p-3 text-sm motion-safe:animate-pop ${
            resultado.ok
              ? "border-success/30 bg-success-bg text-success"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {resultado.ok ? (
            <div className="flex items-center gap-3">
              <IconeCheck />
              <div>
                <p className="text-base font-semibold">Correto!</p>
                <p className="text-success">{elogio(tentativas)}</p>
              </div>
            </div>
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

      {extra}

      {dicasVistas > 0 && (
        <section className="rounded-md border border-line bg-warning-bg p-3 text-sm text-ink">
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
        <section className="rounded-md border border-line bg-bg p-3 text-sm text-zinc-800" data-testid="explicacao">
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
          className="self-start rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft"
        >
          Próximo exercício →
        </Link>
      )}
      {concluido && !proximo && proximoModulo && (
        <Link
          href={proximoModulo.href}
          className="self-start rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft"
        >
          Próximo módulo →
        </Link>
      )}
      {concluido && !proximo && !proximoModulo && (
        <Link href="/" className="self-start text-success underline">
          Este foi o último exercício do módulo. Voltar para a lista
        </Link>
      )}
    </aside>
  );
}

const ELOGIOS = ["Mandou bem!", "Fórmula certinha.", "Exatamente isso.", "É assim que se faz.", "Planilha resolvida."];

function elogio(tentativas: number) {
  if (tentativas === 1) return "Acertou de primeira!";
  return ELOGIOS[tentativas % ELOGIOS.length];
}

/** Círculo verde com o check sendo "desenhado". */
function IconeCheck() {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden>
      <circle cx="20" cy="20" r="18" className="fill-success motion-safe:animate-pop" />
      <path
        d="M12 20.5l5.5 5.5L28.5 15"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="30"
        strokeDashoffset="0"
        className="motion-safe:[animation:desenhar_450ms_200ms_ease-out_both]"
      />
    </svg>
  );
}
