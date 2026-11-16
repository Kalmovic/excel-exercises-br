/** Mesmas garantias do conteúdo da trilha, para as questões dos simulados. */
import { describe, expect, it } from "vitest";
import { deIntervalo } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { SIMULADOS } from "./simulados";

const todas = SIMULADOS.flatMap((s) => s.questoes.map((q) => [`${s.slug} · ${q.slug}`, q] as const));

describe("simulados", () => {
  it("3 níveis com 8 questões, slugs e ids únicos", () => {
    expect(SIMULADOS.map((s) => s.questoes.length)).toEqual([8, 8, 8]);
    const slugs = todas.map(([, q]) => q.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(todas.map(([, q]) => q.id)).size).toBe(slugs.length);
  });

  it("aprovação é 70% das questões", () => {
    for (const s of SIMULADOS) expect(s.aprovacao).toBe(Math.ceil(s.questoes.length * 0.7));
  });
});

describe.each(todas)("%s", (_, q) => {
  it("a solução passa na correção", () => {
    const p = Planilha.deExercicio(q);
    if (q.type === "formula") for (const a of q.alvos) expect(p.definir(a.celula, a.solucaoReferencia)).toEqual({ ok: true });
    if (q.type === "format_cell") for (const a of q.alvos) p.formatar(deIntervalo(a.intervalo), a.formato);
    const r = corrigir(q, p);
    expect(r.falhas).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("planilha sem resposta é recusada", () => {
    expect(corrigir(q, Planilha.deExercicio(q)).ok).toBe(false);
  });

  if (q.type === "formula")
    it("valor digitado à mão é recusado", () => {
      const p = Planilha.deExercicio(q);
      for (const a of q.alvos) {
        const v = a.esperado;
        p.definir(a.celula, typeof v === "number" ? String(v).replace(".", ",") : String(v));
      }
      expect(corrigir(q, p).ok).toBe(false);
    });
});
