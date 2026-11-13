"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Exercicio } from "@/content/schema";
import { registrar } from "@/lib/eventos";
import { APROVACAO, registrarTeste } from "@/lib/testes";
import { celebrarTrofeu } from "@/lib/celebrar";
import SimuladorCarregavel from "./SimuladorCarregavel";
import { IconeConquista } from "./Trofeu";

type Modulo = { slug: string; numero: number; titulo: string; icone: "medalha" | "taca"; conquista: string };
type Proximo = { numero: number; titulo: string; href: string };

type Props = {
  modulo: Modulo;
  /** Próximo módulo da trilha (ausente no último). */
  proximo?: Proximo;
  questoes: Exercicio[];
  /** Lição de cada questão, para mandar quem errou de volta para ela. */
  revisar: Record<string, { slug: string; titulo: string } | undefined>;
};

/** Teste do módulo: uma tentativa por questão, sem dica; 4 de 5 aprova. */
export function TesteModulo({ modulo, proximo, questoes, revisar }: Props) {
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

  if (fim)
    return (
      <ResultadoTeste
        modulo={modulo}
        questoes={questoes}
        respostas={respostas}
        revisar={revisar}
        proximo={proximo}
        onRefazer={() => {
          setRespostas([]);
          setIndice(0);
          setRodada((r) => r + 1);
        }}
      />
    );

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

function ResultadoTeste({
  modulo,
  questoes,
  respostas,
  revisar,
  proximo,
  onRefazer,
}: {
  modulo: Modulo;
  questoes: Exercicio[];
  respostas: boolean[];
  revisar: Props["revisar"];
  proximo?: Proximo;
  onRefazer: () => void;
}) {
  const acertos = respostas.filter(Boolean).length;
  const total = questoes.length;
  const aprovado = acertos >= APROVACAO;
  const gabaritou = acertos === total;
  const licoes = [
    ...new Map(
      questoes
        .filter((_, i) => !respostas[i])
        .map((q) => revisar[q.slug])
        .filter((l) => l !== undefined)
        .map((l) => [l.slug, l]),
    ).values(),
  ];

  useEffect(() => {
    if (aprovado) void celebrarTrofeu();
  }, [aprovado]);

  const botao = "inline-flex items-center justify-center rounded-lg px-5 py-3 font-semibold";
  const primario = `${botao} bg-ink text-white hover:bg-ink-soft`;
  const secundario = `${botao} border border-line bg-white text-ink hover:bg-bg`;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface" data-testid="resultado-teste">
      <div className={`flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center ${aprovado ? "bg-success-bg" : "bg-warning-bg"}`}>
        {aprovado ? (
          <IconeConquista icone={modulo.icone} className="h-20 w-20 motion-safe:animate-pop" />
        ) : (
          <Placar acertos={acertos} total={total} />
        )}
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Teste do Módulo {modulo.numero} · {aprovado ? "aprovado" : `faltou ${APROVACAO - acertos}`}
        </p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-balance">
          {gabaritou ? "Gabaritou! " : aprovado ? "Aprovado! " : "Quase lá. "}
          {aprovado ? `Módulo ${modulo.numero} dominado.` : `Você acertou ${acertos} de ${total}.`}
        </h2>
        <p className="max-w-prose text-muted">
          {aprovado
            ? `Você acertou ${acertos} de ${total}. ${modulo.conquista}`
            : `Para passar, são ${APROVACAO} acertos. Revise as lições das questões que escaparam e tente de novo: as questões são as mesmas.`}
        </p>
      </div>

      <div className="space-y-6 p-6">
        <ol className="divide-y divide-line rounded-xl border border-line bg-white" data-testid="questoes-teste">
          {questoes.map((q, i) => {
            const certo = respostas[i];
            const licao = revisar[q.slug];
            return (
              <li key={q.slug} className="flex items-center gap-3 px-4 py-3 text-[15px]">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${certo ? "bg-success" : "bg-red-500"}`}
                  aria-label={certo ? "acertou" : "errou"}
                >
                  {certo ? "✓" : "✗"}
                </span>
                <span className="min-w-0 flex-1">{q.titulo}</span>
                {!certo && licao && (
                  <Link
                    href={`/exercicios/${licao.slug}`}
                    title={licao.titulo}
                    className="shrink-0 text-sm text-success underline-offset-4 hover:underline"
                    data-testid="revisar"
                  >
                    Revisar a lição
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {aprovado ? (
            <>
              {proximo ? (
                <Link href={proximo.href} className={primario} data-testid="proximo-modulo">
                  Começar o Módulo {proximo.numero}: {proximo.titulo} →
                </Link>
              ) : (
                <Link href="/trilha" className={primario}>
                  Ver a trilha completa
                </Link>
              )}
              {proximo && (
                <Link href="/trilha" className={secundario}>
                  Voltar para a trilha
                </Link>
              )}
            </>
          ) : (
            <>
              {licoes[0] && (
                <Link href={`/exercicios/${licoes[0].slug}`} className={primario} data-testid="comecar-revisao">
                  Começar a revisão →
                </Link>
              )}
              <Link href="/trilha" className={secundario}>
                Voltar para a trilha
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onRefazer}
            className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline sm:ml-auto"
          >
            Refazer o teste
          </button>
        </div>
      </div>
    </section>
  );
}

/** Nota grande em círculo, para quem ainda não passou. */
function Placar({ acertos, total }: { acertos: number; total: number }) {
  return (
    <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-ink bg-white motion-safe:animate-pop">
      <span className="font-display text-2xl font-extrabold">
        {acertos}/{total}
      </span>
    </div>
  );
}
