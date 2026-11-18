import { describe, expect, test } from "vitest";
import { exercicios } from "@/content";
import { partesTextoRico } from "./TextoRico";

const tipos = (t: string) => partesTextoRico(t).map((p) => [p.tipo, p.texto]);

describe("TextoRico", () => {
  test("itálico com um asterisco", () => {
    expect(tipos("Use *Classificar do Maior para o Menor* na guia.")).toEqual([
      ["texto", "Use "],
      ["italico", "Classificar do Maior para o Menor"],
      ["texto", " na guia."],
    ]);
    expect(tipos("*estável*")).toEqual([["italico", "estável"]]);
    expect(tipos("(*Soma de Valor*)")).toEqual([
      ["texto", "("],
      ["italico", "Soma de Valor"],
      ["texto", ")"],
    ]);
  });

  test("negrito e código continuam iguais", () => {
    expect(tipos("A **soma** de `=SOMA(B2:B7)`")).toEqual([
      ["texto", "A "],
      ["negrito", "soma"],
      ["texto", " de "],
      ["codigo", "=SOMA(B2:B7)"],
    ]);
  });

  test("asterisco escapado é literal, também dentro do negrito", () => {
    expect(tipos("Qual é o resultado de **=2+3\\*4**?")).toEqual([
      ["texto", "Qual é o resultado de "],
      ["negrito", "=2+3*4"],
      ["texto", "?"],
    ]);
    expect(tipos("um \\*asterisco\\* solto")).toEqual([["texto", "um *asterisco* solto"]]);
  });

  test("negrito e itálico na mesma frase", () => {
    expect(tipos("**Dados** > *Classificar*")).toEqual([
      ["negrito", "Dados"],
      ["texto", " > "],
      ["italico", "Classificar"],
    ]);
  });

  test("asterisco de multiplicação não vira itálico", () => {
    expect(tipos("`=B2*C2*D2`")).toEqual([["codigo", "=B2*C2*D2"]]);
    expect(tipos("2*3*4")).toEqual([["texto", "2*3*4"]]);
    expect(tipos("A1 * B1 * C1")).toEqual([["texto", "A1 * B1 * C1"]]);
    expect(tipos("multiplique com * e divida com /")).toEqual([["texto", "multiplique com * e divida com /"]]);
    expect(tipos("`=A1*2` e *Colar especial*")).toEqual([
      ["codigo", "=A1*2"],
      ["texto", " e "],
      ["italico", "Colar especial"],
    ]);
  });

  test("nenhum texto do conteúdo sobra com asterisco fora do código", () => {
    const sobras: string[] = [];
    for (const ex of exercicios) {
      const opcoes = ex.type === "multiple_choice" ? ex.opcoes.map((o) => o.texto) : [];
      const textos = [ex.intro ?? "", ...ex.enunciado, ...ex.dicas, ...ex.explicacao, ...opcoes];
      for (const t of textos)
        for (const p of partesTextoRico(t))
          if (p.tipo !== "codigo" && /(^|[\s(])\*+[^\s*]|[^\s*]\*+($|[\s).,:;])/.test(p.texto)) sobras.push(`${ex.slug}: ${p.texto}`);
    }
    expect(sobras).toEqual([]);
  });
});
