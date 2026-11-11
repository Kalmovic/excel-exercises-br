import { describe, expect, it } from "vitest";
import { ajustarLinha, larguraParaCaber, type CelulaDaLinha } from "./transbordo";

const medir = (t: string) => t.length * 7; // 7px por caractere
const cel = (texto: string, tipo: CelulaDaLinha["tipo"] = "texto", largura = 50): CelulaDaLinha => ({
  texto,
  tipo,
  vazia: texto === "",
  negrito: false,
  largura,
});

describe("texto longo e ####", () => {
  it("o que cabe fica como está", () => {
    expect(ajustarLinha([cel("Ana")], medir)).toEqual([{ texto: "Ana", larguraVisivel: 50 }]);
  });
  it("texto invade as vazias à direita só até caber", () => {
    const r = ajustarLinha([cel("Faturamento total"), cel(""), cel(""), cel("")], medir); // 119px
    expect(r[0].larguraVisivel).toBe(150);
  });
  it("para na primeira célula preenchida", () => {
    const r = ajustarLinha([cel("Faturamento total"), cel(""), cel("x")], medir);
    expect(r[0].larguraVisivel).toBe(100);
  });
  it("número que não cabe vira ####", () => {
    const r = ajustarLinha([cel("R$ 1.234.567,00", "numero")], medir);
    expect(r[0].texto).toBe("######"); // (50-8)/7 = 6
    expect(r[0].larguraVisivel).toBe(50);
  });
  it("número não invade a vizinha", () => {
    expect(ajustarLinha([cel("123456789", "numero"), cel("")], medir)[0].larguraVisivel).toBe(50);
  });
  it("largura para caber", () => {
    expect(larguraParaCaber([{ texto: "Faturamento", negrito: false }, { texto: "", negrito: false }], medir)).toBe(89);
    expect(larguraParaCaber([], medir)).toBe(40);
  });
});
