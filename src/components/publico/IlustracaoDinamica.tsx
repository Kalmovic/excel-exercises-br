import "server-only";
import { exercicioPorSlug } from "@/content";
import { paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";

/** A lição grátis de tabela dinâmica: a ilustração é a resposta dela, calculada pelo motor. */
export const LICAO_DINAMICA = "dinamica-total-por-regiao";

/**
 * Painel de campos + a tabela dinâmica que ele gera. Os números saem do mesmo
 * motor da planilha (a solução da lição grátis), então nunca ficam errados.
 * Só HTML, sem imagem.
 */
export function IlustracaoDinamica() {
  const ex = exercicioPorSlug(LICAO_DINAMICA);
  if (!ex || ex.type !== "ferramenta" || !ex.solucao.recursos) throw new Error(`Lição de tabela dinâmica sem solução: ${LICAO_DINAMICA}`);
  const p = Planilha.deExercicio(ex);
  p.aplicarRecursos(ex.solucao.recursos);
  const [t] = p.tabelasDinamicas();
  const linhas = Array.from({ length: t.area.fim.linha - t.area.inicio.linha + 1 }, (_, l) =>
    Array.from({ length: t.area.fim.coluna - t.area.inicio.coluna + 1 }, (_, c) => {
      const pos = { linha: t.area.inicio.linha + l, coluna: t.area.inicio.coluna + c };
      return { texto: p.exibicao(pos), negrito: p.negrito(paraEndereco(pos)) };
    }),
  );
  const campos = p.camposDaDinamica(0);
  const usados = new Set(["Região", "Valor"]);
  p.destruir();

  return (
    <div className="relative mx-auto mb-6 w-full max-w-md lg:mb-0" aria-hidden>
      <div className="-rotate-1 rounded-2xl border border-white/10 bg-white p-4 text-ink shadow-2xl">
        <p className="mb-3 text-xs font-semibold text-muted">Módulo 9: Tabela dinâmica</p>
        <div className="grid grid-cols-[7rem_1fr] gap-3 text-xs">
          <div className="space-y-1 rounded-lg border border-line p-2">
            <p className="text-[10px] text-muted">Campos</p>
            {campos.map((c) => (
              <p key={c.letra} className="flex items-center gap-1.5">
                <span className={`grid h-3 w-3 place-items-center rounded-sm border text-[8px] ${usados.has(c.nome) ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-400"}`}>
                  {usados.has(c.nome) ? "✓" : ""}
                </span>
                {c.nome}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["Filtros", ""],
              ["Colunas", ""],
              ["Linhas", "Região"],
              ["Σ Valores", "Soma de Valor"],
            ].map(([area, item]) => (
              <div key={area} className="rounded-md border border-line bg-bg p-1.5">
                <p className="text-[10px] text-muted">{area}</p>
                {item && <p className="mt-1 truncate rounded border border-line bg-white px-1 py-0.5 font-medium shadow-sm">{item}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-line font-[Calibri,Carlito,Arial,sans-serif] text-sm">
          {linhas.map((l, i) => (
            <div key={i} className={`grid grid-cols-2 ${i > 0 ? "border-t border-line" : "bg-header"}`}>
              {l.map((c, j) => (
                <span key={j} className={`px-3 py-1.5 ${j > 0 ? "text-right" : ""} ${c.negrito ? "font-bold" : ""}`}>
                  {c.texto}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -right-2 -bottom-5 rotate-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-lg">
        2 cliques, zero fórmulas
      </div>
    </div>
  );
}
