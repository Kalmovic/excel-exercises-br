/**
 * N2 (persona 2): no celular, o toque duplo abria a edição com o cursor no fim, e a
 * fórmula nova ia parar depois da antiga ("=SOMA(B2;B7)=SOMA(B2:B7)" → FALSO).
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "@/content";
import type { Exercicio } from "@/content/schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "./corrigir";
import { pareceTextoAnexado } from "./diagnostico";

const ex = (slug: string) => exercicios.find((e) => e.slug === slug)!;

describe("pareceTextoAnexado", () => {
  it.each([
    "=SOMA(B2;B7)=SOMA(B2:B7)",
    "=SOMA(B2:B7)=SOMA(B2:B7)",
    "=MÉDIA(B2:B7) = MÉDIA(B2:B8)",
    '=PROCV(F2;A2:C6;3)=PROCV(F2;A2:C6;3;FALSO)',
    '=CONT.SE(A2:A9;"=Sul")=CONT.SE(A2:A9;"Sul")',
  ])("reconhece %s", (f) => expect(pareceTextoAnexado(f)).toBe(true));

  it.each([
    "=SOMA(B2:B7)",
    "=B2=C2",
    "=A2=MÁXIMO(A2:A9)", // comparação de verdade: antes do = não há uma chamada de função
    "=SOMA(B2:B7)>=MÉDIA(B2:B7)",
    "=SOMA(B2:B7)<=MÉDIA(B2:B7)",
    "=SOMA(B2:B7)<>MÉDIA(B2:B7)",
    '=SE(A2="Sul";SOMA(B2:B7);0)', // = dentro de parênteses
    '=CONT.SE(A2:A9;"=Sul")', // = dentro de aspas
    "=SOMA(B2:B7)+1=SOMA(C2:C7)", // antes do = há mais que uma chamada
    "=E(A2>1;B2<2)=VERDADEIRO",
    "150",
    "",
  ])("não reconhece %s", (f) => expect(pareceTextoAnexado(f)).toBe(false));
});

describe("correção", () => {
  it("a pegadinha da SOMA com a fórmula nova escrita depois da antiga explica o que houve", () => {
    const e = ex("soma-total-de-vendas-pegadinha");
    const p = Planilha.deExercicio(e);
    p.definir("B8", "=SOMA(B2;B7)=SOMA(B2:B7)");
    expect(p.valor("B8")).toBe(false);
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].motivo).toBe("texto-anexado");
    expect(r.falhas[0].mensagem).toBe(
      'Sua fórmula ficou "=SOMA(B2;B7)=SOMA(B2:B7)": parece que o texto novo foi escrito depois do que já estava na célula. Apague o conteúdo antes de digitar.',
    );
  });

  it("o erro previsto no roteiro continua com a dica dele", () => {
    const e = ex("soma-total-de-vendas-pegadinha");
    const p = Planilha.deExercicio(e);
    p.definir("B8", "=SOMA(B2;B7)");
    expect(corrigir(e, p).falhas[0].mensagem).toMatch(/ponto e vírgula/);
  });

  // Sem falsos positivos: em nenhum exercício de fórmula a resposta de referência casa
  // com o padrão quando o esperado não é lógico (o caso em que a mensagem apareceria).
  const formulas = exercicios.filter((e): e is Extract<Exercicio, { type: "formula" }> => e.type === "formula");
  it("há exercícios de fórmula no conteúdo", () => expect(formulas.length).toBeGreaterThan(50));
  it("nenhuma solução de referência dispara a mensagem", () => {
    const logico = (v: unknown): boolean => typeof v === "boolean" || (Array.isArray(v) && v.some(logico));
    const suspeitas = formulas.flatMap((e) =>
      e.alvos.filter((a) => !logico(a.esperado) && pareceTextoAnexado(a.solucaoReferencia)).map((a) => `${e.slug} ${a.celula}`),
    );
    expect(suspeitas).toEqual([]);
  });
  it("as soluções de referência continuam aceitas", () => {
    const falhas = formulas.flatMap((e) => {
      const p = Planilha.deExercicio(e);
      for (const a of e.alvos) p.definir(a.celula, a.solucaoReferencia);
      const r = corrigir(e, p);
      p.destruir();
      return r.falhas.filter((f) => f.motivo === "texto-anexado").map((f) => `${e.slug}: ${f.mensagem}`);
    });
    expect(falhas).toEqual([]);
  });
});
