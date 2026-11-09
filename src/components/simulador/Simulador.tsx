"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercicio } from "@/content/schema";
import { Planilha } from "@/engine/engine";
import { corrigir, type Resultado } from "@/grader/corrigir";
import * as progresso from "@/lib/progresso";
import { BarraFormulas } from "./BarraFormulas";
import { Contexto, type ContextoSimulador } from "./contexto";
import { Grade } from "./Grade";
import { PainelExercicio } from "./PainelExercicio";
import { criarStore } from "./store";

function montar(ex: Exercicio): Omit<ContextoSimulador, "entradaRef"> {
  const planilha = Planilha.deExercicio(ex);
  const salvo = progresso.ler(ex.slug, ex.versao);
  if (salvo) {
    planilha.definirVarias(
      Object.entries(salvo.conteudos).map(([endereco, bruto]) => ({ endereco, bruto })),
    );
  }
  return { planilha, store: criarStore(planilha), alvos: new Set(ex.alvos.map((a) => a.celula)) };
}

type Props = { exercicio: Exercicio; proximo?: { slug: string; titulo: string } };

export default function Simulador({ exercicio: ex, proximo }: Props) {
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const [nucleo, setNucleo] = useState(() => montar(ex));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativas, setTentativas] = useState(() => progresso.ler(ex.slug, ex.versao)?.tentativas ?? 0);
  const [concluido, setConcluido] = useState(
    () => progresso.ler(ex.slug, ex.versao)?.status === "concluido",
  );
  const [dicasVistas, setDicasVistas] = useState(0);

  const { planilha } = nucleo;

  // Salva as edições do aluno a cada recálculo.
  useEffect(() => {
    return planilha.subscribe(() => {
      const atual = progresso.ler(ex.slug, ex.versao);
      progresso.salvar(ex.slug, {
        versao: ex.versao,
        status: atual?.status ?? "em-andamento",
        tentativas: atual?.tentativas ?? 0,
        conteudos: Object.fromEntries(
          Object.entries(planilha.conteudos()).filter(([end]) => !planilha.bloqueada(end)),
        ),
      });
    });
  }, [planilha, ex.slug, ex.versao]);

  useEffect(() => () => planilha.destruir(), [planilha]);

  const verificar = () => {
    if (nucleo.store.getState().modo !== "pronto" && !nucleo.store.getState().confirmar()) return;
    const r = corrigir(ex, planilha);
    const n = tentativas + 1;
    setResultado(r);
    setTentativas(n);
    const ok = r.ok || concluido;
    if (r.ok) setConcluido(true);
    progresso.salvar(ex.slug, {
      versao: ex.versao,
      status: ok ? "concluido" : "em-andamento",
      tentativas: n,
      conteudos: Object.fromEntries(
        Object.entries(planilha.conteudos()).filter(([end]) => !planilha.bloqueada(end)),
      ),
    });
    entradaRef.current?.focus();
  };

  const reiniciar = () => {
    progresso.apagar(ex.slug);
    setNucleo(montar(ex));
    setResultado(null);
    setTentativas(0);
    setConcluido(false);
    setDicasVistas(0);
  };

  return (
    <Contexto.Provider value={{ ...nucleo, entradaRef }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-2">
          <BarraFormulas />
          <Grade larguras={ex.grade.larguras} />
          <p className="text-xs text-zinc-500">
            Enter confirma · F2 edita · setas navegam · Ctrl+C/Ctrl+V copiam · Ctrl+D preenche para baixo ·
            Ctrl+Z desfaz · arraste o quadradinho verde para copiar a fórmula
          </p>
        </div>
        <PainelExercicio
          exercicio={ex}
          resultado={resultado}
          tentativas={tentativas}
          dicasVistas={dicasVistas}
          concluido={concluido}
          proximo={proximo}
          onVerificar={verificar}
          onDica={() => setDicasVistas((d) => Math.min(d + 1, ex.dicas.length))}
          onReiniciar={reiniciar}
        />
      </div>
    </Contexto.Provider>
  );
}
