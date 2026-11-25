/**
 * Referência 3D (=SOMA(Jan:Mar!B2)) e INDIRETO (=INDIRETO("'"&A2&"'!B2")):
 * o motor, a grafia do nome das abas ao gravar e o realce na fórmula.
 */
import { describe, expect, it } from "vitest";
import type { Grade } from "./engine";
import { Pasta, deslocarFormula } from "./engine";
import { analisar } from "./motor/parser";
import { referenciasDaFormula } from "./referencias";
import { validarIdioma } from "./formula";

const g = (celulas: Record<string, string>): Grade => ({
  linhas: 10,
  colunas: 6,
  celulas: Object.fromEntries(Object.entries(celulas).map(([e, entrada]) => [e, { entrada }])),
});

function pasta() {
  return new Pasta([
    { nome: "Resumo", grade: g({ A1: "Mês", A2: "Jan", A3: "Fev", A4: "Mar", A5: "Jan 2026" }) },
    { nome: "Jan", grade: g({ B2: "100", B3: "10", B4: "texto" }) },
    { nome: "Fev", grade: g({ B2: "200", B3: "20" }) },
    { nome: "Mar", grade: g({ B2: "300", B3: "30" }) },
    { nome: "Jan 2026", grade: g({ B2: "7", B3: "3" }) },
  ]);
}

describe("referência 3D", () => {
  it("o parser lê Jan:Mar!B2, intervalos, colunas inteiras e nomes entre aspas", () => {
    expect(analisar("=SOMA(Jan:Mar!B2)")).toMatchObject({ t: "fn", args: [{ t: "ref3d", ini: "Jan", fim: "Mar", a: { l: 1, c: 1 }, b: { l: 1, c: 1 } }] });
    expect(analisar("=SOMA(Jan:Mar!B2:B3)")).toMatchObject({ args: [{ t: "ref3d", a: { l: 1, c: 1 }, b: { l: 2, c: 1 } }] });
    expect(analisar("=SOMA(Jan:Mar!B:B)")).toMatchObject({ args: [{ t: "ref3d", a: { l: 0, c: 1 } }] });
    expect(analisar("=SOMA('Jan 2026:Mar'!B2)")).toMatchObject({ args: [{ t: "ref3d", ini: "Jan 2026", fim: "Mar" }] });
  });

  it("SOMA, MÉDIA, MÁXIMO, MÍNIMO e as contagens percorrem as abas pela ordem", () => {
    const [resumo] = pasta().abas;
    const v = (f: string) => { resumo.definir("C1", f); return resumo.valor("C1"); };
    expect(v("=SOMA(Jan:Mar!B2)")).toBe(600);
    expect(v("=SOMA(Jan:Mar!B2:B3)")).toBe(660);
    expect(v("=SOMA(JAN:mar!B2)")).toBe(600);
    expect(v("=SOMA(Mar:Jan!B2)")).toBe(600);
    expect(v("=SOMA(Fev:Fev!B2)")).toBe(200);
    expect(v("=MÉDIA(Jan:Mar!B2)")).toBe(200);
    expect(v("=MÁXIMO(Jan:Mar!B3)")).toBe(30);
    expect(v("=MÍNIMO(Jan:Mar!B2)")).toBe(100);
    expect(v("=CONT.NÚM(Jan:Mar!B2:B4)")).toBe(6);
    expect(v("=CONT.VALORES(Jan:Mar!B2:B4)")).toBe(7);
    expect(v("=SOMA(Jan:Mar!B:B)")).toBe(660);
    // A aba Jan 2026 fica depois de Mar: Fev até ela pega Fev, Mar e Jan 2026.
    expect(v("=SOMA('Fev:Jan 2026'!B2)")).toBe(507);
    expect(v("=SOMA(Jan:Mar!B2)+1")).toBe(601);
  });

  it("fora das funções que aceitam 3D dá #VALOR!; aba que não existe, #REF!", () => {
    const [resumo] = pasta().abas;
    const v = (f: string) => { resumo.definir("C1", f); return resumo.valor("C1"); };
    expect(v("=Jan:Mar!B2")).toEqual({ erro: "#VALOR!" });
    expect(v('=SOMASE(Jan:Mar!B2:B3;">0")')).toEqual({ erro: "#VALOR!" });
    expect(v("=SOMA(SE(VERDADEIRO;Jan:Mar!B2))")).toEqual({ erro: "#VALOR!" });
    expect(v("=SOMA(Jan:Abr!B2)")).toEqual({ erro: "#REF!" });
  });

  it("mudar uma aba do meio recalcula a soma", () => {
    const [resumo, , fev] = pasta().abas;
    resumo.definir("C1", "=SOMA(Jan:Mar!B5)");
    expect(resumo.valor("C1")).toBe(0);
    fev.definir("B5", "45");
    expect(resumo.valor("C1")).toBe(45);
  });

  it("grava com a grafia das abas e copia só a célula", () => {
    const [resumo] = pasta().abas;
    resumo.definir("C1", "=soma(jan:mar!b2)");
    expect(resumo.bruto("C1")).toBe("=SOMA(Jan:Mar!B2)");
    resumo.definir("C2", "=SOMA('jan 2026:MAR'!B2)");
    expect(resumo.bruto("C2")).toBe("=SOMA('Jan 2026:Mar'!B2)");
    expect(deslocarFormula("=SOMA(Jan:Mar!B2)", 1, 0)).toBe("=SOMA(Jan:Mar!B3)");
  });

  it("realce: a referência sabe o intervalo de abas", () => {
    const [r] = referenciasDaFormula("=SOMA(Jan:Mar!B2:B6)");
    expect(r).toMatchObject({ texto: "B2:B6", aba: "Jan", ateAba: "Mar" });
    expect(referenciasDaFormula("=SOMA('Jan 2026:Mar'!B2)")[0]).toMatchObject({ aba: "Jan 2026", ateAba: "Mar" });
    expect(referenciasDaFormula("=SOMA(Mar!B2)")[0].ateAba).toBeUndefined();
  });
});

describe("INDIRETO", () => {
  it("lê a referência escrita num texto, com a aba que está numa célula", () => {
    const [resumo] = pasta().abas;
    const v = (f: string) => { resumo.definir("C1", f); return resumo.valor("C1"); };
    expect(v('=INDIRETO("Fev!B2")')).toBe(200);
    expect(v('=INDIRETO(A3&"!B3")')).toBe(20);
    expect(v(`=INDIRETO("'"&A5&"'!B2")`)).toBe(7);
    expect(v(`=SOMA(INDIRETO("'"&A2&"'!B2:B3"))`)).toBe(110);
    expect(v('=INDIRETO("A2")')).toBe("Jan");
    expect(v('=SOMASE(INDIRETO("Mar!B2:B3");">25")')).toBe(330);
    expect(v('=SOMASE(INDIRETO("Mar!B2:B3");">25";INDIRETO("Fev!B2"))')).toBe(220);
    expect(v('=DESLOC(INDIRETO("Mar!B2");1;0)')).toBe(30);
  });

  it("nome de aba com espaço sem aspas, texto que não é referência e aba que não existe dão #REF!", () => {
    const [resumo] = pasta().abas;
    const v = (f: string) => { resumo.definir("C1", f); return resumo.valor("C1"); };
    expect(v('=INDIRETO(A5&"!B2")')).toEqual({ erro: "#REF!" });
    expect(v('=INDIRETO("banana")')).toEqual({ erro: "#REF!" });
    expect(v('=INDIRETO("Abr!B2")')).toEqual({ erro: "#REF!" });
    expect(v('=INDIRETO("Jan:Mar!B2")')).toEqual({ erro: "#REF!" });
    expect(v('=INDIRETO("B2";FALSO)')).toEqual({ erro: "#REF!" });
  });

  it("muda junto com a célula que tem o nome da aba", () => {
    const [resumo] = pasta().abas;
    resumo.definir("D1", "Jan");
    resumo.definir("C1", '=SOMA(INDIRETO(D1&"!B2:B3"))');
    expect(resumo.valor("C1")).toBe(110);
    resumo.definir("D1", "Mar");
    expect(resumo.valor("C1")).toBe(330);
  });

  it("é aceito como função do Excel em português (e sugerido no lugar de INDIRECT)", () => {
    expect(validarIdioma('=INDIRETO("A1")')).toEqual({ ok: true });
    expect(validarIdioma('=INDIRECT("A1")')).toMatchObject({ ok: false, mensagem: expect.stringContaining("INDIRETO") });
  });
});
