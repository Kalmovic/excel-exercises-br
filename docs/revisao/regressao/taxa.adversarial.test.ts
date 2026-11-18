import { describe, expect, it } from "vitest";
import { Planilha, type Grade } from "@/engine/engine";

const p0 = () =>
  new Planilha({
    linhas: 12,
    colunas: 8,
    celulas: {
      A1: { entrada: "1" }, A2: { entrada: "=1/0" }, A3: { entrada: "3" }, A4: { entrada: "10" }, A5: { entrada: "" },
      B1: { entrada: "10" }, B2: { entrada: "20" }, B3: { entrada: "30" },
      C1: { entrada: "maçã" }, C2: { entrada: "banana" }, C3: { entrada: "" },
    },
  } as Grade);

const casos: [string, unknown][] = [
  ["=TAXA(10;-100;1000)", 0],
];

describe("funções novas contra o Excel", () => {
  it.each(casos)("%s", (f, esperado) => {
    const p = p0();
    const r = p.definir("H1", f);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const v = p.valor("H1");
    if (typeof esperado === "number") expect(v as number).toBeCloseTo(esperado, 4);
    else expect(v).toEqual(esperado);
  });
});
