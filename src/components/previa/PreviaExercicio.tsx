import type { Exercicio } from "@/content/schema";
import { descricaoAlvos } from "@/content/destaque";
import { TextoRico } from "@/components/simulador/TextoRico";
import { GradeEstatica } from "./GradeEstatica";
import { montarGrade } from "./montar";

/**
 * O exercício renderizado no servidor: enunciado e dados iniciais. Aparece no
 * HTML (Google, sem JavaScript, conexão lenta) e é trocado pelo simulador
 * quando o motor de fórmulas termina de carregar. Imita o layout do Simulador.
 */
export function PreviaExercicio({ exercicio: ex }: { exercicio: Exercicio }) {
  const alvos = descricaoAlvos(ex);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6" data-testid="previa-exercicio">
      <div className="min-w-0 space-y-2">
        {ex.type !== "multiple_choice" && (
          <div className="space-y-1" aria-hidden>
            <div className="flex h-[34px] overflow-hidden rounded-md border border-zinc-300 bg-white text-sm shadow-sm">
              <div className="flex w-20 items-center justify-center border-r border-zinc-300 bg-bg font-mono text-zinc-700">
                A1
              </div>
              <span className="w-16 border-r border-line" />
              <span className="flex w-8 items-center justify-center border-r border-line font-serif italic text-zinc-500">
                fx
              </span>
            </div>
            <p className="min-h-5 text-sm text-zinc-500">Carregando a planilha…</p>
          </div>
        )}
        {ex.type === "multiple_choice" ? (
          <>
            {ex.comPlanilha && <GradeEstatica grade={montarGrade(ex)} />}
            <ol className="list-[lower-alpha] space-y-2 pl-6" data-testid="alternativas-estaticas">
              {ex.opcoes.map((o, i) => (
                <li key={i} className="rounded-lg border border-line bg-white px-4 py-3 text-[15px] [overflow-wrap:anywhere]">
                  <TextoRico texto={o.texto} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <GradeEstatica grade={montarGrade(ex)} />
        )}
      </div>
      <aside className="contents min-w-0 [overflow-wrap:anywhere] lg:flex lg:flex-col lg:gap-4">
        <section className="order-first space-y-2 text-[15px] leading-relaxed text-zinc-800 lg:order-none">
          {ex.intro && (
            <p className="border-l-2 border-accent pl-3 text-sm text-zinc-600" data-testid="intro-exercicio">
              <TextoRico texto={ex.intro} />
            </p>
          )}
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
      </aside>
    </div>
  );
}
