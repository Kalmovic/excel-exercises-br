import { describe, expect, it } from "vitest";
import type { Dinamica } from "@/content/schema";
import { deIntervalo } from "./address";
import type { Grade } from "./engine";
import { Planilha } from "./engine";

/** Canal, Vendedor, Região, Valor em A1:D7; a tabela dinâmica vai para F1. */
function base(recursos?: Grade["recursos"]): Grade {
  const dados: [string, string, string, number][] = [
    ["Loja", "Ana", "Sul", 300],
    ["Site", "Bruno", "Norte", 500],
    ["Loja", "Ana", "Sul", 200],
    ["Site", "Carla", "Leste", 700],
    ["Loja", "Bruno", "Norte", 100],
    ["Site", "Ana", "Sul", 400],
  ];
  const celulas: Grade["celulas"] = {
    A1: { entrada: "Canal", negrito: true },
    B1: { entrada: "Vendedor", negrito: true },
    C1: { entrada: "Região", negrito: true },
    D1: { entrada: "Valor", negrito: true },
  };
  dados.forEach(([a, b, c, d], i) => {
    celulas[`A${i + 2}`] = { entrada: a };
    celulas[`B${i + 2}`] = { entrada: b };
    celulas[`C${i + 2}`] = { entrada: c };
    celulas[`D${i + 2}`] = { entrada: String(d), formato: "moeda" };
  });
  return { linhas: 20, colunas: 12, celulas, recursos };
}

const cfg = (x: Partial<Dinamica> = {}): Dinamica => ({
  origem: "A1:D7",
  destino: "F1",
  linhas: [],
  colunas: [],
  valores: [],
  filtros: [],
  ...x,
});

/** Lê a área da tabela dinâmica como matriz de valores. */
function matriz(p: Planilha, i = 0) {
  const { area } = p.tabelasDinamicas()[i];
  return Array.from({ length: area.fim.linha - area.inicio.linha + 1 }, (_, l) =>
    Array.from({ length: area.fim.coluna - area.inicio.coluna + 1 }, (_, c) => p.valor({ linha: area.inicio.linha + l, coluna: area.inicio.coluna + c })),
  );
}

describe("tabela dinâmica", () => {
  it("inserir: quadro vazio, sem células, e o destino precisa estar livre", () => {
    const p = new Planilha(base());
    expect(p.inserirDinamica(deIntervalo("A1:D7"), { linha: 0, coluna: 1 }).ok).toBe(false); // dentro da origem
    expect(p.inserirDinamica(deIntervalo("A1:D7"), { linha: 0, coluna: 5 })).toEqual({ ok: true });
    const [t] = p.tabelasDinamicas();
    expect(t.vazia).toBe(true);
    expect(p.valor("F1")).toBeNull();
    expect(p.camposDaDinamica(0).map((c) => [c.nome, c.numerico])).toEqual([
      ["Canal", false],
      ["Vendedor", false],
      ["Região", false],
      ["Valor", true],
    ]);
  });

  it("Linhas + Soma: rótulos, itens em ordem, Total Geral e formato de moeda", () => {
    const p = new Planilha(base());
    p.inserirDinamica(deIntervalo("A1:D7"), { linha: 0, coluna: 5 });
    p.configurarDinamica(0, cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }] }));
    expect(matriz(p)).toEqual([
      ["Rótulos de Linha", "Soma de Valor"],
      ["Leste", 700],
      ["Norte", 600],
      ["Sul", 900],
      ["Total Geral", 2200],
    ]);
    expect(p.exibicao("G2")).toMatch(/^R\$\s?700,00$/);
    expect(p.negrito("F5")).toBe(true);
    expect(p.bloqueada("G3")).toBe(true);
    expect(p.definir("G3", "1").ok).toBe(false);
    expect(Object.keys(p.conteudos()).filter((e) => /^[FG]/.test(e))).toEqual([]); // a saída não vai para o progresso
  });

  it("várias contas em Valores: contagem sem formato, média", () => {
    const p = new Planilha(base({ dinamicas: [cfg({ linhas: ["B"], valores: [{ campo: "D", funcao: "soma" }, { campo: "B", funcao: "contagem" }, { campo: "D", funcao: "media" }] })] }));
    expect(matriz(p)).toEqual([
      ["Rótulos de Linha", "Soma de Valor", "Contagem de Vendedor", "Média de Valor"],
      ["Ana", 900, 3, 300],
      ["Bruno", 600, 2, 300],
      ["Carla", 700, 1, 700],
      ["Total Geral", 2200, 6, 2200 / 6],
    ]);
    expect(p.formatoDe("H2")).toBeUndefined();
  });

  it("Colunas: tabela cruzada com vazio onde não há venda", () => {
    const p = new Planilha(base({ dinamicas: [cfg({ linhas: ["C"], colunas: ["A"], valores: [{ campo: "D", funcao: "soma" }] })] }));
    expect(matriz(p)).toEqual([
      ["Soma de Valor", "Rótulos de Coluna", null, null],
      ["Rótulos de Linha", "Loja", "Site", "Total Geral"],
      ["Leste", null, 700, 700],
      ["Norte", 100, 500, 600],
      ["Sul", 500, 400, 900],
      ["Total Geral", 600, 1600, 2200],
    ]);
  });

  it("Filtros: linha de cima com o item escolhido e a tabela só com ele", () => {
    const p = new Planilha(base({ dinamicas: [cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }], filtros: [{ campo: "A", valores: ["Site"] }] })] }));
    expect(matriz(p)).toEqual([
      ["Canal", "Site"],
      [null, null],
      ["Rótulos de Linha", "Soma de Valor"],
      ["Leste", 700],
      ["Norte", 500],
      ["Sul", 400],
      ["Total Geral", 1600],
    ]);
    p.configurarDinamica(0, cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }], filtros: [{ campo: "A", valores: null }] }));
    expect(p.valor("G1")).toBe("(Tudo)");
  });

  it("fórmula pode ler a tabela dinâmica; Ctrl+Z desfaz a configuração", () => {
    const g = base();
    g.celulas.F12 = { entrada: "=G4/G5", bloqueada: false };
    const p = new Planilha(g);
    p.inserirDinamica(deIntervalo("A1:D7"), { linha: 0, coluna: 5 });
    p.configurarDinamica(0, cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }] }));
    expect(p.valor("F12")).toBeCloseTo(900 / 2200);
    p.desfazer();
    expect(p.tabelasDinamicas()[0].vazia).toBe(true);
    expect(p.valor("G4")).toBeNull();
    p.desfazer();
    expect(p.tabelasDinamicas()).toEqual([]);
  });

  it("não cabe: dados no caminho viram erro, sem escrever nada", () => {
    const g = base();
    g.celulas.F4 = { entrada: "nota", bloqueada: false };
    const p = new Planilha(g);
    p.inserirDinamica(deIntervalo("A1:D7"), { linha: 0, coluna: 5 });
    p.configurarDinamica(0, cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }] }));
    expect(p.tabelasDinamicas()[0].erro).toContain("F4");
    expect(p.valor("F1")).toBeNull();
  });

  it("recursos: salvar e restaurar, inclusive remover a que o exercício trazia", () => {
    const inicial = base({ dinamicas: [cfg({ linhas: ["C"], valores: [{ campo: "D", funcao: "soma" }] })] });
    const a = new Planilha(inicial);
    a.removerDinamica(0);
    const salvo = JSON.parse(JSON.stringify(a.recursos()));
    expect(salvo).toEqual({ dinamicas: [] });
    const b = new Planilha(inicial);
    b.aplicarRecursos(salvo);
    expect(b.tabelasDinamicas()).toEqual([]);

    const c = new Planilha(base());
    c.inserirDinamica(deIntervalo("A1:D7"), { linha: 9, coluna: 0 });
    c.configurarDinamica(0, cfg({ destino: "A10", linhas: ["A"], valores: [{ campo: "D", funcao: "max" }] }));
    const d = new Planilha(base());
    d.aplicarRecursos(JSON.parse(JSON.stringify(c.recursos())));
    expect(matriz(d)).toEqual(matriz(c));
  });
});
