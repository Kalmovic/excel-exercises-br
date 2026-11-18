import { describe, expect, it } from "vitest";
import type { Grade } from "./engine";
import { Pasta, Planilha, deslocarFormula } from "./engine";
import { analisar } from "./motor/parser";
import { referenciasDaFormula } from "./referencias";

const g = (celulas: Record<string, string>, editaveis: string[] = []): Grade => ({
  linhas: 10,
  colunas: 6,
  celulas: Object.fromEntries(Object.entries(celulas).map(([e, entrada]) => [e, { entrada, ...(editaveis.includes(e) ? { bloqueada: false } : {}) }])),
});

function pasta() {
  return new Pasta([
    { nome: "Resumo", grade: g({ A1: "Total" }) },
    { nome: "Vendas", grade: g({ A1: "Mês", B1: "Valor", A2: "Jan", B2: "100", A3: "Fev", B3: "250", A4: "Mar", B4: "50" }, ["B4"]) },
    { nome: "Base 2024", grade: g({ A1: "Código", B1: "Preço", A2: "X1", B2: "9,5", A3: "Y2", B3: "12" }) },
  ]);
}

describe("várias abas", () => {
  it("o parser lê Aba!A1, 'Aba com espaço'!A1:B2 e o nome dentro de funções", () => {
    expect(analisar("=Vendas!B2")).toEqual({ t: "ref", l: 1, c: 1, aba: "Vendas" });
    expect(analisar("='Base 2024'!A1:B2")).toMatchObject({ t: "int", aba: "Base 2024" });
    expect(analisar("=SOMA(Vendas!B2:B4)+B1")).toMatchObject({ t: "bin", a: { t: "fn", args: [{ t: "int", aba: "Vendas" }] }, b: { t: "ref" } });
  });

  it("fórmula lê outra aba; nome sem diferenciar maiúsculas; aba inexistente dá #REF!", () => {
    const [resumo] = pasta().abas;
    resumo.definir("B1", "=SOMA(Vendas!B2:B4)");
    expect(resumo.valor("B1")).toBe(400);
    resumo.definir("B2", `=PROCV("Y2";'Base 2024'!A2:B3;2;FALSO)`);
    expect(resumo.valor("B2")).toBe(12);
    resumo.definir("B3", "=vendas!B3*2");
    expect(resumo.valor("B3")).toBe(500);
    resumo.definir("B4", "=Compras!A1");
    expect(resumo.valor("B4")).toEqual({ erro: "#REF!" });
  });

  it("mudar uma aba recalcula e avisa a outra", () => {
    const p = pasta();
    const [resumo, vendas] = p.abas;
    resumo.definir("B1", "=SOMA(Vendas!B2:B4)");
    let avisos = 0;
    resumo.subscribe(() => avisos++);
    vendas.definir("B4", "150");
    expect(resumo.valor("B1")).toBe(500);
    expect(avisos).toBeGreaterThan(0);
  });

  it("copiar a fórmula anda a célula e mantém a aba", () => {
    expect(deslocarFormula("=Vendas!B2*$C$1", 1, 0)).toBe("=Vendas!B3*$C$1");
    expect(deslocarFormula("=SOMA('Base 2024'!B2:B3)", 0, 1)).toBe("=SOMA('Base 2024'!C2:C3)");
    const refs = referenciasDaFormula("=Vendas!B2+B2+Q1!A1");
    expect(refs.map((r) => [r.aba, r.texto])).toEqual([
      ["Vendas", "B2"],
      [undefined, "B2"],
      ["Q1", "A1"],
    ]);
  });

  it("progresso: as outras abas entram com o nome na frente e voltam para o lugar certo", () => {
    const p = pasta();
    const [resumo, vendas] = p.abas;
    resumo.definir("B1", "=Vendas!B4");
    vendas.definir("B4", "70");
    const salvo = resumo.conteudosDoAluno();
    expect(salvo).toEqual({ B1: "=Vendas!B4", "Vendas!B4": "70" });
    resumo.definir("C1", "='base 2024'!b2+vendas!b2");
    expect(resumo.bruto("C1")).toBe("='Base 2024'!B2+Vendas!B2");
    const outra = pasta().abas[0];
    outra.definirVarias(Object.entries(salvo).map(([endereco, bruto]) => ({ endereco, bruto })));
    expect(outra.valor("B1")).toBe(70);
    expect(outra.bloqueada("Vendas!B2")).toBe(true);
    expect(outra.bloqueada("Vendas!B4")).toBe(false);
    expect(outra.bloqueada("Inexistente!A1")).toBe(true);
  });

  it("deGrades sem abas é a Planilha de sempre", () => {
    const p = Planilha.deGrades(g({ A1: "1" }), undefined);
    expect(p.pasta).toBeUndefined();
    expect(p.valor("A1")).toBe(1);
  });
});

describe("diagnóstico de aba com espaço", () => {
  it("explica as aspas simples", async () => {
    const { diagnosticarSintaxe } = await import("./formula");
    expect(diagnosticarSintaxe("=SOMA(Vendas 2025!B2:B6)")).toBe("Nome de aba com espaço vai entre aspas simples: 'Vendas 2025'!");
  });
});

describe("pegadinhas do módulo de abas", () => {
  it("PROCV copiado sem $ na tabela da outra aba é recusado, com a dica do $", async () => {
    const { exercicios } = await import("@/content");
    const { corrigir } = await import("@/grader/corrigir");
    const ex = exercicios.find((e) => e.slug === "abas-procv-tabela-de-precos-pegadinha")!;
    const p = Planilha.deExercicio(ex);
    p.definir("C2", "=PROCV(A2;Preços!A2:B6;2;FALSO)");
    p.preencher({ inicio: { linha: 1, coluna: 2 }, fim: { linha: 1, coluna: 2 } }, { inicio: { linha: 2, coluna: 2 }, fim: { linha: 5, coluna: 2 } });
    expect(p.bruto("C6")).toBe("=PROCV(A6;Preços!A6:B10;2;FALSO)");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas.map((f) => f.mensagem).join(" ")).toContain("Trave o intervalo da outra aba");
  });

  it("fevereiro com uma linha a mais: B2:B6 deixa o Fábio de fora", async () => {
    const { exercicios } = await import("@/content");
    const { corrigir } = await import("@/grader/corrigir");
    const ex = exercicios.find((e) => e.slug === "abas-resumo-trimestre-pegadinha")!;
    const p = Planilha.deExercicio(ex);
    for (const [c, f] of [["B2", "=SOMA(Jan!B2:B6)"], ["B3", "=SOMA(Fev!B2:B6)"], ["B4", "=SOMA(Mar!B2:B6)"], ["B5", "=SOMA(B2:B4)"]]) p.definir(c, f);
    const r = corrigir(ex, p);
    expect(r.falhas.find((f) => f.celula === "B3")?.mensagem).toContain("aba Fev");
  });
});
