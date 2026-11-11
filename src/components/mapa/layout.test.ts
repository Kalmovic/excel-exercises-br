import { describe, expect, it } from "vitest";
import { LARGURA, TAMANHO_TROFEU, calcularLayout } from "./layout";

describe("layout do mapa", () => {
  const l = calcularLayout([
    { slug: "intro", casas: 10, recolhida: false },
    { slug: "fundamentos", casas: 5, recolhida: false },
    { slug: "logica", casas: 4, recolhida: false },
  ]);

  it("uma casa por exercício e um troféu e um banner por região", () => {
    expect(l.casas).toHaveLength(19);
    expect(l.trofeus.map((t) => t.regiao)).toEqual(["intro", "fundamentos", "logica"]);
    expect(l.banners).toHaveLength(3);
  });

  it("o caminho desce sempre e fica dentro da largura", () => {
    const pontos = [...l.casas, ...l.trofeus].sort((a, b) => a.y - b.y);
    for (let i = 1; i < pontos.length; i++) expect(pontos[i].y).toBeGreaterThan(pontos[i - 1].y);
    for (const p of pontos) {
      expect(p.x).toBeGreaterThanOrEqual(TAMANHO_TROFEU / 2);
      expect(p.x).toBeLessThanOrEqual(LARGURA - TAMANHO_TROFEU / 2);
    }
  });

  it("o caminho liga tudo em sequência, inclusive entre regiões", () => {
    expect(l.trechos).toHaveLength(19 + 3 - 1);
    expect(l.trechos[9]).toMatchObject({ de: "intro#9", ate: "intro#trofeu" });
    expect(l.trechos[10]).toMatchObject({ de: "intro#trofeu", ate: "fundamentos#0" });
  });

  it("região recolhida mostra só banner e troféu e encurta o mapa", () => {
    const r = calcularLayout([
      { slug: "intro", casas: 10, recolhida: true },
      { slug: "fundamentos", casas: 5, recolhida: false },
    ]);
    expect(r.casas.every((c) => c.regiao === "fundamentos")).toBe(true);
    expect(r.altura).toBeLessThan(calcularLayout([
      { slug: "intro", casas: 10, recolhida: false },
      { slug: "fundamentos", casas: 5, recolhida: false },
    ]).altura);
  });
});
