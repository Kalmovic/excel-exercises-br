/** Correções da F2 que não cabem no teste diferencial (docs/revisao/planos/F2.md). */
import { describe, expect, it } from "vitest";
import { Pasta, Planilha, type Grade } from "@/engine/engine";
import { casaCuringa, localizarCuringa } from "./curinga";
import { Calculo, LIMITE_TEXTO } from "./nucleo";
import { analisar } from "./parser";

const grade = (celulas: Record<string, string>, linhas = 12, colunas = 8): Grade =>
  ({ linhas, colunas, celulas: Object.fromEntries(Object.entries(celulas).map(([k, v]) => [k, { entrada: v }])) }) as Grade;
const calc = (f: string, p: Planilha) => {
  expect(p.definir("H1", f)).toEqual({ ok: true });
  return p.valor("H1");
};

describe("colunas e linhas inteiras (B03)", () => {
  const p = () => new Planilha(grade({ A1: "Nome", A2: "1", A3: "2", B2: "x", B3: "y", C2: "10", C3: "20" }));
  it("A:A, $A:$C, 1:1 e PROCV em A:C", () => {
    expect(calc("=SOMA(A:A)", p())).toBe(3);
    expect(calc("=SOMA($A:$C)", p())).toBe(33);
    expect(calc("=CONT.VALORES(2:2)", p())).toBe(3);
    expect(calc('=PROCV("y";B:C;2;0)', p())).toBe(20);
  });
  it("com o nome da aba, e dados além do limite padrão também entram", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: grade({}) },
      { nome: "Dados 2024", grade: grade({ B2: "5", B70: "7" }, 80, 4) },
    ]);
    const r = pasta.abas[0];
    expect(calc("=SOMA('Dados 2024'!B:B)", r)).toBe(12);
  });
  it("o limite vem de Calculo.limites (padrão 50 × 26)", () => {
    const c = new Calculo();
    expect(c.limites).toEqual({ linhas: 50, colunas: 26 });
    c.definir(5, 0, { formula: analisar("=CONT.VALORES(1:1)") });
    c.definir(0, 30, { valor: 1, tipo: "NUMBER_RAW" });
    c.definir(1, 0, { formula: analisar("=CONTAR.VAZIO(B:B)") });
    expect(c.ler(5, 0)).toBe(1);
    expect(c.ler(1, 0)).toBe(50);
    c.limites = { linhas: 100, colunas: 26 };
    c.invalidar();
    expect(c.ler(1, 0)).toBe(100);
  });
});

describe("vazio (B04)", () => {
  it("=A6 mostra 0, mas dentro das contas e das matrizes o vazio continua vazio", () => {
    const p = new Planilha(grade({ A1: "1", A3: "3", B1: "=A2", B2: "=ÉCÉL.VAZIA(A2)", B3: "=ÉCÉL.VAZIA(B1)", C1: "=A1:A3" }));
    expect(p.valor("B1")).toBe(0);
    expect(p.valor("B2")).toBe(true);
    expect(p.valor("B3")).toBe(false);
    expect(p.valor("C2")).toBe(null);
  });
});

describe("LET com referência (F3 do adversarial)", () => {
  it("SUBTOTAL, AGREGAR, DESLOC e SOMA enxergam o nome como referência", () => {
    const p = new Planilha(grade({ A1: "1", A2: "2", A3: "3", A4: "texto" }));
    expect(calc('=LET(r;A1:A3;CONT.SE(r;">1"))', p)).toBe(2);
    expect(calc('=LET(r;A1:A3;SOMASE(r;">1"))', p)).toBe(5);
    expect(calc("=LET(r;A1:A3;SUBTOTAL(9;r))", p)).toBe(6);
    expect(calc("=LET(r;A1:A3;AGREGAR(9;6;r))", p)).toBe(6);
    expect(calc("=LET(r;A1;SOMA(DESLOC(r;1;0;2;1)))", p)).toBe(5);
    expect(calc("=LET(r;A4;s;r;SOMA(s))", p)).toBe(0);
    expect(calc("=LET(r;A1:A3;r;5;r*2)", p)).toBe(10);
  });
});

describe("TAXA (adversarial)", () => {
  it("TAXA(10;-100;1000) = 0", () => {
    expect(calc("=TAXA(10;-100;1000)", new Planilha(grade({})))).toBeCloseTo(0, 9);
    expect(calc("=TAXA(12;-100;1000)", new Planilha(grade({})))).toBeCloseTo(0.0292285, 6);
  });
});

describe("curingas sem expressão regular (segurança P0-2)", () => {
  const padrao = "*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b";
  it("o padrão do relatório termina em bem menos de 50 ms", () => {
    for (const n of [40, LIMITE_TEXTO]) {
      const t0 = performance.now();
      expect(casaCuringa(padrao, "a".repeat(n))).toBe(false);
      expect(localizarCuringa(padrao, "a".repeat(n))).toBe(-1);
      expect(performance.now() - t0).toBeLessThan(50);
    }
    const p = new Planilha(grade({ F9: "a".repeat(40) }));
    const t0 = performance.now();
    expect(calc(`=CONT.SE(F9;"${padrao}")`, p)).toBe(0);
    expect(performance.now() - t0).toBeLessThan(50);
  });
  it("*, ? e ~", () => {
    expect(casaCuringa("a~*b", "a*b")).toBe(true);
    expect(casaCuringa("a~*b", "axb")).toBe(false);
    expect(casaCuringa("?va", "Eva")).toBe(true);
    expect(casaCuringa("car*", "Carla")).toBe(true);
    expect(casaCuringa("~~", "~")).toBe(true);
    expect(localizarCuringa("n?n", "banana")).toBe(2);
    expect(localizarCuringa("b*a", "banana")).toBe(0);
  });
});

describe("limites de tamanho (segurança P0/P1-3)", () => {
  const p = () => new Planilha(grade({ A1: "1" }));
  it("matriz com mais de 10.000 células dá #NÚM!", () => {
    expect(calc("=SOMA(SEQUÊNCIA(3000;3000))", p())).toEqual({ erro: "#NÚM!" });
    expect(calc("=SEQUÊNCIA(20000;20000)", p())).toEqual({ erro: "#NÚM!" });
    expect(calc("=SOMA(DESLOC(A1;0;0;3000;700))", p())).toEqual({ erro: "#NÚM!" });
    expect(calc("=SOMA(SEQUÊNCIA(1;10000)*SEQUÊNCIA(10000))", p())).toEqual({ erro: "#NÚM!" });
    expect(calc("=SOMA(SEQUÊNCIA(100;100))", p())).toBe(50005000);
  });
  it("intervalo explícito enorme é cortado no tamanho da aba", () => {
    expect(calc("=SOMA(A1:A100000)", p())).toBe(1);
  });
  it("texto com mais de 32.767 caracteres dá #VALOR!", () => {
    expect(calc('=REPT("a";32767)', p())).toHaveLength(32767);
    expect(calc('=REPT("ab";20000)', p())).toEqual({ erro: "#VALOR!" });
    expect(calc('=REPT("a";1E9)', p())).toEqual({ erro: "#VALOR!" });
    expect(calc('=REPT("a";20000)&REPT("a";20000)', p())).toEqual({ erro: "#VALOR!" });
    expect(calc('=CONCAT(REPT("a";20000);REPT("a";20000))', p())).toEqual({ erro: "#VALOR!" });
    expect(calc('=UNIRTEXTO("";VERDADEIRO;REPT("a";20000);REPT("a";20000))', p())).toEqual({ erro: "#VALOR!" });
    expect(calc('=SUBSTITUIR(REPT("a";1000);"a";REPT("b";1000))', p())).toEqual({ erro: "#VALOR!" });
  });
});

describe("outros", () => {
  const p = () => new Planilha(grade({ A1: "12345678", A2: "0,75" }));
  it("TEXTO com CEP, hora com AM/PM e seções", () => {
    expect(calc('=TEXTO(A1;"00000-000")', p())).toBe("12345-678");
    expect(calc('=TEXTO(A2;"h:mm AM/PM")', p())).toBe("6:00 PM");
    expect(calc('=TEXTO(-5;"0;(0)")', p())).toBe("(5)");
    expect(calc('=TEXTO(0,5;"0,0#")', p())).toBe("0,5");
  });
  it("matriz constante com \\ entre colunas", () => {
    expect(calc("=SOMA({1\\2\\3})", p())).toBe(6);
    expect(calc("=ÍNDICE({1\\2;3\\4};2;1)", p())).toBe(3);
  });
});
