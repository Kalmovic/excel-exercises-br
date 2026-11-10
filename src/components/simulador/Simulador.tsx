"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { celulasDestacadas } from "@/content/destaque";
import type { Exercicio } from "@/content/schema";
import type { Trilha } from "@/content/trilha";
import { deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir, type Resultado } from "@/grader/corrigir";
import { celebrarAcerto, celebrarTrofeu } from "@/lib/celebrar";
import * as progresso from "@/lib/progresso";
import { BarraFormatacao } from "./BarraFormatacao";
import { BarraFormulas } from "./BarraFormulas";
import { CampoResposta } from "./CampoResposta";
import { Contexto, type ContextoSimulador } from "./contexto";
import { Grade } from "./Grade";
import { PainelExercicio } from "./PainelExercicio";
import { criarStore } from "./store";
import { TrofeuModal } from "./Trofeu";
import { CompartilharDesafio } from "@/components/desafio/CompartilharDesafio";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { preencherSolucao } from "@/components/admin/solucao";

function montar(ex: Exercicio, restaurar = true): Omit<ContextoSimulador, "entradaRef"> {
  const planilha = Planilha.deExercicio(ex);
  const salvo = restaurar ? progresso.ler(ex.slug, ex.versao) : undefined;
  if (salvo) {
    planilha.definirVarias(
      Object.entries(salvo.conteudos).map(([endereco, bruto]) => ({ endereco, bruto })),
    );
    for (const [end, f] of Object.entries(salvo.formatos ?? {})) planilha.formatar(deIntervalo(end), f);
  }
  const inicio = ex.inicio?.selecao ?? ex.inicio?.celulaAtiva;
  return {
    planilha,
    store: criarStore(planilha, inicio ? deIntervalo(inicio) : undefined, salvo?.resposta ?? "", {
      selecaoFixa: ex.ferramentas?.selecaoFixa,
    }),
    alvos: new Set(celulasDestacadas(ex)),
    formatacao: ex.ferramentas?.formatacao ?? false,
    caixaDeNome: ex.ferramentas?.caixaDeNome ?? true,
    selecaoFixa: ex.ferramentas?.selecaoFixa ?? false,
  };
}

type Props = {
  exercicio: Exercicio;
  proximo?: { slug: string; titulo: string };
  /** Exercício da trilha: troféu, pular, próximo módulo. */
  trilha?: Trilha;
  /** Desafio diário: card de compartilhamento depois de acertar. */
  desafio?: { numero: number; data: string; rotulo: string };
  /** Visão admin: não lê nem grava progresso e mostra o gabarito. */
  admin?: boolean;
};

export default function Simulador({ exercicio: ex, proximo, trilha, desafio, admin = false }: Props) {
  const router = useRouter();
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const botaoVerificarRef = useRef<HTMLButtonElement | null>(null);
  const [trofeu, setTrofeu] = useState<{ tentativas: number } | null>(null);
  const [nucleo, setNucleo] = useState(() => montar(ex, !admin));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativas, setTentativas] = useState(() => (admin ? 0 : (progresso.ler(ex.slug, ex.versao)?.tentativas ?? 0)));
  const [concluido, setConcluido] = useState(
    () => !admin && progresso.ler(ex.slug, ex.versao)?.status === "concluido",
  );
  const [dicasVistas, setDicasVistas] = useState(0);

  const { planilha, store } = nucleo;

  /** Grava o estado atual do exercício (conteúdo, formatos e resposta). */
  const persistir = (status?: progresso.ProgressoExercicio["status"], n?: number, historico?: boolean[]) => {
    if (admin) return; // o admin testa sem mexer no progresso
    const atual = progresso.ler(ex.slug, ex.versao);
    progresso.salvar(ex.slug, {
      versao: ex.versao,
      status: status ?? atual?.status ?? "em-andamento",
      tentativas: n ?? atual?.tentativas ?? 0,
      conteudos: Object.fromEntries(
        Object.entries(planilha.conteudos()).filter(([end]) => !planilha.bloqueada(end)),
      ),
      formatos: planilha.formatosDoAluno(),
      resposta: store.getState().resposta,
      historico: historico ?? atual?.historico,
    });
  };
  const persistirRef = useRef(persistir);
  useEffect(() => {
    persistirRef.current = persistir;
  });

  // Salva a cada recálculo da planilha e a cada mudança na resposta em texto.
  useEffect(() => {
    const sairPlanilha = planilha.subscribe(() => persistirRef.current());
    const sairStore = store.subscribe((s, antes) => {
      if (s.resposta !== antes.resposta) persistirRef.current();
    });
    return () => {
      sairPlanilha();
      sairStore();
    };
  }, [planilha, store]);

  useEffect(() => () => planilha.destruir(), [planilha]);

  const verificar = () => {
    const s = store.getState();
    if (s.modo !== "pronto" && !s.confirmar()) return;
    const r = corrigir(ex, planilha, {
      ativa: paraEndereco(s.ancora),
      selecao: intervaloParaTexto(s.selecao()),
      resposta: s.resposta,
      mudancasPeloMouse: s.mudancasPeloMouse,
    });
    const n = tentativas + 1;
    setResultado(r);
    setTentativas(n);
    if (r.ok) setConcluido(true);
    const anterior = progresso.ler(ex.slug, ex.versao)?.status;
    // Histórico de acertos/erros por verificação (card de compartilhamento do desafio).
    const historico = concluido
      ? progresso.ler(ex.slug, ex.versao)?.historico
      : [...(progresso.ler(ex.slug, ex.versao)?.historico ?? []), r.ok];
    persistir(r.ok || concluido ? "concluido" : anterior === "pulado" ? "pulado" : "em-andamento", n, historico);
    if (r.ok) comemorar();
    else if (ex.type !== "text_answer") entradaRef.current?.focus();
  };

  const comemorar = () => {
    store.setState({ celebrando: true });
    setTimeout(() => store.setState({ celebrando: false }), 1300);
    void celebrarAcerto(botaoVerificarRef.current);
    // Fim do módulo: troféu, só na primeira vez.
    if (!admin && trilha && progresso.trilhaConcluida(trilha.itens) && progresso.registrarTrofeu(trilha.modulo)) {
      const tudo = progresso.lerTudo();
      const total = trilha.itens.reduce((soma, i) => soma + (tudo[i.slug]?.tentativas ?? 0), 0);
      setTimeout(() => {
        setTrofeu({ tentativas: total });
        void celebrarTrofeu();
      }, 700);
    }
  };

  const pular = () => {
    progresso.pular(ex.slug, ex.versao);
    router.push(proximo ? `/exercicios/${proximo.slug}` : (trilha?.proximoModulo?.href ?? "/"));
  };

  const reiniciar = () => {
    if (!admin) progresso.apagar(ex.slug);
    setNucleo(montar(ex, !admin));
    setResultado(null);
    setTentativas(0);
    setConcluido(false);
    setDicasVistas(0);
  };

  return (
    <Contexto.Provider value={{ ...nucleo, entradaRef }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-2">
          {ex.type === "text_answer" && <CampoResposta rotulo={ex.rotulo} onEnviar={verificar} />}
          {nucleo.formatacao && <BarraFormatacao />}
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
          proximoModulo={trilha?.proximoModulo}
          onVerificar={verificar}
          onDica={() => setDicasVistas((d) => Math.min(d + 1, ex.dicas.length))}
          onReiniciar={reiniciar}
          onPular={trilha?.permitePular && !concluido ? pular : undefined}
          extra={
            admin ? (
              <PainelAdmin ex={ex} onPreencher={() => preencherSolucao(ex, nucleo.planilha, nucleo.store)} />
            ) : desafio && concluido ? (
              <CompartilharDesafio
                numero={desafio.numero}
                data={desafio.data}
                rotulo={desafio.rotulo}
                slug={ex.slug}
                versao={ex.versao}
              />
            ) : undefined
          }
          botaoVerificarRef={botaoVerificarRef}
        />
      </div>
      {trofeu && trilha && (
        <TrofeuModal
          titulo={trilha.titulo}
          icone={trilha.trofeu.icone}
          descricao={trilha.trofeu.descricao}
          exercicios={trilha.itens.length}
          tentativas={trofeu.tentativas}
          acao={trilha.proximoModulo ? { rotulo: `Ir para ${trilha.proximoModulo.titulo}`, href: trilha.proximoModulo.href } : { rotulo: "Ver meu troféu", href: "/" }}
          onFechar={() => setTrofeu(null)}
        />
      )}
    </Contexto.Provider>
  );
}
