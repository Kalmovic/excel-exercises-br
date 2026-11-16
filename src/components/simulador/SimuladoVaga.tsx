"use client";

import Link from "next/link";
import { Activity, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Simulado } from "@/content/simulados";
import { registrar } from "@/lib/eventos";
import { registrarTeste } from "@/lib/testes";
import SimuladorCarregavel from "./SimuladorCarregavel";
import { TextoRico } from "./TextoRico";

type Fase = { tipo: "regras" } | { tipo: "prova"; inicio: number } | { tipo: "fim"; acertos: boolean[]; segundos: number; noTempo: boolean };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Simulado de teste de vaga: tempo marcado, ir e voltar entre as questões,
 * correção só na entrega. As questões ficam montadas (Activity), então a
 * resposta de cada uma continua lá quando o aluno volta.
 */
export function SimuladoVaga({ simulado }: { simulado: Simulado }) {
  const [fase, setFase] = useState<Fase>({ tipo: "regras" });
  const [rodada, setRodada] = useState(0);

  if (fase.tipo === "regras")
    return (
      <Regras
        simulado={simulado}
        onComecar={() => {
          registrar({ nome: "simulado_iniciado", nivel: simulado.slug });
          setFase({ tipo: "prova", inicio: Date.now() });
        }}
      />
    );
  if (fase.tipo === "prova")
    return (
      <Prova
        key={rodada}
        simulado={simulado}
        inicio={fase.inicio}
        onEntregar={(acertos, noTempo) => {
          const segundos = Math.min(Math.round((Date.now() - fase.inicio) / 1000), simulado.minutos * 60);
          const n = acertos.filter(Boolean).length;
          registrarTeste(`simulado-${simulado.slug}`, n, acertos.length, simulado.aprovacao);
          registrar({ nome: "simulado_entregue", nivel: simulado.slug, acertos: n, aprovado: n >= simulado.aprovacao, segundos, noTempo });
          setFase({ tipo: "fim", acertos, segundos, noTempo });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  return (
    <Resultado
      simulado={simulado}
      acertos={fase.acertos}
      segundos={fase.segundos}
      noTempo={fase.noTempo}
      onRefazer={() => {
        setRodada((r) => r + 1);
        setFase({ tipo: "regras" });
      }}
    />
  );
}

function Regras({ simulado: s, onComecar }: { simulado: Simulado; onComecar: () => void }) {
  return (
    <section className="space-y-6 rounded-3xl border border-line bg-surface p-6 sm:p-10" data-testid="regras-simulado">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">{s.cenario}</p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight">Antes de começar</h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[
          ["⏱", `${s.minutos} minutos`, "O tempo corre desde o início. Quando acabar, a prova é entregue sozinha."],
          ["📋", `${s.questoes.length} tarefas`, "Na mesma planilha da empresa, como nos testes de processo seletivo."],
          ["↔", "Vá e volte", "Pule uma tarefa difícil e volte depois: o que você fez fica guardado."],
          ["✓", `Passa com ${s.aprovacao} acertos`, "Sem dicas e sem correção durante a prova. O resultado sai na entrega."],
        ].map(([icone, titulo, texto]) => (
          <li key={titulo} className="flex gap-3 rounded-2xl bg-bg p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-accent" aria-hidden>
              {icone}
            </span>
            <span>
              <span className="block font-semibold">{titulo}</span>
              <span className="text-sm text-muted">{texto}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={onComecar} className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-white hover:bg-ink-soft" data-testid="comecar-simulado">
          Começar o simulado
        </button>
        <p className="text-sm text-muted">Dica: use o computador. A prova real quase sempre é feita nele.</p>
      </div>
    </section>
  );
}

function Prova({ simulado: s, inicio, onEntregar }: { simulado: Simulado; inicio: number; onEntregar: (acertos: boolean[], noTempo: boolean) => void }) {
  const [atual, setAtual] = useState(0);
  const [vistas, setVistas] = useState<Set<number>>(() => new Set([0]));
  const total = s.minutos * 60;
  const [agora, setAgora] = useState(() => Date.now());
  const restante = Math.max(0, total - Math.floor((agora - inicio) / 1000));

  // Cada questão registra aqui a função que corrige o estado dela.
  const corretores = useRef(new Map<number, () => boolean>());
  const registros = useMemo(
    () => s.questoes.map((_, i) => ({ registrar: (f: () => boolean) => void corretores.current.set(i, f) })),
    [s.questoes],
  );

  const entregue = useRef(false);
  const entregar = useCallback(
    (noTempo: boolean) => {
      if (entregue.current) return;
      entregue.current = true;
      const acertos = s.questoes.map((_, i) => {
        try {
          return corretores.current.get(i)?.() ?? false; // nunca aberta = não respondida
        } catch {
          return false;
        }
      });
      onEntregar(acertos, noTempo);
    },
    [s.questoes, onEntregar],
  );

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (restante === 0) entregar(false);
  }, [restante, entregar]);
  // Sair no meio da prova perde as respostas: o navegador pergunta antes.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  const ir = (i: number) => {
    setAtual(i);
    setVistas((v) => new Set(v).add(i));
  };
  const pouco = restante <= 5 * 60;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:gap-3" data-testid="barra-simulado">
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-base font-bold sm:px-3 sm:text-lg ${pouco ? "bg-red-100 text-red-700" : "bg-ink text-white"}`}
          data-testid="cronometro"
          aria-label={`Tempo restante: ${mmss(restante)}`}
        >
          {mmss(restante)}
        </span>
        <ol className="flex min-w-0 gap-1.5 overflow-x-auto" aria-label="Tarefas">
          {s.questoes.map((q, i) => (
            <li key={q.slug}>
              <button
                type="button"
                onClick={() => ir(i)}
                aria-current={i === atual ? "step" : undefined}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm font-semibold ${
                  i === atual ? "border-ink bg-ink text-white" : vistas.has(i) ? "border-ink bg-white" : "border-line bg-white text-muted"
                }`}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => window.confirm("Entregar o simulado agora? Depois não dá para mudar as respostas.") && entregar(true)}
          className="ml-auto shrink-0 rounded-lg bg-accent px-3 py-2 font-semibold text-ink hover:brightness-95 sm:px-4"
          data-testid="entregar-simulado"
        >
          Entregar
        </button>
      </div>

      {s.questoes.map((q, i) => (
        <Activity key={q.slug} mode={i === atual ? "visible" : "hidden"}>
          <section className="space-y-3" data-testid="tarefa">
            <h2 className="text-xl font-bold">
              Tarefa {i + 1} de {s.questoes.length}: {q.titulo}
            </h2>
            <SimuladorCarregavel exercicio={q} simulado={registros[i]} />
          </section>
        </Activity>
      ))}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          disabled={atual === 0}
          onClick={() => ir(atual - 1)}
          className="rounded-lg border border-line bg-white px-4 py-2 font-medium disabled:opacity-40"
        >
          ← Anterior
        </button>
        {atual < s.questoes.length - 1 ? (
          <button type="button" onClick={() => ir(atual + 1)} className="rounded-lg bg-ink px-4 py-2 font-medium text-white" data-testid="proxima-tarefa">
            Próxima →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.confirm("Entregar o simulado agora? Depois não dá para mudar as respostas.") && entregar(true)}
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-ink"
          >
            Entregar
          </button>
        )}
      </div>
    </div>
  );
}

function Resultado({
  simulado: s,
  acertos,
  segundos,
  noTempo,
  onRefazer,
}: {
  simulado: Simulado;
  acertos: boolean[];
  segundos: number;
  noTempo: boolean;
  onRefazer: () => void;
}) {
  const n = acertos.filter(Boolean).length;
  const aprovado = n >= s.aprovacao;
  const pct = Math.round((n / acertos.length) * 100);
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface" data-testid="resultado-simulado">
      <div className={`grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-10 ${aprovado ? "bg-success-bg" : "bg-warning-bg"}`}>
        <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-ink bg-white">
          <span className="font-display text-3xl font-extrabold">{pct}%</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-muted uppercase">Simulado {s.titulo}</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">
            {aprovado
              ? "Aprovado! Você está pronto para esse nível."
              : n === s.aprovacao - 1
                ? "Quase! Faltou 1 acerto."
                : "Ainda não. Treine os temas e tente de novo."}
          </h2>
          <p className="text-muted">
            {n} de {acertos.length} tarefas certas · {noTempo ? `entregue em ${mmss(segundos)}` : "o tempo acabou"} · para passar, {s.aprovacao} acertos.
          </p>
        </div>
      </div>
      <div className="space-y-6 p-6 sm:p-10">
        <ol className="divide-y divide-line rounded-2xl border border-line" data-testid="tarefas-resultado">
          {s.questoes.map((q, i) => (
            <li key={q.slug}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${acertos[i] ? "bg-success" : "bg-red-500"}`}
                    aria-label={acertos[i] ? "acertou" : "errou"}
                  >
                    {acertos[i] ? "✓" : "✗"}
                  </span>
                  <span className="min-w-0 flex-1">
                    {i + 1}. {q.titulo}
                  </span>
                  <span className="text-sm text-success group-open:hidden">Ver resolução</span>
                </summary>
                <div className="space-y-1.5 px-4 pb-4 pl-14 text-sm text-zinc-700">
                  {q.explicacao.map((p, j) => (
                    <p key={j}>
                      <TextoRico texto={p} />
                    </p>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onRefazer} className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
            Refazer o simulado
          </button>
          <Link href="/simulado" className="rounded-lg border border-line bg-white px-5 py-3 font-semibold hover:bg-bg">
            Outros níveis
          </Link>
          <Link href="/trilha" className="rounded-lg px-5 py-3 font-semibold text-success hover:underline">
            Treinar na trilha
          </Link>
        </div>
      </div>
    </section>
  );
}
