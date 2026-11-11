import { describe, expect, it } from "vitest";
import { ateABorda, ultimaUsada } from "./navegacao";
import { referenciasDaFormula } from "./referencias";

describe("referências coloridas", () => {
  it("acha células e intervalos, com cor por referência", () => {
    const r = referenciasDaFormula("=SOMA(B2:B7)/$F$1+B2:B7*C3");
    expect(r.map((x) => x.texto)).toEqual(["B2:B7", "$F$1", "B2:B7", "C3"]);
    expect(r.map((x) => x.cor)).toEqual([0, 1, 0, 2]);
    expect(r[0].intervalo).toEqual({ inicio: { linha: 1, coluna: 1 }, fim: { linha: 6, coluna: 1 } });
    expect(r[1].inicio).toBe(13);
  });
  it("ignora texto entre aspas, nomes de função e o que não é fórmula", () => {
    expect(referenciasDaFormula('=CONT.SE(A1:A9;"B2")').map((x) => x.texto)).toEqual(["A1:A9"]);
    expect(referenciasDaFormula("=LOG10(A1)").map((x) => x.texto)).toEqual(["A1"]);
    expect(referenciasDaFormula("B2+C3")).toEqual([]);
  });
  it("intervalo escrito ao contrário é normalizado", () => {
    expect(referenciasDaFormula("=SOMA(B7:B2)")[0].intervalo.inicio).toEqual({ linha: 1, coluna: 1 });
  });
});

describe("Ctrl+setas", () => {
  // grade 10x3; coluna A preenchida de A1 a A4 e em A8
  const cheias = new Set(["0,0", "1,0", "2,0", "3,0", "7,0"]);
  const preenchida = (p: { linha: number; coluna: number }) => cheias.has(`${p.linha},${p.coluna}`);
  const ir = (l: number, c: number, dl: number, dc: number) => ateABorda({ linha: l, coluna: c }, dl, dc, preenchida, 10, 3);
  it("dentro do bloco vai até a última preenchida", () => expect(ir(0, 0, 1, 0)).toEqual({ linha: 3, coluna: 0 }));
  it("da borda do bloco salta para o próximo", () => expect(ir(3, 0, 1, 0)).toEqual({ linha: 7, coluna: 0 }));
  it("sem nada pela frente vai até a borda", () => expect(ir(7, 0, 1, 0)).toEqual({ linha: 9, coluna: 0 }));
  it("para cima e para os lados", () => {
    expect(ir(9, 0, -1, 0)).toEqual({ linha: 7, coluna: 0 });
    expect(ir(0, 2, 0, -1)).toEqual({ linha: 0, coluna: 0 });
    expect(ir(0, 0, 0, -1)).toEqual({ linha: 0, coluna: 0 });
  });
  it("Ctrl+End acha a última usada", () => expect(ultimaUsada(preenchida, 10, 3)).toEqual({ linha: 7, coluna: 0 }));
});
