/** DIAS(data_final; data_inicial) e a referência ao resultado que derrama (D2#). */
import { describe, expect, it } from "vitest";
import type { Grade } from "./engine";
import { Planilha } from "./engine";
import { validarIdioma } from "./formula";

const g = (celulas: Record<string, string>): Grade => ({
  linhas: 12,
  colunas: 8,
  celulas: Object.fromEntries(Object.entries(celulas).map(([e, entrada]) => [e, { entrada }])),
});
const nova = (c: Record<string, string>) => new Planilha(g(c));

describe("DIAS", () => {
  it("dias entre as datas, com a data final primeiro (o contrário do DATADIF)", () => {
    const p = nova({ A1: "01/12/2026", A2: "25/12/2026" });
    expect(p.definir("B1", "=DIAS(A2;A1)")).toEqual({ ok: true });
    expect(p.valor("B1")).toBe(24);
    p.definir("B2", "=DIAS(A1;A2)"); // ordem trocada: negativo (o DATADIF daria #NÚM!)
    expect(p.valor("B2")).toBe(-24);
    p.definir("B3", "=DATADIF(A1;A2;\"D\")");
    expect(p.valor("B3")).toBe(24);
  });
  it("a fórmula em pt-BR é aceita e a em inglês é recusada com a dica", () => {
    expect(validarIdioma("=DIAS(A2;A1)")).toEqual({ ok: true });
    expect(validarIdioma("=DAYS(A2,A1)").ok).toBe(false);
  });
});

describe("referência ao resultado que derrama (D2#)", () => {
  const base = () => nova({ A1: "Cliente", A2: "Alfa", A3: "Beta", A4: "Alfa", A5: "Gama", A6: "Beta", D2: "=ÚNICO(A2:A6)" });

  it("D2# é o intervalo inteiro que o ÚNICO derramou, e acompanha quando ele cresce", () => {
    const p = base();
    p.definir("F1", "=CONT.VALORES(D2#)");
    expect(p.valor("F1")).toBe(3);
    p.definir("F2", "=ÍNDICE(D2#;3)");
    expect(p.valor("F2")).toBe("Gama");
  });

  it("quando a lista de origem muda, o derrame cresce e D2# acompanha", () => {
    const p = nova({ H2: "=ÚNICO(G2:G5)" });
    for (const [e, v] of [["G2", "Alfa"], ["G3", "Beta"], ["G4", "Alfa"], ["G5", "Beta"]]) p.definir(e, v);
    p.definir("F1", "=CONT.VALORES(H2#)");
    expect(p.valor("F1")).toBe(2);
    p.definir("G5", "Gama"); // um cliente novo
    expect(p.valor("F1")).toBe(3);
  });

  it("funciona dentro de outras funções de matriz e de busca", () => {
    const p = base();
    p.definir("F1", "=ÍNDICE(D2#;2)");
    expect(p.valor("F1")).toBe("Beta");
    p.definir("F2", "=CONT.SE(D2#;\"A*\")");
    expect(p.valor("F2")).toBe(1);
    p.definir("F3", "=CONT.VALORES(CLASSIFICAR(D2#))");
    expect(p.valor("F3")).toBe(3);
  });

  it("célula sem fórmula que derrama dá #REF!, como no Excel", () => {
    const p = base();
    p.definir("F1", "=SOMA(A2#)"); // A2 é valor digitado
    expect(String(p.exibicao("F1"))).toContain("#REF!");
    p.definir("E10", "=1+1");
    p.definir("F2", "=SOMA(E10#)"); // fórmula de um valor só não derrama
    expect(String(p.exibicao("F2"))).toContain("#REF!");
  });

  it("os erros #N/D, #REF! etc. continuam sendo lidos como erro, não como D2#", () => {
    const p = base();
    expect(p.definir("F1", "=SEERRO(#N/D;1)")).toEqual({ ok: true });
    expect(p.valor("F1")).toBe(1);
    expect(p.definir("F2", "=SEERRO(#REF!;2)")).toEqual({ ok: true });
    expect(p.valor("F2")).toBe(2);
  });
});
