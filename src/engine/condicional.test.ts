import { describe, expect, it } from "vitest";
import type { RegraCondicional } from "@/content/schema";
import { deIntervalo } from "./address";
import type { Grade } from "./engine";
import { Planilha } from "./engine";

/** Nome, Status, Valor em A1:C7. */
function base(): Grade {
  const dados: [string, string, number][] = [
    ["Ana", "Pago", 1200],
    ["Bruno", "Atrasado", 300],
    ["ana", "Pago", 1000],
    ["Carla", "Atrasado", 4500],
    ["Daniel", "Pendente", 1000],
    ["Eva", "Pago", 80],
  ];
  const celulas: Grade["celulas"] = { A1: { entrada: "Nome" }, B1: { entrada: "Status" }, C1: { entrada: "Valor" } };
  dados.forEach(([a, b, c], i) => {
    celulas[`A${i + 2}`] = { entrada: a };
    celulas[`B${i + 2}`] = { entrada: b };
    celulas[`C${i + 2}`] = { entrada: String(c), formato: "moeda" };
  });
  return { linhas: 12, colunas: 6, celulas };
}

const com = (...regras: RegraCondicional[]) => {
  const p = new Planilha(base());
  for (const r of regras) expect(p.adicionarRegra(r)).toEqual({ ok: true });
  return p;
};
const destacadas = (p: Planilha, int = "A2:C7") => p.destacadas(deIntervalo(int));

describe("formatação condicional", () => {
  it("maior que é estrito; o valor da regra aceita R$ e milhar", () => {
    expect(destacadas(com({ tipo: "maior", intervalo: "C2:C7", valor: "R$ 1.000", estilo: "verde" }))).toEqual(["C2", "C5"]);
    expect(destacadas(com({ tipo: "menor", intervalo: "C2:C7", valor: "500", estilo: "vermelho" }))).toEqual(["C3", "C7"]);
  });

  it("entre inclui as pontas; igual compara texto sem maiúsculas", () => {
    expect(destacadas(com({ tipo: "entre", intervalo: "C2:C7", valor: "1000", valor2: "1200", estilo: "amarelo" }))).toEqual(["C2", "C4", "C6"]);
    expect(destacadas(com({ tipo: "igual", intervalo: "B2:B7", valor: "atrasado", estilo: "vermelho" }))).toEqual(["B3", "B5"]);
  });

  it("texto que contém, duplicados (ANA = Ana) e exclusivos", () => {
    expect(destacadas(com({ tipo: "texto", intervalo: "B2:B7", valor: "pen", estilo: "amarelo" }))).toEqual(["B6"]);
    expect(destacadas(com({ tipo: "duplicados", intervalo: "A2:A7", estilo: "vermelho" }))).toEqual(["A2", "A4"]);
    expect(destacadas(com({ tipo: "unicos", intervalo: "C2:C7", estilo: "verde" }))).toEqual(["C2", "C3", "C5", "C7"]);
  });

  it("primeiros/últimos com empate no corte, e acima da média", () => {
    expect(destacadas(com({ tipo: "maiores", intervalo: "C2:C7", n: 3, estilo: "verde" }))).toEqual(["C2", "C4", "C5", "C6"]);
    expect(destacadas(com({ tipo: "acimaMedia", intervalo: "C2:C7", estilo: "verde" }))).toEqual(["C5"]);
  });

  it("fórmula relativa à primeira célula pinta a linha inteira com $", () => {
    const p = com({ tipo: "formula", intervalo: "A2:C7", formula: '=$B2="Atrasado"', estilo: "vermelho" });
    expect(destacadas(p)).toEqual(["A3", "B3", "C3", "A5", "B5", "C5"]);
    // sem o $, a coluna anda junto e a regra olha a coluna errada
    const q = com({ tipo: "formula", intervalo: "A2:C7", formula: '=B2="Atrasado"', estilo: "vermelho" });
    expect(destacadas(q)).toEqual(["A3", "A5"]);
  });

  it("fórmula inválida ou em inglês é recusada", () => {
    const p = new Planilha(base());
    expect(p.adicionarRegra({ tipo: "formula", intervalo: "A2:C7", formula: "=SUM(C2)>1", estilo: "verde" }).ok).toBe(false);
    expect(p.adicionarRegra({ tipo: "formula", intervalo: "A2:C7", formula: "=$C2>(", estilo: "verde" }).ok).toBe(false);
  });

  it("a mais nova vence no destaque; barras e escala convivem", () => {
    const p = com(
      { tipo: "maior", intervalo: "C2:C7", valor: "0", estilo: "verde" },
      { tipo: "menor", intervalo: "C2:C7", valor: "500", estilo: "vermelho" },
      { tipo: "barras", intervalo: "C2:C7" },
    );
    expect(p.estiloCondicional("C3")).toMatchObject({ destaque: "vermelho" });
    expect(p.estiloCondicional("C2")).toMatchObject({ destaque: "verde" });
    expect(p.estiloCondicional("C5")?.barra).toBe(1);
    expect(p.estiloCondicional("C7")?.barra).toBeCloseTo(80 / 4500);
    const e = com({ tipo: "escala", intervalo: "C2:C7" });
    expect(e.estiloCondicional("C7")?.escala).toBe("rgb(248,105,107)");
    expect(e.estiloCondicional("C5")?.escala).toBe("rgb(99,190,123)");
  });

  it("acompanha os valores, desfaz e restaura dos recursos salvos", () => {
    const g = base();
    g.celulas.C3 = { entrada: "300", bloqueada: false };
    const p = new Planilha(g);
    p.adicionarRegra({ tipo: "maior", intervalo: "C2:C7", valor: "1000", estilo: "verde" });
    expect(destacadas(p)).toEqual(["C2", "C5"]);
    p.definir("C3", "2000");
    expect(destacadas(p)).toEqual(["C2", "C3", "C5"]);
    const salvo = JSON.parse(JSON.stringify(p.recursos()));
    const q = new Planilha(g);
    q.aplicarRecursos(salvo);
    q.definir("C3", "2000");
    expect(destacadas(q)).toEqual(destacadas(p));
    p.desfazer(); // valor
    p.desfazer(); // regra
    expect(destacadas(p)).toEqual([]);
  });

  it("limpar regras da seleção tira só as que tocam nela", () => {
    const p = com({ tipo: "maior", intervalo: "C2:C7", valor: "0", estilo: "verde" }, { tipo: "duplicados", intervalo: "A2:A7", estilo: "vermelho" });
    p.limparRegras(deIntervalo("C4"));
    expect(p.regrasCondicionais().map((r) => r.tipo)).toEqual(["duplicados"]);
    p.limparRegras(null);
    expect(p.regrasCondicionais()).toEqual([]);
  });

  it("mover regra no Gerenciador muda quem pinta primeiro (a última da lista vale)", () => {
    const amarelo: RegraCondicional = { tipo: "maior", intervalo: "C2:C7", valor: "500", estilo: "amarelo" };
    const vermelho: RegraCondicional = { tipo: "maior", intervalo: "C2:C7", valor: "2000", estilo: "vermelho" };
    const p = com(vermelho, amarelo); // a amarela, mais nova, cobre a vermelha
    expect(p.estiloCondicional("C5")?.destaque).toBe("amarelo");
    p.moverRegra(0, 1); // a vermelha sobe
    expect(p.regrasCondicionais().map((r) => ("estilo" in r ? r.estilo : null))).toEqual(["amarelo", "vermelho"]);
    expect(p.estiloCondicional("C5")?.destaque).toBe("vermelho");
    expect(p.estiloCondicional("C2")?.destaque).toBe("amarelo");
    p.moverRegra(1, 1); // já é a primeira: nada muda
    expect(p.regrasCondicionais().map((r) => ("estilo" in r ? r.estilo : null))).toEqual(["amarelo", "vermelho"]);
    p.desfazer();
    expect(p.estiloCondicional("C5")?.destaque).toBe("amarelo");
  });
});
