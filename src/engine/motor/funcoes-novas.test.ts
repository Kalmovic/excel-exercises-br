import { describe, expect, it } from "vitest";
import type { Grade } from "../engine";
import { Planilha } from "../engine";
import { deIntervalo } from "../address";
import { validarIdioma } from "../formula";

const base = (): Grade => ({
  linhas: 12,
  colunas: 8,
  celulas: {
    A1: { entrada: "Nome" }, B1: { entrada: "Valor" },
    A2: { entrada: "Ana" }, B2: { entrada: "10" },
    A3: { entrada: "Bruno" }, B3: { entrada: "25" },
    A4: { entrada: "Carla" }, B4: { entrada: "=1/0" },
    A5: { entrada: "" }, B5: { entrada: "40" },
    A6: { entrada: "Eva" }, B6: { entrada: "15" },
    D1: { entrada: "Rua A, 10, Centro" },
  },
});
const calc = (f: string, p = new Planilha(base())) => {
  expect(p.definir("H1", f)).toEqual({ ok: true });
  return p.valor("H1");
};

describe("funções novas", () => {
  it("LET: nomes, reaproveitamento e nome fora do LET continua recusado", () => {
    expect(calc("=LET(taxa;10%;B2*taxa)")).toBeCloseTo(1);
    expect(calc("=LET(a;B2;b;a*2;a+b)")).toBe(30);
    expect(new Planilha(base()).definir("H1", "=taxa*2").ok).toBe(false);
  });

  it("CORRESPX: exata por padrão, próximo menor/maior, do fim para o começo, curinga", () => {
    const p = new Planilha({ linhas: 10, colunas: 8, celulas: { A1: { entrada: "10" }, A2: { entrada: "20" }, A3: { entrada: "30" }, A4: { entrada: "20" }, B1: { entrada: "Mouse sem fio" }, B2: { entrada: "Teclado" } } });
    expect(calc("=CORRESPX(20;A1:A4)", p)).toBe(2);
    expect(calc("=CORRESPX(20;A1:A4;0;-1)", p)).toBe(4);
    expect(calc("=CORRESPX(25;A1:A4)", p)).toEqual({ erro: "#N/D" });
    expect(calc("=CORRESPX(25;A1:A4;-1)", p)).toBe(2);
    expect(calc("=CORRESPX(25;A1:A4;1)", p)).toBe(3);
    expect(calc('=CORRESPX("tecl*";B1:B2;2)', p)).toBe(2);
  });

  it("UNIRTEXTO e DIVIDIRTEXTO", () => {
    expect(calc('=UNIRTEXTO(", ";VERDADEIRO;A2:A6)')).toBe("Ana, Bruno, Carla, Eva");
    expect(calc('=UNIRTEXTO("-";FALSO;A4:A6)')).toBe("Carla--Eva");
    const p = new Planilha(base());
    p.definir("D3", '=DIVIDIRTEXTO(D1;", ")');
    expect([p.valor("D3"), p.valor("E3"), p.valor("F3")]).toEqual(["Rua A", "10", "Centro"]);
  });

  it("PEGAR, DESCARTAR e ESCOLHERCOLS derramam", () => {
    const p = new Planilha(base());
    p.definir("D3", "=PEGAR(A2:B6;2)");
    expect([p.valor("D3"), p.valor("E4")]).toEqual(["Ana", 25]);
    p.definir("D6", "=PEGAR(A2:A6;-1)");
    expect(p.valor("D6")).toBe("Eva");
    p.definir("G2", "=DESCARTAR(A2:A6;3)");
    expect([p.valor("G2"), p.valor("G3")]).toEqual([null, "Eva"]);
    p.definir("F8", "=ESCOLHERCOLS(A2:B3;2;1)");
    expect([p.valor("F8"), p.valor("G8")]).toEqual([10, "Ana"]);
    expect(calc("=ESCOLHERCOLS(A2:B3;3)")).toEqual({ erro: "#VALOR!" });
  });

  it("AGREGAR ignora o erro (opção 6), SOMA não; MAIOR com k; linhas do filtro com opção 5", () => {
    expect(calc("=SOMA(B2:B6)")).toEqual({ erro: "#DIV/0!" });
    expect(calc("=AGREGAR(9;6;B2:B6)")).toBe(90);
    expect(calc("=AGREGAR(14;6;B2:B6;2)")).toBe(25);
    const p = new Planilha(base());
    p.ligarFiltro(deIntervalo("A1:B6"));
    p.filtrarColuna(0, ["Ana", "Eva"]);
    expect(calc("=AGREGAR(9;7;B2:B6)", p)).toBe(25);
    expect(calc("=AGREGAR(9;6;B2:B6)", p)).toBe(90);
  });

  it("financeiras batem com o Excel", () => {
    expect(calc("=VP(1%;12;-500)")).toBeCloseTo(5627.54, 2);
    expect(calc("=VF(1%;12;-500)")).toBeCloseTo(6341.25, 2);
    expect(calc("=NPER(1%;-500;5000)")).toBeCloseTo(10.5886, 3);
    expect(calc("=TAXA(12;-500;5627,54)")).toBeCloseTo(0.01, 6);
    expect(calc("=VF(0;10;-100)")).toBe(1000);
  });

  it("NÚMSEMANA e MARRED", () => {
    expect(calc("=NÚMSEMANA(DATA(2026;1;1))")).toBe(1);
    expect(calc("=NÚMSEMANA(DATA(2026;1;4))")).toBe(2); // domingo começa a semana 2
    expect(calc("=NÚMSEMANA(DATA(2026;1;4);2)")).toBe(1); // segunda: ainda na 1
    expect(calc("=NÚMSEMANA(DATA(2027;1;1);21)")).toBe(53); // ISO: 01/01/2027 é sexta da semana 53 de 2026
    expect(calc("=MARRED(17;5)")).toBe(15);
    expect(calc("=MARRED(18;5)")).toBe(20);
    expect(calc("=MARRED(-17;5)")).toEqual({ erro: "#NÚM!" });
    expect(calc("=MARRED(1,23;0,05)")).toBeCloseTo(1.25);
  });

  it("nome em inglês sugere o português", () => {
    expect(validarIdioma("=XMATCH(1;A1:A3)")).toEqual({ ok: false, mensagem: "Você quis dizer CORRESPX? No Excel em português, XMATCH se chama CORRESPX." });
    expect(validarIdioma("=TAKE(A1:A3;1)").ok).toBe(false);
    expect(validarIdioma("=LET(x;1;x)").ok).toBe(true);
  });
});
