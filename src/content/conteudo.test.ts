/**
 * Todo exercício precisa ser resolvível: a solução de referência tem que
 * produzir o valor esperado e passar na correção. Isso deixa barato (e seguro)
 * escrever exercícios novos.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { deEndereco } from "@/engine/address";

// Todos os exercícios de fórmula (Fundamentos e a "primeira fórmula" do Intro).
const formulas = exercicios.filter((e): e is ExercicioDoTipo<"formula"> => e.type === "formula");

describe.each(formulas.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
  it("a solução de referência passa na correção", () => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) expect(p.definir(a.celula, a.solucaoReferencia)).toEqual({ ok: true });
    const r = corrigir(ex, p);
    expect(r.falhas).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("valor digitado à mão é recusado", () => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) {
      const v = a.esperado;
      p.definir(a.celula, typeof v === "number" ? String(v).replace(".", ",") : String(v));
    }
    expect(corrigir(ex, p).ok).toBe(false);
  });

  it("células vazias são recusadas", () => {
    expect(corrigir(ex, Planilha.deExercicio(ex)).ok).toBe(false);
  });

  it("alvos não são células bloqueadas", () => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) expect(p.bloqueada(a.celula)).toBe(false);
  });
});

describe("casos específicos", () => {
  const porSlug = (s: string) => exercicios.find((e) => e.slug === s)!;

  it("fórmula com constantes (=12500+9800+…) é pega pela perturbação", () => {
    const ex = porSlug("soma-total-de-vendas");
    const p = Planilha.deExercicio(ex);
    p.definir("B8", "=SOMA(12500;9800;14300;11250;15900;13750)");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].motivo).toBe("valor-fixo");
  });

  it("exige a função pedida", () => {
    const ex = porSlug("soma-total-de-vendas");
    const p = Planilha.deExercicio(ex);
    p.definir("B8", "=B2+B3+B4+B5+B6+B7");
    expect(corrigir(ex, p).falhas.map((f) => f.motivo)).toContain("funcao-faltando");
  });

  it("sem $ a cópia quebra a comissão", () => {
    const ex = porSlug("referencia-absoluta-comissao");
    const p = Planilha.deExercicio(ex);
    p.definir("C2", "=B2*F1");
    const c2 = deEndereco("C2");
    p.preencher({ inicio: c2, fim: c2 }, { inicio: deEndereco("C3"), fim: deEndereco("C6") });
    expect(corrigir(ex, p).ok).toBe(false);
  });

  it("com $ e alça de preenchimento passa", () => {
    const ex = porSlug("referencia-absoluta-comissao");
    const p = Planilha.deExercicio(ex);
    p.definir("C2", "=B2*$F$1");
    const c2 = deEndereco("C2");
    p.preencher({ inicio: c2, fim: c2 }, { inicio: deEndereco("C3"), fim: deEndereco("C6") });
    expect(corrigir(ex, p).ok).toBe(true);
  });

  it("variação: forma alternativa =C2/B2-1 também passa", () => {
    const ex = porSlug("variacao-percentual");
    const p = Planilha.deExercicio(ex);
    for (const r of [2, 3, 4, 5]) p.definir(`D${r}`, `=C${r}/B${r}-1`);
    expect(corrigir(ex, p).ok).toBe(true);
  });
});

describe("referência circular", () => {
  const ex = exercicios.find((e) => e.slug === "soma-total-de-vendas")!;

  it("mostra 0 como o Excel e explica na correção", () => {
    const p = Planilha.deExercicio(ex);
    p.definir("B8", "=SOMA(B2:B8)");
    expect(p.circular("B8")).toBe(true);
    expect(p.exibicao("B8").replace(/\s/g, " ")).toBe("R$ 0,00");
    expect(p.celulasCirculares()).toEqual(["B8"]);
    const r = corrigir(ex, p);
    expect(r.falhas[0].motivo).toBe("circular");
    expect(r.falhas[0].mensagem).toContain("referência circular");
  });

  it("erros comuns vêm com explicação", () => {
    const ex4 = exercicios.find((e) => e.slug === "variacao-percentual")!;
    const p = Planilha.deExercicio(ex4);
    p.definir("D2", "=(C2-B2)/A10");
    expect(corrigir(ex4, p).falhas[0].mensagem).toContain("divisão por zero");
  });
});
