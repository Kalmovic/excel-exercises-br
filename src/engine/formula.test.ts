import { describe, expect, it } from "vitest";
import { funcoesUsadas, paraExibicao, paraMotor, validarIdioma } from "./formula";

describe("validarIdioma", () => {
  it("aceita pt-BR", () => {
    expect(validarIdioma('=PROCV(A1;B:C;2;FALSO)').ok).toBe(true);
    expect(validarIdioma("=SOMA(1,5;2)").ok).toBe(true);
  });
  it("sugere o nome em português", () => {
    const r = validarIdioma("=VLOOKUP(A1;B:C;2;FALSO)");
    expect(r).toEqual({ ok: false, mensagem: expect.stringContaining("Você quis dizer PROCV?") });
  });
  it("sugere o nome com acento", () => {
    const r = validarIdioma("=media(B2:B9)");
    expect(r).toEqual({ ok: false, mensagem: expect.stringContaining("Você quis dizer MÉDIA?") });
  });
  it("avisa sobre vírgula como separador de argumentos", () => {
    const r = validarIdioma("=SOMA(A1,A2)");
    expect(r).toEqual({ ok: false, mensagem: expect.stringContaining("ponto e vírgula") });
  });
  it("ignora nomes dentro de texto", () => {
    expect(validarIdioma('="SUM(" & A1').ok).toBe(true);
  });
  it("função inexistente", () => {
    expect(validarIdioma("=XPTO(1)").ok).toBe(false);
  });
});

describe("funcoesUsadas", () => {
  it("devolve ids canônicos e ignora texto", () => {
    expect(funcoesUsadas('=SEERRO(PROCV(A1;B:C;2;FALSO);"SOMA(")').sort()).toEqual(
      ["FALSE", "IFERROR", "VLOOKUP"].sort(),
    );
  });
});

describe("booleanos", () => {
  it("ida e volta", () => {
    expect(paraMotor("=SE(A1;VERDADEIRO;falso)")).toBe("=SE(A1;VERDADEIRO();FALSO())");
    expect(paraExibicao("=SE(A1;VERDADEIRO();FALSO())")).toBe("=SE(A1;VERDADEIRO;FALSO)");
    expect(paraMotor('="FALSO"')).toBe('="FALSO"');
  });
});
