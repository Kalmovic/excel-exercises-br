"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { celulasDestacadas } from "@/content/destaque";
import { chaveProgresso, type LicaoDoExercicio } from "@/content/licao";
import type { Exercicio } from "@/content/schema";
import type { Trilha } from "@/content/trilha";
import { deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir, type Resultado } from "@/grader/corrigir";
import { celebrarAcerto, celebrarTrofeu } from "@/lib/celebrar";
import { registrar } from "@/lib/eventos";
import * as progresso from "@/lib/progresso";
import { BarraFormatacao } from "./BarraFormatacao";
import { BarraFormulas } from "./BarraFormulas";
import { Alternativas } from "./Alternativas";
import { TextoRico } from "./TextoRico";
import { CampoResposta } from "./CampoResposta";
import { Contexto, type ContextoSimulador } from "./contexto";
import { Grade } from "./Grade";
import { PainelExercicio } from "./PainelExercicio";
import { criarStore } from "./store";
import { TrofeuModal } from "./Trofeu";
import { CompartilharDesafio } from "@/components/desafio/CompartilharDesafio";
import { UpsellDesafio } from "@/components/desafio/UpsellDesafio";
import type { Upsell } from "@/content/modulos-pro";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { preencherSolucao } from "@/components/admin/solucao";

function montar(ex: Exercicio, restaurar = true): Omit<ContextoSimulador, "entradaRef"> {
  const planilha = Planilha.deExercicio(ex);
  const salvo = restaurar ? progresso.ler(chaveProgresso(ex), ex.versao) : undefined;
  if (salvo) {
    planilha.definirVarias(
      Object.entries(salvo.conteudos).map(([endereco, bruto]) => ({ endereco, bruto })),
    );
    for (const [end, f] of Object.entries(salvo.formatos ?? {})) planilha.formatar(deIntervalo(end), f);
    planilha.limparHistorico(); // Ctrl+Z não apaga o progresso restaurado
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
  desafio?: { numero: number; data: string; rotulo: string; upsell?: Upsell | null };
  /** Visão admin: não lê nem grava progresso e mostra o gabarito. */
  admin?: boolean;
  /** Versão enxuta (card da landing): só barra de fórmulas, grade e Conferir. */
  compacto?: boolean;
  /** Questão de uma lição de 5: ao acertar a última que faltava, a lição fica concluída. */
  licao?: LicaoDoExercicio;
  /** Teste do módulo: uma tentativa, sem gravar progresso; avisa o resultado. */
  teste?: { aoResponder: (ok: boolean) => void };
};

export default function Simulador({
  exercicio: ex,
  proximo,
  trilha,
  desafio,
  admin: adminProp = false,
  compacto = false,
  licao,
  teste,
}: Props) {
  // No teste do módulo, nada é lido nem gravado no progresso (como no admin).
  const admin = adminProp || !!teste;
  const chave = chaveProgresso(ex);
  const router = useRouter();
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const botaoVerificarRef = useRef<HTMLButtonElement | null>(null);
  const [trofeu, setTrofeu] = useState<{ tentativas: number } | null>(null);
  const [nucleo, setNucleo] = useState(() => montar(ex, !admin));
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativas, setTentativas] = useState(() => (admin ? 0 : (progresso.ler(chave, ex.versao)?.tentativas ?? 0)));
  const [concluido, setConcluido] = useState(
    () => !admin && progresso.ler(chave, ex.versao)?.status === "concluido",
  );
  const [dicasVistas, setDicasVistas] = useState(0);

  const { planilha, store } = nucleo;

  // Dicas e tempo ativo, gravados no progresso para o nivelamento.
  const dicasVistasRef = useRef(0);
  const ultimoRegistro = useRef<number | null>(null);
  const tempoDesdeUltimoRegistro = () => {
    const agora = Date.now();
    const antes = ultimoRegistro.current ?? agora;
    ultimoRegistro.current = agora;
    return Math.min(agora - antes, 10 * 60_000); // pausa longa não conta como estudo
  };

  // Exercício aberto: uma vez por montagem (o Next re-roda efeitos ao voltar
  // para uma página escondida; o ref preservado evita contar de novo).
  const aberturaRegistrada = useRef(false);
  useEffect(() => {
    ultimoRegistro.current ??= Date.now();
    if (aberturaRegistrada.current || admin) return;
    aberturaRegistrada.current = true;
    registrar({ nome: "exercicio_aberto", slug: ex.slug, modulo: ex.modulo });
  }, [admin, ex.slug, ex.modulo]);

  /** Grava o estado atual do exercício (conteúdo, formatos e resposta). */
  const persistir = (status?: progresso.ProgressoExercicio["status"], n?: number, historico?: boolean[]) => {
    if (admin) return; // o admin testa sem mexer no progresso
    const atual = progresso.ler(chave, ex.versao);
    progresso.salvar(chave, {
      versao: ex.versao,
      status: status ?? atual?.status ?? "em-andamento",
      tentativas: n ?? atual?.tentativas ?? 0,
      conteudos: Object.fromEntries(
        Object.entries(planilha.conteudos()).filter(([end]) => !planilha.bloqueada(end)),
      ),
      formatos: planilha.formatosDoAluno(),
      resposta: store.getState().resposta,
      historico: historico ?? atual?.historico,
      dicasVistas: Math.max(atual?.dicasVistas ?? 0, dicasVistasRef.current),
      tempoMs: (atual?.tempoMs ?? 0) + tempoDesdeUltimoRegistro(),
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

  // Não destruir o motor no cleanup: o Next esconde a página ao navegar (e o
  // StrictMode do dev simula isso) rodando os cleanups, mas mantém o estado.
  // Destruir aqui deixava `nucleo` apontando para uma instância morta e a
  // grade quebrava ao voltar. Sem referências, a instância vai para o GC.

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
    const anterior = progresso.ler(chave, ex.versao)?.status;
    // Histórico de acertos/erros por verificação (card de compartilhamento do desafio).
    const historico = concluido
      ? progresso.ler(chave, ex.versao)?.historico
      : [...(progresso.ler(chave, ex.versao)?.historico ?? []), r.ok];
    persistir(r.ok || concluido ? "concluido" : anterior === "pulado" ? "pulado" : "em-andamento", n, historico);
    if (teste) {
      teste.aoResponder(r.ok);
      return;
    }
    if (r.ok && licao && !adminProp) progresso.concluirLicaoSeCompleta(licao);
    if (!admin) {
      registrar({ nome: "verificou", slug: ex.slug, ok: r.ok, tentativa: n, motivo: r.falhas[0]?.motivo });
      if (r.ok && desafio && !concluido) {
        registrar({ nome: "desafio_concluido", data: desafio.data, tentativas: historico?.length ?? n });
      }
    }
    if (r.ok) comemorar();
    else if (ex.type !== "text_answer") entradaRef.current?.focus();
  };

  const comemorar = () => {
    store.setState({ celebrando: true });
    setTimeout(() => store.setState({ celebrando: false }), 1300);
    void celebrarAcerto(botaoVerificarRef.current);
    // Fim do módulo: troféu, só na primeira vez.
    if (!admin && trilha && progresso.trilhaConcluida(trilha.itens) && progresso.registrarTrofeu(trilha.modulo)) {
      registrar({ nome: "modulo_concluido", modulo: trilha.modulo });
      const tudo = progresso.lerTudo();
      const total = trilha.itens.reduce((soma, i) => soma + (tudo[i.slug]?.tentativas ?? 0), 0);
      setTimeout(() => {
        setTrofeu({ tentativas: total });
        void celebrarTrofeu();
      }, 700);
    }
  };

  const pular = () => {
    registrar({ nome: "pulou", slug: ex.slug });
    progresso.pular(chave, ex.versao);
    router.push(proximo ? `/exercicios/${proximo.slug}` : (trilha?.proximoModulo?.href ?? "/"));
  };

  const reiniciar = () => {
    if (desafio && !admin) {
      // No desafio, Recomeçar limpa só a planilha: as tentativas e o histórico
      // (os quadrados do card) continuam valendo.
      const atual = progresso.ler(chave, ex.versao);
      if (atual) progresso.salvar(chave, { ...atual, conteudos: {}, formatos: {}, resposta: "" });
      setNucleo(montar(ex, false));
      setResultado(null);
      return;
    }
    if (!admin) progresso.apagar(chave);
    setNucleo(montar(ex, !admin));
    setResultado(null);
    setTentativas(0);
    setConcluido(false);
    setDicasVistas(0);
  };

  if (compacto) {
    const falha = resultado && !resultado.ok ? resultado.falhas[0] : null;
    return (
      <Contexto.Provider value={{ ...nucleo, entradaRef }}>
        <div className="space-y-2">
          <BarraFormulas />
          <Grade larguras={ex.grade.larguras} />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              ref={botaoVerificarRef}
              onClick={verificar}
              data-testid="verificar"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft"
            >
              Conferir
            </button>
            <button
              type="button"
              onClick={reiniciar}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
            >
              Recomeçar
            </button>
          </div>
          {resultado && (
            <p
              key={tentativas}
              data-testid="resultado"
              className={`rounded-lg px-3 py-2 text-sm motion-safe:animate-pop ${
                resultado.ok ? "bg-success-bg text-success" : "bg-warning-bg text-ink"
              }`}
            >
              {resultado.ok ? (
                <>
                  <strong>Correto!</strong> Você já fala um pouco de Planilhês.{" "}
                  <Link href="/trilha" className="font-medium underline underline-offset-2">
                    Continuar na trilha →
                  </Link>
                </>
              ) : (
                (falha?.mensagem ?? "Ainda não.")
              )}
            </p>
          )}
        </div>
      </Contexto.Provider>
    );
  }

  return (
    <Contexto.Provider value={{ ...nucleo, entradaRef }}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-2">
          {ex.type === "text_answer" && <CampoResposta rotulo={ex.rotulo} onEnviar={verificar} />}
          {ex.type === "multiple_choice" && (
            <div className="space-y-4">
              <div className="space-y-2 text-lg font-semibold" data-testid="pergunta">
                {ex.enunciado.map((p, i) => (
                  <p key={i}>
                    <TextoRico texto={p} />
                  </p>
                ))}
              </div>
              <Alternativas opcoes={ex.opcoes} bloqueado={concluido} />
            </div>
          )}
          {ex.type !== "multiple_choice" && (
            <>
              {nucleo.formatacao && <BarraFormatacao />}
              <BarraFormulas />
              <Grade larguras={ex.grade.larguras} />
              <p className="text-xs text-zinc-500">
                Enter confirma · F2 edita · setas navegam · Ctrl+C/Ctrl+V copiam · Ctrl+D preenche para baixo ·
                Ctrl+Z desfaz · arraste o quadradinho verde para copiar a fórmula
              </p>
            </>
          )}
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
          onDica={() => {
            const n = Math.min(dicasVistas + 1, ex.dicas.length);
            setDicasVistas(n);
            dicasVistasRef.current = n;
            if (!admin) registrar({ nome: "dica_vista", slug: ex.slug, numero: n });
          }}
          onReiniciar={reiniciar}
          onPular={trilha?.permitePular && !concluido ? pular : undefined}
          extra={
            admin ? (
              <PainelAdmin ex={ex} onPreencher={() => preencherSolucao(ex, nucleo.planilha, nucleo.store)} />
            ) : desafio && concluido ? (
              <>
                <CompartilharDesafio
                  numero={desafio.numero}
                  data={desafio.data}
                  rotulo={desafio.rotulo}
                  slug={ex.slug}
                  versao={ex.versao}
                />
                {desafio.upsell && <UpsellDesafio upsell={desafio.upsell} />}
              </>
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
