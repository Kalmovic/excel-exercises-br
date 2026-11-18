"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
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
  /** Simulado: sem Verificar, dicas nem solução (a correção é na entrega da prova). */
  semCorrecao?: boolean;
  /** Fora da trilha (ex.: questão de concurso): sem "próximo exercício" nem "fim do módulo". */
  avulso?: boolean;
  /** Aviso fora da correção (ex.: célula em edição com erro). */
  aviso?: string | null;
  /**
   * Teste do módulo: uma resposta, conferida no servidor. Sem dicas, solução,
   * explicação, número de tentativa nem navegação da trilha.
   */
  modoTeste?: {
    conferindo: boolean;
    falhaEnvio: boolean;
    respondida: boolean | null;
    /** Depois de responder: o próximo passo, dentro do quadro do retorno (recebe o foco ao aparecer). */
    proxima?: { rotulo: string; ir: () => void };
  };
};

const FALHA_ENVIO = "Não conseguimos conferir sua resposta agora. Ela não foi contada: confira a conexão e envie de novo.";

/** Frase única com o resultado, para a região anunciada pelo leitor de tela. */
export function textoDoAnuncio({
  resultado,
  tentativas,
  aviso,
  modoTeste,
}: {
  resultado: Resultado | null;
  tentativas: number;
  aviso?: string | null;
  modoTeste?: Props["modoTeste"];
}): string {
  if (modoTeste) {
    if (modoTeste.conferindo) return "Conferindo sua resposta…";
    if (modoTeste.falhaEnvio) return FALHA_ENVIO;
    if (modoTeste.respondida !== null) return modoTeste.respondida ? "Resposta registrada: certa." : "Resposta registrada: errada.";
    return aviso ?? "";
  }
  if (resultado?.ok) return `Correto! ${elogio(tentativas)}`;
  if (resultado) return `Ainda não. Tentativa ${tentativas}. ${resultado.falhas.slice(0, 4).map((f) => f.mensagem).join(" ")}`.trim();
  return aviso ?? "";
}

/**
 * Região viva sempre montada (só o texto muda): montar a região junto com o
 * texto faz o leitor de tela perder o anúncio. Fica escondida da vista; o
 * quadro visível do resultado está fora dela, para não ser lido duas vezes.
 */
export function AnuncioResultado({ texto }: { texto: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="anuncio-resultado">
      {texto}
    </div>
  );
}

/** "Próxima questão" do teste: junto do retorno, e com o foco nele (o Verificar acabou de sumir). */
function BotaoProxima({ rotulo, ir }: { rotulo: string; ir: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // preventScroll + scrollIntoView "nearest": aparece sem pular a página.
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={ir}
      className="mt-3 rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft"
      data-testid="proxima-teste"
    >
      {rotulo}
    </button>
  );
}

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
  semCorrecao = false,
  avulso = false,
  aviso = null,
  modoTeste,
}: Props) {
  // A solução comentada aparece ao acertar, ou se o aluno pedir depois de algumas tentativas.
  // Nunca sozinha: errar não pode virar atalho para a resposta.
  const [pediuSolucao, setPediuSolucao] = useState(false);
  const podePedirSolucao = !modoTeste && !concluido && tentativas >= ex.tentativasAteExplicacao;
  const mostrarExplicacao = !modoTeste && (concluido || (pediuSolucao && podePedirSolucao));
  // Quem volta a um exercício já feito vê a explicação: dizer por quê.
  const jaResolvido = !modoTeste && !semCorrecao && concluido && !resultado;
  const respondida = modoTeste ? modoTeste.respondida !== null : false;
  const alvos = descricaoAlvos(ex);

  return (
    // No celular, o painel "se desfaz" (contents): o enunciado sobe para antes da
    // planilha (order-first) e o resto (botões, resultado, dicas) fica depois dela.
    <aside className="contents min-w-0 [overflow-wrap:anywhere] lg:flex lg:flex-col lg:gap-4">
      <section className="order-first space-y-2 text-[15px] leading-relaxed text-zinc-800 lg:order-none">
        {ex.intro && (
          <p className="border-l-2 border-accent pl-3 text-sm text-zinc-600" data-testid="intro-exercicio">
            <TextoRico texto={ex.intro} />
          </p>
        )}
        {ex.type !== "multiple_choice" && ex.enunciado.map((p, i) => (
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
        {!semCorrecao && !respondida && (
          <button
            type="button"
            onClick={onVerificar}
            ref={botaoVerificarRef}
            disabled={modoTeste?.conferindo}
            aria-busy={modoTeste?.conferindo || undefined}
            data-testid="verificar"
            className="rounded-md bg-ink px-4 py-2 font-medium text-white shadow-sm hover:bg-ink-soft disabled:opacity-60"
          >
            {modoTeste?.conferindo ? "Conferindo…" : modoTeste?.falhaEnvio ? "Enviar de novo" : "Verificar"}
          </button>
        )}
        {!modoTeste && ex.dicas.length > 0 && (
          <button
            type="button"
            onClick={onDica}
            disabled={dicasVistas >= ex.dicas.length}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-bg disabled:opacity-40"
          >
            {dicasVistas === 0 ? "Ver dica" : `Próxima dica (${dicasVistas}/${ex.dicas.length})`}
          </button>
        )}
        {!respondida && !modoTeste?.conferindo && (
          <button
            type="button"
            onClick={onReiniciar}
            className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
          >
            Recomeçar
          </button>
        )}
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

      <AnuncioResultado texto={textoDoAnuncio({ resultado, tentativas, aviso, modoTeste })} />

      {modoTeste && (modoTeste.falhaEnvio || modoTeste.respondida !== null) && (
        <div
          data-testid="resultado"
          className={`rounded-md border p-3 text-sm ${
            modoTeste.falhaEnvio
              ? "border-red-200 bg-red-50 text-red-900"
              : modoTeste.respondida
                ? "border-success/30 bg-success-bg text-success"
                : "border-line bg-bg text-ink"
          }`}
        >
          {modoTeste.falhaEnvio ? (
            FALHA_ENVIO
          ) : (
            <>
              <p className="font-semibold">{modoTeste.respondida ? "Certo!" : "Errado."}</p>
              <p>Resposta registrada. No fim do teste você vê o que revisar.</p>
              <p className="mt-1 text-xs text-muted">A planilha desta questão ficou travada: siga para a próxima.</p>
              {modoTeste.proxima && <BotaoProxima {...modoTeste.proxima} />}
            </>
          )}
        </div>
      )}

      {aviso && !resultado && !modoTeste?.conferindo && (
        <p className="rounded-md border border-line bg-warning-bg p-3 text-sm text-ink" data-testid="aviso-verificar">
          {aviso}
        </p>
      )}

      {jaResolvido && (
        <p className="text-sm text-success" data-testid="ja-resolvido">
          ✓ Você já resolveu esta questão. Para fazer de novo, use Recomeçar.
        </p>
      )}

      {!modoTeste && resultado && (
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

      {!modoTeste && dicasVistas > 0 && (
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

      {!semCorrecao && podePedirSolucao && !pediuSolucao && (
        <button
          type="button"
          onClick={() => setPediuSolucao(true)}
          className="self-start text-sm text-muted underline underline-offset-4 hover:text-ink"
          data-testid="ver-solucao"
        >
          Travou? Ver a solução
        </button>
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

      {!modoTeste && concluido && proximo && (
        <Link
          href={`/exercicios/${proximo.slug}`}
          className="self-start rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft"
        >
          Próximo exercício →
        </Link>
      )}
      {!modoTeste && concluido && !proximo && proximoModulo && (
        <Link
          href={proximoModulo.href}
          className="self-start rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft"
        >
          Próximo módulo →
        </Link>
      )}
      {!modoTeste && concluido && !avulso && !proximo && !proximoModulo && (
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
