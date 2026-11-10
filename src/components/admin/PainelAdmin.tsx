"use client";

import type { Exercicio } from "@/content/schema";
import { TextoRico } from "@/components/simulador/TextoRico";

const fmt = (v: unknown) => JSON.stringify(v);

/** Gabarito do exercício: tudo o que o aluno não vê. */
export function PainelAdmin({ ex, onPreencher }: { ex: Exercicio; onPreencher: () => void }) {
  return (
    <section className="space-y-3 rounded-md border border-violet-300 bg-violet-50 p-3 text-sm text-violet-950" data-testid="painel-admin">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Gabarito (admin)</p>
        <button
          type="button"
          onClick={onPreencher}
          data-testid="preencher-solucao"
          className="rounded bg-violet-700 px-3 py-1.5 font-medium text-white hover:bg-violet-800"
        >
          Preencher solução
        </button>
      </div>
      <p className="font-mono text-xs">
        {ex.slug} · {ex.type} · {ex.plano} · nível {ex.nivel} · v{ex.versao}
      </p>

      {(ex.type === "formula" || ex.type === "type_value") && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="pr-2">Célula</th>
              <th className="pr-2">Esperado</th>
              {ex.type === "formula" && <th>Solução</th>}
            </tr>
          </thead>
          <tbody className="font-mono">
            {ex.alvos.map((a) => (
              <tr key={a.celula} className="align-top">
                <td className="pr-2">{a.celula}</td>
                <td className="max-w-32 truncate pr-2" title={fmt(a.esperado)}>
                  {fmt(a.esperado)}
                </td>
                {"solucaoReferencia" in a && <td className="break-all">{a.solucaoReferencia}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {ex.type === "format_cell" && <p>Formatos: {ex.alvos.map((a) => `${a.intervalo} → ${a.formato}`).join("; ")}</p>}
      {ex.type === "text_answer" && (
        <p>
          Aceitas ({ex.normalizar}): <span className="font-mono">{ex.aceitas.join(" | ")}</span>
        </p>
      )}
      {ex.type === "click_cell" && (
        <p>
          Célula: <span className="font-mono">{ex.celula}</span> · entrada: {ex.inputMethod}
        </p>
      )}
      {ex.type === "select_range" && (
        <p>
          Intervalo: <span className="font-mono">{ex.intervalo}</span>
        </p>
      )}
      {ex.type === "formula" && (ex.funcoesExigidas?.length || ex.funcoesProibidas?.length) ? (
        <p>
          Funções exigidas: {ex.funcoesExigidas?.join(", ") || "—"} · proibidas: {ex.funcoesProibidas?.join(", ") || "—"}
        </p>
      ) : null}
      {ex.grade.variaveis?.length ? <p>Perturbadas (números): {ex.grade.variaveis.length} células</p> : null}
      {ex.grade.alternativas && (
        <p>
          Alternativas:{" "}
          {Object.entries(ex.grade.alternativas)
            .map(([c, v]) => `${c} → ${v.join(", ")}`)
            .join("; ")}
        </p>
      )}

      {ex.dicas.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium">Dicas ({ex.dicas.length})</summary>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {ex.dicas.map((d, i) => (
              <li key={i}>
                <TextoRico texto={d} />
              </li>
            ))}
          </ol>
        </details>
      )}
      <details>
        <summary className="cursor-pointer font-medium">Explicação</summary>
        <div className="mt-1 space-y-1">
          {ex.explicacao.map((p, i) => (
            <p key={i}>
              <TextoRico texto={p} />
            </p>
          ))}
        </div>
      </details>
      <p className="text-xs text-violet-800">Modo admin: nada do que você faz aqui é salvo no progresso.</p>
    </section>
  );
}
