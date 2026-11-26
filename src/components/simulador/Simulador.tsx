"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { adaptarAoToque, useSemTeclado } from "@/lib/toque";
import { BarraToque } from "./BarraToque";
import { celulasDestacadas } from "@/content/destaque";
import { chaveProgresso, type LicaoDoExercicio } from "@/content/licao";
import type { Exercicio } from "@/content/schema";
import type { Trilha } from "@/content/trilha";
import { deEndereco, deIntervalo, intervaloParaTexto, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir, type Resultado } from "@/grader/corrigir";
import { celebrarAcerto, celebrarTrofeu } from "@/lib/celebrar";
import { registrar } from "@/lib/eventos";
import * as progresso from "@/lib/progresso";
import { AreaPlanilha } from "./AreaPlanilha";
import { BarraFormulas } from "./BarraFormulas";
import { Alternativas } from "./Alternativas";
import { TextoRico } from "./TextoRico";
import { CampoResposta } from "./CampoResposta";
import { Contexto, type ContextoSimulador } from "./contexto";
import { Grade } from "./Grade";
import { AnuncioResultado, PainelExercicio, textoDoAnuncio } from "./PainelExercicio";
import { criarStore } from "./store";
import { TrofeuModal } from "./Trofeu";
import { CompartilharDesafio } from "@/components/desafio/CompartilharDesafio";
import { UpsellDesafio } from "@/components/desafio/UpsellDesafio";
import type { Upsell } from "@/content/modulos-pro";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import type { RespostaQuestao } from "@/grader/conferir-teste";
import { preencherSolucao } from "@/components/admin/solucao";
import { planilhaSoConsulta } from "./so-consulta";

function montar(ex: Exercicio, restaurar = true): Omit<ContextoSimulador, "entradaRef"> {
  const planilha = Planilha.deExercicio(ex);
  const salvo = restaurar ? progresso.ler(chaveProgresso(ex), ex.versao) : undefined;
  // Porta única de restauração (a mesma do servidor): classificações, células do aluno, formatos e o resto
  // dos recursos, nessa ordem, e o histórico limpo (Ctrl+Z não apaga o que foi restaurado).
  if (salvo) planilha.restaurarProgresso({ conteudos: salvo.conteudos, formatos: salvo.formatos, recursos: salvo.recursos });
  const inicio = ex.inicio?.selecao ?? ex.inicio?.celulaAtiva;
  return {
    planilha,
    store: criarStore(planilha, inicio ? deIntervalo(inicio) : undefined, salvo?.resposta ?? "", {
      selecaoFixa: ex.ferramentas?.selecaoFixa,
    }),
    alvos: new Set(celulasDestacadas(ex)),
    formatacao: ex.ferramentas?.formatacao ?? false,
    dados: ex.ferramentas?.dados ?? false,
    dinamica: ex.ferramentas?.dinamica ?? false,
    condicional: ex.ferramentas?.condicional ?? false,
    grafico: ex.ferramentas?.grafico ?? false,
    validacao: ex.ferramentas?.validacao ?? false,
    caixaDeNome: ex.ferramentas?.caixaDeNome ?? true,
    selecaoFixa: ex.ferramentas?.selecaoFixa ?? false,
  };
}

/** Linha de atalhos embaixo da grade (só com teclado). A F4 acrescenta como sair da grade com o Tab. */
const ATALHOS =
  "Enter confirma · F2 edita · setas navegam · Ctrl+C/Ctrl+V copiam · Ctrl+D copia a célula de cima · Ctrl+Z desfaz · arraste o quadradinho verde para copiar a fórmula · Alt+↓ abre o filtro ou a lista · Esc e depois Tab sai da planilha";

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
  /**
   * Teste do módulo: uma tentativa, sem gravar progresso nem corrigir aqui (a
   * questão chega sem gabarito). `corrigir` pergunta ao servidor; uma falha
   * (rede, servidor) rejeita a promessa e a resposta pode ser reenviada.
   */
  teste?: {
    corrigir: (resposta: RespostaQuestao) => Promise<boolean>;
    aoResponder: (ok: boolean, resposta: RespostaQuestao) => void;
    /** Próximo passo depois de responder (o botão fica no quadro do retorno). */
    proxima?: { rotulo: string; ir: () => void };
  };
  /**
   * Simulado de vaga: sem correção na hora nem dicas. A questão entrega ao pai
   * uma função que corrige o estado atual da planilha, chamada na entrega da prova.
   */
  simulado?: { registrar: (corrigirAgora: () => boolean) => void };
  /** Fora da trilha (questão de concurso): a página cuida da navegação. */
  avulso?: boolean;
  /**
   * Lição embutida numa página (ex.: /pro): a grade abre rolada até as células
   * do exercício, e o acerto não solta confete (cairia sobre o resto da página).
   */
  embutido?: boolean;
};

/**
 * Rola a grade (só ela, não a página, e sem mexer no foco) até as células do
 * exercício ficarem à vista. A grade já mostra a célula ativa e o alvo quando os
 * dois cabem; numa grade embutida estreita, o que importa é o alvo.
 */
function mostrarAlvos(raiz: HTMLElement | null, alvos: Set<string>) {
  const g = raiz?.querySelector<HTMLElement>('[data-testid="grade"]');
  if (!g || alvos.size === 0) return;
  const cels = [...alvos].map((a) => g.querySelector<HTMLElement>(`[data-celula="${a}"]`)).filter((c): c is HTMLElement => !!c);
  if (cels.length === 0) return;
  const x0 = Math.min(...cels.map((c) => c.offsetLeft));
  const x1 = Math.max(...cels.map((c) => c.offsetLeft + c.offsetWidth));
  const y0 = Math.min(...cels.map((c) => c.offsetTop));
  const y1 = Math.max(...cels.map((c) => c.offsetTop + c.offsetHeight));
  // Margem para os cabeçalhos (coluna dos números das linhas e linha das letras).
  const [mx, my] = [44, 28];
  const eixo = (atual: number, ini: number, fim: number, visivel: number, margem: number) => {
    if (ini - margem >= atual && fim <= atual + visivel) return atual;
    const ateOFim = fim - visivel + 8;
    return Math.max(0, ateOFim <= ini - margem ? ateOFim : ini - margem);
  };
  const left = eixo(g.scrollLeft, x0, x1, g.clientWidth, mx);
  const top = eixo(g.scrollTop, y0, y1, g.clientHeight, my);
  if (left !== g.scrollLeft || top !== g.scrollTop) g.scrollTo({ left, top });
}

export default function Simulador({
  exercicio: original,
  proximo,
  trilha,
  desafio,
  admin: adminProp = false,
  compacto = false,
  licao,
  teste,
  simulado,
  avulso = false,
  embutido = false,
}: Props) {
  // Celular sem teclado: exercícios "use as setas" trocam o texto e aceitam toque.
  const semTeclado = useSemTeclado();
  const ex = useMemo(() => adaptarAoToque(original, semTeclado), [original, semTeclado]);
  // No teste do módulo, nada é lido nem gravado no progresso (como no admin).
  const admin = adminProp || !!teste || !!simulado;
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
  // Verificar com a célula ainda em edição e inválida: o painel avisa (antes, silêncio).
  const [aviso, setAviso] = useState<string | null>(null);
  // Teste do módulo: estado da conferência no servidor.
  const [conferindo, setConferindo] = useState(false);
  const [falhaEnvio, setFalhaEnvio] = useState(false);
  const [respondida, setRespondida] = useState<boolean | null>(null);
  const enviando = useRef(false);

  const { planilha, store } = nucleo;
  const raizRef = useRef<HTMLDivElement>(null);
  // Depois da primeira rolagem da grade (efeitos dos filhos rodam antes), mostra as células do
  // exercício: com colunas largas, a resposta (F2, G1...) começava fora da tela, sem aviso.
  useEffect(() => {
    const id = requestAnimationFrame(() => mostrarAlvos(raizRef.current, nucleo.alvos));
    return () => cancelAnimationFrame(id);
  }, [nucleo.alvos]);
  // "Células do exercício: F2, E5" no painel: clicar leva a seleção (e a grade) até lá.
  const irPara = (ref: string) => {
    try {
      const [ini, fim] = ref.split(":");
      const a = deEndereco(ini);
      const b = fim ? deEndereco(fim) : a;
      store.setState({ ancora: a, foco: b, mensagem: null });
      entradaRef.current?.focus({ preventScroll: true });
    } catch {
      // referência que não é célula: ignora
    }
  };
  // Teste do módulo: questão respondida fica só para ver (grade, barras e campo de resposta).
  const travada = !!teste && respondida !== null;
  // Fórmula no enunciado ou nas alternativas: a planilha ao lado é só para consultar os dados
  // (colar a fórmula daria a resposta pronta).
  const soConsulta = planilhaSoConsulta(ex);
  useEffect(() => {
    if (soConsulta) store.getState().travar();
  }, [soConsulta, store]);

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
      conteudos: planilha.conteudosDoAluno(),
      formatos: planilha.formatosDoAluno(),
      recursos: planilha.recursos(),
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

  // Simulado: registra a correção desta questão (o pai chama na entrega).
  useEffect(() => {
    if (!simulado) return;
    simulado.registrar(() => {
      const s = store.getState();
      if (s.modo !== "pronto") s.confirmar(); // o que estava sendo digitado conta
      return corrigir(ex, planilha, {
        ativa: paraEndereco(s.ancora),
        selecao: intervaloParaTexto(s.selecao()),
        resposta: s.resposta,
        mudancasPeloMouse: s.mudancasPeloMouse,
        semTecladoFisico: semTeclado,
      }).ok;
    });
  }, [simulado, ex, planilha, store, semTeclado]);

  /** Confirma o que estava sendo digitado; se a célula estiver inválida, avisa e devolve false. */
  const confirmarEdicao = () => {
    const s = store.getState();
    if (s.modo === "pronto" || s.confirmar()) {
      setAviso(null);
      return true;
    }
    setAviso("A célula ainda está em edição e tem um erro (veja o aviso perto da barra de fórmulas). Corrija ou aperte Esc antes de verificar.");
    return false;
  };

  /** O que ficou na tela: vai para o servidor no teste do módulo e na emissão do certificado. */
  const respostaAtual = (): RespostaQuestao => {
    const s = store.getState();
    return {
      conteudos: planilha.conteudosDoAluno(),
      formatos: planilha.formatosDoAluno(),
      recursos: planilha.recursos(),
      resposta: s.resposta,
      ativa: paraEndereco(s.ancora),
      selecao: intervaloParaTexto(s.selecao()),
    };
  };

  /** Teste do módulo: uma resposta só, conferida pelo servidor. */
  const verificarNoServidor = async (t: NonNullable<Props["teste"]>) => {
    if (enviando.current || respondida !== null) return;
    if (!confirmarEdicao()) return;
    const resposta = respostaAtual();
    enviando.current = true;
    setConferindo(true);
    setFalhaEnvio(false);
    try {
      const ok = await t.corrigir(resposta);
      // Uma resposta só: a planilha trava (o que mudasse daqui em diante não contaria).
      store.getState().travar();
      setRespondida(ok);
      t.aoResponder(ok, resposta);
    } catch {
      setFalhaEnvio(true); // não conta: o aluno pode enviar de novo
    } finally {
      enviando.current = false;
      setConferindo(false);
    }
  };

  const verificar = () => {
    if (teste) return void verificarNoServidor(teste);
    if (!confirmarEdicao()) return;
    const s = store.getState();
    const r = corrigir(ex, planilha, {
      ativa: paraEndereco(s.ancora),
      selecao: intervaloParaTexto(s.selecao()),
      resposta: s.resposta,
      mudancasPeloMouse: s.mudancasPeloMouse,
      semTecladoFisico: semTeclado,
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
    // Concluído continua concluído, também depois de Recomeçar e errar de novo.
    const status = r.ok || concluido || anterior === "concluido" ? "concluido" : anterior === "pulado" ? "pulado" : "em-andamento";
    persistir(status, n, historico);
    if (r.ok && licao && !adminProp) progresso.concluirLicaoSeCompleta(licao);
    if (!admin) {
      registrar({ nome: "verificou", slug: ex.slug, ok: r.ok, tentativa: n, motivo: r.falhas[0]?.motivo });
      if (r.ok && desafio && !concluido) {
        registrar({ nome: "desafio_concluido", data: desafio.data, tentativas: historico?.length ?? n });
      }
    }
    // Errou: o foco fica onde estava (no Verificar), para o leitor de tela anunciar o resultado.
    if (r.ok) comemorar();
  };

  const comemorar = () => {
    store.setState({ celebrando: true });
    setTimeout(() => store.setState({ celebrando: false }), 1300);
    if (!embutido) void celebrarAcerto(botaoVerificarRef.current);
    // Fim do módulo: troféu, só na primeira vez.
    if (!admin && trilha && progresso.trilhaConcluida(trilha.itens) && progresso.registrarTrofeu(trilha.modulo)) {
      registrar({ nome: "modulo_concluido", modulo: trilha.modulo });
      const tudo = progresso.lerTudo();
      const total = trilha.itens.reduce((soma, i) => soma + (tudo[i.slug]?.tentativas ?? 0), 0);
      setTimeout(() => {
        setTrofeu({ tentativas: total });
        if (!embutido) void celebrarTrofeu();
      }, 700);
    }
  };

  const pular = () => {
    registrar({ nome: "pulou", slug: ex.slug });
    progresso.pular(chave, ex.versao);
    router.push(proximo ? `/exercicios/${proximo.slug}` : (trilha?.proximoModulo?.href ?? "/"));
  };

  // Recomeçar limpa só a planilha e a resposta. As tentativas e o histórico
  // continuam valendo: errar, recomeçar e acertar não é "de primeira", e no
  // desafio os quadrados do card contam tudo. Concluído continua concluído.
  const reiniciar = () => {
    if (!admin) {
      const atual = progresso.ler(chave, ex.versao);
      if (atual) progresso.salvar(chave, { ...atual, conteudos: {}, formatos: {}, recursos: {}, resposta: "" });
    }
    setNucleo(montar(ex, false));
    setResultado(null);
    setAviso(null);
    setFalhaEnvio(false);
    if (desafio) return; // o card de compartilhar continua na tela
    setConcluido(false);
  };

  if (compacto) {
    const falha = resultado && !resultado.ok ? resultado.falhas[0] : null;
    return (
      <Contexto.Provider value={{ ...nucleo, entradaRef }}>
        <div className="space-y-2">
          <BarraFormulas />
          <Grade larguras={ex.grade.larguras} autoFoco={false} />
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
          <AnuncioResultado texto={textoDoAnuncio({ resultado, tentativas, aviso })} />
          {aviso && !resultado && <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-ink">{aviso}</p>}
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
      <div ref={raizRef} className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-2" inert={travada} data-travada={travada || undefined}>
          {ex.type === "text_answer" && <CampoResposta rotulo={ex.rotulo} onEnviar={verificar} somenteLeitura={travada} />}
          {ex.type === "multiple_choice" && (
            <div className="space-y-4">
              {ex.referencia && (
                <p className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm text-ink" data-testid="referencia-prova">
                  <span className="font-semibold">Tema já cobrado:</span>
                  {ex.referencia.url ? (
                    <a href={ex.referencia.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {ex.referencia.prova}
                    </a>
                  ) : (
                    <span>{ex.referencia.prova}</span>
                  )}
                </p>
              )}
              <div className="space-y-2 text-lg font-semibold [overflow-wrap:anywhere]" data-testid="pergunta">
                {ex.enunciado.map((p, i) => (
                  <p key={i}>
                    <TextoRico texto={p} />
                  </p>
                ))}
              </div>
              {ex.comPlanilha && (
                <div className="space-y-2" data-testid="planilha-de-teste" data-so-consulta={soConsulta || undefined}>
                  <p className="text-xs text-muted">
                    {soConsulta
                      ? "Planilha só para consulta: confira os dados e resolva a fórmula de cabeça, como na prova."
                      : "Planilha para testar as alternativas: o que você digita aqui não conta como resposta."}
                  </p>
                  {ex.abas?.length ? (
                    // Questão sobre outras abas (3D, INDIRETO...): mostra as abas, para o aluno ver os dados delas.
                    <AreaPlanilha ex={ex} nucleo={nucleo} entradaRef={entradaRef} barraToque={semTeclado && !soConsulta} somenteLeitura={soConsulta} />
                  ) : (
                    <>
                      {semTeclado && !soConsulta && <BarraToque />}
                      {!soConsulta && <BarraFormulas />}
                      <Grade larguras={ex.grade.larguras} />
                    </>
                  )}
                </div>
              )}
              <Alternativas opcoes={ex.opcoes} bloqueado={concluido || respondida !== null || conferindo} />
            </div>
          )}
          {ex.type !== "multiple_choice" && (
            <>
              <AreaPlanilha
                ex={ex}
                nucleo={nucleo}
                entradaRef={entradaRef}
                barraToque={semTeclado && ex.type !== "click_cell" && ex.type !== "text_answer"}
              />
              {/* Atalhos de teclado: só para quem tem teclado (no celular não aparece). */}
              {!semTeclado && (
                <p className="text-xs text-zinc-500 pointer-coarse:hidden" data-testid="atalhos">
                  {ATALHOS}
                </p>
              )}
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
          onIrPara={irPara}
          semCorrecao={!!simulado}
          avulso={avulso}
          aviso={aviso}
          modoTeste={teste ? { conferindo, falhaEnvio, respondida, proxima: teste.proxima } : undefined}
          onDica={() => {
            const n = Math.min(dicasVistas + 1, ex.dicas.length);
            setDicasVistas(n);
            dicasVistasRef.current = n;
            if (!admin) registrar({ nome: "dica_vista", slug: ex.slug, numero: n });
          }}
          onReiniciar={reiniciar}
          onPular={trilha?.permitePular && !concluido ? pular : undefined}
          extra={
            // Só o admin de verdade: no teste e no simulado `admin` também é true
            // (para não gravar progresso), e o gabarito não pode aparecer ao aluno.
            adminProp ? (
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
