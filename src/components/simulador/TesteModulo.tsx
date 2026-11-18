"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Exercicio } from "@/content/schema";
import { registrar } from "@/lib/eventos";
import { APROVACAO, registrarTeste } from "@/lib/testes";
import { celebrarTrofeu } from "@/lib/celebrar";
import type { RespostaQuestao } from "@/grader/conferir-teste";
import { EmitirCertificado } from "@/components/conta/EmitirCertificado";
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

/** Tentativa em andamento (ou terminada) do teste de um módulo, guardada no navegador. */
type Tentativa = { slugs: string[]; respostas: boolean[]; entregas: RespostaQuestao[] };

const chaveTentativa = (modulo: string) => `excel-br:teste-tentativa:${modulo}`;
const EVENTO = "excel-br:teste-tentativa";
// Cópia em memória: no modo privado (sem localStorage) o teste continua andando.
const memoria = new Map<string, string>();

function lerTentativaBruta(modulo: string): string {
  const m = memoria.get(modulo);
  if (m !== undefined) return m;
  try {
    return localStorage.getItem(chaveTentativa(modulo)) ?? "";
  } catch {
    return "";
  }
}

function gravarTentativa(modulo: string, t: Tentativa | null) {
  const bruto = t ? JSON.stringify(t) : "";
  memoria.set(modulo, bruto);
  try {
    if (t) localStorage.setItem(chaveTentativa(modulo), bruto);
    else localStorage.removeItem(chaveTentativa(modulo));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function assinarTentativa(f: () => void) {
  window.addEventListener(EVENTO, f);
  window.addEventListener("storage", f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener("storage", f);
  };
}

/** A tentativa guardada, se for destas mesmas questões (conteúdo trocado descarta). */
function lerTentativa(bruto: string, slugs: string[]): Tentativa {
  const vazia = { slugs, respostas: [], entregas: [] };
  if (!bruto) return vazia;
  try {
    const t = JSON.parse(bruto) as Tentativa;
    const mesmas = Array.isArray(t.slugs) && t.slugs.length === slugs.length && t.slugs.every((s, i) => s === slugs[i]);
    if (!mesmas || !Array.isArray(t.respostas) || !Array.isArray(t.entregas)) return vazia;
    return { slugs, respostas: t.respostas.slice(0, slugs.length), entregas: t.entregas.slice(0, slugs.length) };
  } catch {
    return vazia;
  }
}

/**
 * Correção no servidor: a questão do teste chega ao navegador sem gabarito.
 * Qualquer resposta fora do contrato vira erro, e o aluno reenvia sem contar.
 */
async function corrigirNoServidor(modulo: string, indice: number, resposta: RespostaQuestao): Promise<boolean> {
  const r = await fetch("/api/teste/corrigir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modulo, indice, resposta }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = (await r.json()) as { ok?: unknown };
  if (typeof json.ok !== "boolean") throw new Error("Resposta inesperada");
  return json.ok;
}

/**
 * Teste do módulo: uma tentativa por questão, sem dica; 4 de 5 aprova.
 * A tentativa fica no navegador: recarregar no meio continua da próxima questão
 * (a já respondida não volta), e recarregar no fim mostra o resultado.
 */
export function TesteModulo({ modulo, proximo, questoes, revisar }: Props) {
  const slugs = questoes.map((q) => q.slug);
  const bruto = useSyncExternalStore(assinarTentativa, () => lerTentativaBruta(modulo.slug), () => "");
  const { respostas, entregas } = lerTentativa(bruto, slugs);
  // Questão na tela: depois de responder, fica nela até "Próxima"; ao abrir, a primeira sem resposta.
  const [indiceFixo, setIndiceFixo] = useState<number | null>(null);
  const [rodada, setRodada] = useState(0);
  const indice = indiceFixo ?? respostas.length;
  const fim = respostas.length === questoes.length && indice >= questoes.length;

  const responder = (ok: boolean, entrega: RespostaQuestao) => {
    const atual = lerTentativa(lerTentativaBruta(modulo.slug), slugs);
    if (atual.respostas.length !== indice) return; // uma tentativa por questão
    const novas = [...atual.respostas, ok];
    gravarTentativa(modulo.slug, { slugs, respostas: novas, entregas: [...atual.entregas, entrega] });
    setIndiceFixo(indice);
    if (novas.length === questoes.length) {
      const acertos = novas.filter(Boolean).length;
      registrarTeste(modulo.slug, acertos, questoes.length);
      registrar({ nome: "teste_concluido", modulo: modulo.slug, acertos, aprovado: acertos >= APROVACAO });
    }
  };

  if (fim)
    return (
      <ResultadoTeste
        modulo={modulo}
        questoes={questoes}
        respostas={respostas}
        revisar={revisar}
        proximo={proximo}
        entregas={entregas}
        onRefazer={() => {
          gravarTentativa(modulo.slug, null);
          setIndiceFixo(0);
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
      <SimuladorCarregavel
        key={`${rodada}-${indice}`}
        exercicio={q}
        teste={{
          corrigir: (resposta) => corrigirNoServidor(modulo.slug, indice, resposta),
          aoResponder: responder,
          // O botão fica no quadro do retorno (antes ficava embaixo da grade, fora da tela).
          proxima: {
            rotulo: indice + 1 < questoes.length ? "Próxima questão →" : "Ver resultado",
            ir: () => setIndiceFixo(indice + 1),
          },
        }}
      />
    </div>
  );
}

function ResultadoTeste({
  modulo,
  questoes,
  respostas,
  entregas,
  revisar,
  proximo,
  onRefazer,
}: {
  modulo: Modulo;
  questoes: Exercicio[];
  respostas: boolean[];
  entregas: RespostaQuestao[];
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
        {/* Aprovou: o próximo passo é o certificado, antes da lista de questões. */}
        {aprovado && <EmitirCertificado modulo={modulo.slug} tituloModulo={`Módulo ${modulo.numero}: ${modulo.titulo}`} entregas={entregas} />}

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
