import { HyperFormula } from "hyperformula";
import { describe, expect, it } from "vitest";
import {
  alternarReferencia,
  argumentoDestacado,
  completar,
  funcaoNoCursor,
  palavraNoCursor,
  sugestoes,
} from "./autocompletar";
import { CATALOGO, funcaoDoCatalogo } from "./catalogo";
import { garantirRegistro } from "./ptBR";

describe("catálogo", () => {
  it("só tem funções que o motor conhece", () => {
    garantirRegistro();
    const motor = new Set(HyperFormula.getRegisteredFunctionNames("ptBR"));
    expect(CATALOGO.filter((f) => !motor.has(f.nome)).map((f) => f.nome)).toEqual([]);
  });
  it("sem nomes repetidos", () => {
    expect(new Set(CATALOGO.map((f) => f.nome)).size).toBe(CATALOGO.length);
  });
});

describe("autocompletar", () => {
  it("acha o nome sendo digitado", () => {
    expect(palavraNoCursor("=PRO", 4)).toEqual({ inicio: 1, prefixo: "PRO" });
    expect(palavraNoCursor("=SOMA(B2;pro", 12)).toEqual({ inicio: 9, prefixo: "pro" });
    expect(palavraNoCursor("PRO", 3)).toBeNull(); // não é fórmula
    expect(palavraNoCursor('=SE(A1="pro', 11)).toBeNull(); // dentro de aspas
    expect(palavraNoCursor("=$B", 3)).toBeNull();
    expect(palavraNoCursor("=SOMA(B2:B7)", 5)).toBeNull(); // cursor antes do "("
  });

  it("sugere sem diferenciar acento e caixa, em ordem alfabética", () => {
    expect(sugestoes("PRO").map((f) => f.nome)).toEqual(["PROCH", "PROCURAR", "PROCV", "PROCX"]);
    expect(sugestoes("media").map((f) => f.nome)).toEqual(["MÉDIA", "MÉDIASE"]);
    expect(sugestoes("cont.").map((f) => f.nome)).toEqual(["CONT.NÚM", "CONT.SE", "CONT.SES", "CONT.VALORES"]);
    expect(sugestoes("")).toEqual([]);
  });

  it("completa trocando o prefixo e abrindo o parêntese", () => {
    expect(completar("=pro", 4, "PROCV")).toEqual({ texto: "=PROCV(", cursor: 7 });
    expect(completar("=SE(so;1)", 6, "SOMA")).toEqual({ texto: "=SE(SOMA(;1)", cursor: 9 });
  });
});

describe("dica de argumentos", () => {
  it("diz a função e o argumento do cursor", () => {
    const r = funcaoNoCursor("=PROCV(A2;$E$2:$F$9;", 20);
    expect(r?.funcao.nome).toBe("PROCV");
    expect(r?.argumento).toBe(2);
  });
  it("funções aninhadas e parênteses de conta", () => {
    expect(funcaoNoCursor("=SE(SOMA(B2;B3", 14)).toMatchObject({ funcao: { nome: "SOMA" }, argumento: 1 });
    expect(funcaoNoCursor("=SE(SOMA(B2;B3);", 16)).toMatchObject({ funcao: { nome: "SE" }, argumento: 1 });
    expect(funcaoNoCursor("=SE((A1+B1)*2", 13)).toMatchObject({ funcao: { nome: "SE" }, argumento: 0 });
    expect(funcaoNoCursor('=CONT.SE(A2:A9;"a;b', 19)).toMatchObject({ argumento: 1 });
    expect(funcaoNoCursor("=SOMA(B2:B7)", 12)).toBeNull();
  });
  it("argumentos que se repetem", () => {
    const soma = funcaoDoCatalogo("SOMA")!;
    expect([0, 1, 2, 5].map((a) => argumentoDestacado(soma, a))).toEqual([0, 1, 1, 1]);
    const ses = funcaoDoCatalogo("SOMASES")!;
    expect([0, 1, 2, 3, 4].map((a) => argumentoDestacado(ses, a))).toEqual([0, 1, 2, 1, 2]);
    const procv = funcaoDoCatalogo("PROCV")!;
    expect(argumentoDestacado(procv, 4)).toBe(-1);
  });
});

describe("F4", () => {
  const f4 = (t: string, c = t.length) => alternarReferencia(t, c)?.texto;
  it("cicla B2 → $B$2 → B$2 → $B2 → B2", () => {
    expect(f4("=B2")).toBe("=$B$2");
    expect(f4("=$B$2")).toBe("=B$2");
    expect(f4("=B$2")).toBe("=$B2");
    expect(f4("=$B2")).toBe("=B2");
  });
  it("muda a referência onde está o cursor, e o intervalo inteiro", () => {
    expect(f4("=A1*B2", 2)).toBe("=$A$1*B2");
    expect(f4("=SOMA(B2:B7)", 11)).toBe("=SOMA($B$2:$B$7)");
    expect(alternarReferencia("=A1*B2", 2)?.cursor).toBe(5);
  });
  it("ignora texto entre aspas e sem referência", () => {
    expect(alternarReferencia('="B2"', 4)).toBeNull();
    expect(alternarReferencia("=SOMA(", 6)).toBeNull();
    expect(alternarReferencia("B2", 2)).toBeNull();
  });
});
