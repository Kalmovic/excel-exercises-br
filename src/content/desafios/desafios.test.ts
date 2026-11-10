import { describe, expect, it } from "vitest";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { somarDias } from "@/lib/data-sp";
import { exercicios } from "@/content";
import { LANCAMENTO, desafioDoDia, desafios, desafiosAnteriores, numeroDoDesafio } from "./index";

describe("calendário de desafios", () => {
  it("começa no lançamento e não pula nem repete dias", () => {
    expect(desafios[0].data).toBe(LANCAMENTO);
    desafios.forEach((d, i) => expect(d.data).toBe(somarDias(LANCAMENTO, i)));
  });

  it("slug, módulo e plano padronizados; sem dica", () => {
    for (const d of desafios) {
      expect(d.exercicio.slug).toBe(`desafio-${d.data}`);
      expect(d.exercicio.modulo).toBe("desafio");
      expect(d.exercicio.plano).toBe("free");
      expect(d.exercicio.dicas).toEqual([]);
    }
  });

  it("ids e slugs não colidem com os da trilha", () => {
    const trilha = new Set(exercicios.flatMap((e) => [e.id, e.slug]));
    expect(desafios.some((d) => trilha.has(d.exercicio.id) || trilha.has(d.exercicio.slug))).toBe(false);
  });

  it("número do desafio e o que já passou", () => {
    expect(numeroDoDesafio(LANCAMENTO)).toBe(1);
    expect(numeroDoDesafio("2026-11-12")).toBe(3);
    expect(desafioDoDia("2026-11-12")?.exercicio.titulo).toBe("Quantos pedidos já chegaram?");
    const anteriores = desafiosAnteriores("2026-11-12").map((d) => d.data);
    expect(anteriores).toEqual(["2026-11-11", "2026-11-10"]); // nem hoje, nem amanhã
  });
});

describe.each(desafios.map((d) => [d.data, d] as const))("desafio %s", (_, d) => {
  const ex = d.exercicio;
  if (ex.type !== "formula") throw new Error("Desafios ainda só têm o tipo formula");

  it("a solução de referência passa", () => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) expect(p.definir(a.celula, a.solucaoReferencia)).toEqual({ ok: true });
    expect(corrigir(ex, p).falhas).toEqual([]);
    p.destruir();
  });

  it("digitar o resultado à mão é recusado", () => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) {
      const v = a.esperado;
      p.definir(a.celula, typeof v === "number" ? String(v).replace(".", ",") : String(v));
    }
    expect(corrigir(ex, p).ok).toBe(false);
    p.destruir();
  });
});
