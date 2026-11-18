import { describe, expect, it } from "vitest";
import { deIntervalo } from "./address";
import type { Grade } from "./engine";
import { Planilha } from "./engine";
import { eixo } from "./grafico";

function grade(celulas: Record<string, string>, moeda: string[] = []): Grade {
  return {
    linhas: 20,
    colunas: 12,
    celulas: Object.fromEntries(Object.entries(celulas).map(([e, entrada]) => [e, { entrada, ...(moeda.includes(e[0]) && e.slice(1) !== "1" ? { formato: "moeda" as const } : {}) }])),
  };
}
const meses = grade({ A1: "Mês", B1: "2025", C1: "2026", A2: "Jan", B2: "100", C2: "150", A3: "Fev", B3: "120", C3: "90", A4: "Mar", B4: "80", C4: "" }, ["B", "C"]);

describe("gráficos: como o Excel lê o intervalo", () => {
  it("primeira coluna = categorias, primeira linha = séries; vazio vira lacuna; formato vem da origem", () => {
    const p = new Planilha(meses);
    const r = p.inserirGrafico("colunas", deIntervalo("A1:C4"));
    expect(r).toEqual({ ok: true, indice: 0 });
    expect(p.graficos()[0]).toMatchObject({ posicao: "E1", dados: "A1:C4" });
    expect(p.dadosDoGrafico(0)).toEqual({
      categorias: ["Jan", "Fev", "Mar"],
      series: [
        { nome: "2025", valores: [100, 120, 80] },
        { nome: "2026", valores: [150, 90, null] },
      ],
      formato: "moeda",
      erro: undefined,
    });
  });

  it("Alternar Linha/Coluna troca séries e categorias", () => {
    const p = new Planilha(meses);
    p.inserirGrafico("colunas", deIntervalo("A1:C4"));
    p.configurarGrafico(0, { ...p.graficos()[0], alternar: true });
    const d = p.dadosDoGrafico(0);
    expect(d.categorias).toEqual(["2025", "2026"]);
    expect(d.series.map((s) => s.nome)).toEqual(["Jan", "Fev", "Mar"]);
    expect(d.series[0].valores).toEqual([100, 150]);
  });

  it("pegadinha do ano: coluna de números com cabeçalho vira série; sem o cabeçalho, vira categoria", () => {
    const anos = grade({ A1: "Ano", B1: "Faturamento", A2: "2023", B2: "50", A3: "2024", B3: "70" });
    const p = new Planilha({ ...anos, celulas: { ...anos.celulas, A1: { entrada: "Ano", bloqueada: false } } });
    p.inserirGrafico("linhas", deIntervalo("A1:B3"));
    expect(p.dadosDoGrafico(0).categorias).toEqual(["1", "2"]);
    expect(p.dadosDoGrafico(0).series.map((s) => s.nome)).toEqual(["Ano", "Faturamento"]);
    p.definir("A1", "");
    expect(p.dadosDoGrafico(0).categorias).toEqual(["2023", "2024"]);
    expect(p.dadosDoGrafico(0).series).toEqual([{ nome: "Faturamento", valores: [50, 70] }]);
  });

  it("sem números é recusado; o gráfico acompanha a planilha; desfaz e restaura", () => {
    const p = new Planilha(grade({ A1: "Nome", A2: "Ana" }));
    expect(p.inserirGrafico("colunas", deIntervalo("A1:A2")).ok).toBe(false);
    const g = { ...meses, celulas: { ...meses.celulas, B2: { entrada: "100", bloqueada: false } } };
    const q = new Planilha(g);
    q.inserirGrafico("pizza", deIntervalo("A1:B4"));
    q.definir("B2", "300");
    expect(q.dadosDoGrafico(0).series[0].valores[0]).toBe(300);
    const salvo = JSON.parse(JSON.stringify(q.recursos()));
    const r = new Planilha(g);
    r.aplicarRecursos(salvo);
    expect(r.graficos()).toEqual(q.graficos());
    q.desfazer();
    q.desfazer();
    expect(q.graficos()).toEqual([]);
  });

  it("eixo com teto redondo", () => {
    expect(eixo(5100)).toEqual({ topo: 6000, passo: 2000 });
    expect(eixo(87)).toEqual({ topo: 100, passo: 20 });
    expect(eixo(0.42)).toEqual({ topo: 0.5, passo: 0.1 });
  });
});
