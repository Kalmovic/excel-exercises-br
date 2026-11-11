"use client";

import Link from "next/link";
import { useState } from "react";
import type { Exercicio } from "@/content/schema";
import { registrar } from "@/lib/eventos";
import { APROVACAO, registrarTeste } from "@/lib/testes";
import SimuladorCarregavel from "./SimuladorCarregavel";

type Props = {
  modulo: { slug: string; numero: number; titulo: string };
  questoes: Exercicio[];
  /** Lição de cada questão, para mandar quem errou de volta para ela. */
  revisar: Record<string, { slug: string; titulo: string } | undefined>;
};

/** Teste do módulo: uma tentativa por questão, sem dica; 4 de 5 aprova. */
export function TesteModulo({ modulo, questoes, revisar }: Props) {
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<boolean[]>([]);
  const [rodada, setRodada] = useState(0);
  const fim = respostas.length === questoes.length && indice >= questoes.length;
  const respondida = respostas.length > indice;

  const responder = (ok: boolean) => {
    setRespostas((r) => {
      if (r.length > indice) return r; // uma tentativa por questão
      const novas = [...r, ok];
      if (novas.length === questoes.length) {
        const acertos = novas.filter(Boolean).length;
        registrarTeste(modulo.slug, acertos, questoes.length);
        registrar({ nome: "teste_concluido", modulo: modulo.slug, acertos, aprovado: acertos >= APROVACAO });
      }
      return novas;
    });
  };

  if (fim) {
    const acertos = respostas.filter(Boolean).length;
    const aprovado = acertos >= APROVACAO;
    const licoes = [...new Map(questoes.filter((_, i) => !respostas[i]).map((q) => revisar[q.slug]).filter(Boolean).map((l) => [l!.slug, l!])).values()];
    return (
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6" data-testid="resultado-teste">
        <p className={`text-2xl font-extrabold ${aprovado ? "text-success" : ""}`}>
          {aprovado ? "Aprovado!" : "Quase lá."} Você acertou {acertos} de {questoes.length}.
        </p>
        <p className="text-muted">
          {aprovado
            ? `O Módulo ${modulo.numero} está dominado.`
            : `Para passar, são ${APROVACAO} acertos. Revise as lições abaixo e tente de novo.`}
        </p>
        {licoes.length > 0 && (
          <div>
            <p className="mb-1 font-semibold">Para revisar</p>
            <ul className="list-disc pl-5" data-testid="revisar">
              {licoes.map((l) => (
                <li key={l.slug}>
                  <Link href={`/exercicios/${l.slug}`} className="text-success underline-offset-4 hover:underline">
                    {l.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setRespostas([]);
              setIndice(0);
              setRodada((r) => r + 1);
            }}
            className="rounded-lg border border-ink bg-white px-4 py-2 font-medium"
          >
            Refazer o teste
          </button>
          <Link href="/trilha" className="rounded-lg bg-ink px-4 py-2 font-medium text-white">
            Voltar para a trilha
          </Link>
        </div>
      </section>
    );
  }

  const q = questoes[indice];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium" data-testid="questao-teste">
          Questão {indice + 1} de {questoes.length}
        </p>
        <ol className="flex gap-1" aria-hidden>
          {questoes.map((_, i) => (
            <li
              key={i}
              className={`h-2 w-8 rounded-full ${i < respostas.length ? (respostas[i] ? "bg-success" : "bg-red-400") : i === indice ? "bg-ink" : "bg-header"}`}
            />
          ))}
        </ol>
      </div>
      <h2 className="text-xl font-bold">{q.titulo}</h2>
      <SimuladorCarregavel key={`${rodada}-${indice}`} exercicio={q} teste={{ aoResponder: responder }} />
      {respondida && (
        <button
          type="button"
          onClick={() => setIndice((i) => i + 1)}
          className="rounded-lg bg-ink px-5 py-3 font-semibold text-white"
          data-testid="proxima-teste"
        >
          {indice + 1 < questoes.length ? "Próxima questão →" : "Ver resultado"}
        </button>
      )}
    </div>
  );
}
