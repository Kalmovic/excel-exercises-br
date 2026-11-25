import { describe, expect, it } from "vitest";
import type { Dinamica } from "@/content/schema";
import { marcarCampo, moverCampo, mudarMostrar } from "./dinamica-acoes";

const vazia: Dinamica = { origem: "A1:D7", destino: "F1", linhas: [], colunas: [], valores: [], filtros: [] };
const ok = (r: ReturnType<typeof moverCampo>) => {
  if ("erro" in r) throw new Error(r.erro);
  return r.config;
};

describe("painel de campos", () => {
  it("marcar: texto vai para Linhas, número para Valores com Soma, depois Colunas e Filtros", () => {
    let d = ok(marcarCampo(vazia, "C", false));
    d = ok(marcarCampo(d, "D", true));
    expect(d).toMatchObject({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }] });
    d = ok(marcarCampo(d, "A", false));
    expect(d.colunas).toEqual(["A"]);
    d = ok(marcarCampo(d, "B", false));
    expect(d.filtros).toEqual([{ campo: "B", valores: null }]);
    d = ok(marcarCampo(d, "C", false)); // desmarcar
    expect(d.linhas).toEqual([]);
  });

  it("texto arrastado para Valores conta; um campo não fica em Linhas e Colunas ao mesmo tempo", () => {
    let d = ok(moverCampo(vazia, "B", "valores", false));
    expect(d.valores).toEqual([{ campo: "B", funcao: "contagem" }]);
    d = ok(moverCampo(d, "C", "linhas", false));
    d = ok(moverCampo(d, "C", "colunas", false, { area: "linhas", indice: 0 }));
    expect(d).toMatchObject({ linhas: [], colunas: ["C"] });
  });

  it("limites: Colunas com mais de um valor é recusado", () => {
    const d = ok(moverCampo(ok(moverCampo(vazia, "D", "valores", true)), "B", "valores", false));
    expect("erro" in moverCampo(d, "A", "colunas", false)).toBe(true);
  });

  it("Mostrar Valores como: liga e desliga % do Total Geral só no campo escolhido", () => {
    const d = ok(moverCampo(ok(moverCampo(vazia, "D", "valores", true)), "D", "valores", true));
    const com = mudarMostrar(d, 1, "totalGeral");
    expect(com.valores).toEqual([{ campo: "D", funcao: "soma" }, { campo: "D", funcao: "soma", mostrar: "totalGeral" }]);
    expect(mudarMostrar(com, 1, null).valores).toEqual(d.valores);
  });
});
