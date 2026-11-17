import { describe, expect, it } from "vitest";
import type { Grade } from "./engine";
import { Planilha, compararParaClassificar } from "./engine";
import { deIntervalo } from "./address";

/** Vendas: cabeçalho em negrito na linha 1, dados em A2:C7, total em C9. */
function vendas(extra: Partial<Grade> = {}): Grade {
  const linhas: [string, string, string][] = [
    ["Carla", "Sul", "300"],
    ["Ana", "Norte", "500"],
    ["Bruno", "Sul", "200"],
    ["Daniela", "Leste", "700"],
    ["Eduardo", "Sul", "100"],
    ["Fábio", "Norte", "400"],
  ];
  const celulas: Grade["celulas"] = {
    A1: { entrada: "Vendedor", negrito: true },
    B1: { entrada: "Região", negrito: true },
    C1: { entrada: "Valor", negrito: true },
  };
  linhas.forEach(([a, b, c], i) => {
    celulas[`A${i + 2}`] = { entrada: a };
    celulas[`B${i + 2}`] = { entrada: b };
    celulas[`C${i + 2}`] = { entrada: c, formato: "moeda" };
  });
  return { linhas: 12, colunas: 6, celulas, ...extra };
}

const coluna = (p: Planilha, letra: string, de = 2, ate = 7) =>
  Array.from({ length: ate - de + 1 }, (_, i) => p.valor(`${letra}${de + i}`));

describe("classificar", () => {
  it("ordena as linhas inteiras (dados bloqueados também) e mantém o cabeçalho", () => {
    const p = new Planilha(vendas());
    p.classificar({ intervalo: "A1:C7", chaves: [{ coluna: "A", ordem: "asc" }], cabecalho: true });
    expect(coluna(p, "A")).toEqual(["Ana", "Bruno", "Carla", "Daniela", "Eduardo", "Fábio"]);
    expect(coluna(p, "C")).toEqual([500, 200, 300, 700, 100, 400]);
    expect(p.valor("A1")).toBe("Vendedor");
    expect(p.formatoDe("C2")).toBe("moeda");
    expect(p.bloqueada("A2")).toBe(true);
  });

  it("decrescente por número e desempate pela segunda chave", () => {
    const p = new Planilha(vendas());
    p.classificar({ intervalo: "A1:C7", chaves: [{ coluna: "C", ordem: "desc" }], cabecalho: true });
    expect(coluna(p, "C")).toEqual([700, 500, 400, 300, 200, 100]);
    p.classificar({
      intervalo: "A1:C7",
      chaves: [
        { coluna: "B", ordem: "asc" },
        { coluna: "C", ordem: "asc" },
      ],
      cabecalho: true,
    });
    expect(coluna(p, "A")).toEqual(["Daniela", "Fábio", "Ana", "Eduardo", "Bruno", "Carla"]);
  });

  it("vazias vão para o fim nas duas ordens; números antes de textos", () => {
    expect(["b", null, 3, "a", 1].sort((a, b) => compararParaClassificar(a, b))).toEqual([1, 3, "a", "b", null]);
    expect(["b", null, 3, "a", 1].sort((a, b) => compararParaClassificar(a, b, true))).toEqual(["b", "a", 3, 1, null]);
  });

  it("fórmulas na linha acompanham a linha (referência relativa)", () => {
    const g = vendas();
    for (let l = 2; l <= 7; l++) g.celulas[`D${l}`] = { entrada: `=C${l}*2`, bloqueada: false };
    const p = new Planilha(g);
    p.classificar({ intervalo: "A1:D7", chaves: [{ coluna: "C", ordem: "asc" }], cabecalho: true });
    expect(p.bruto("D2")).toBe("=C2*2");
    expect(p.valor("D2")).toBe(200);
  });

  it("Ctrl+Z desfaz e Ctrl+Y refaz a classificação", () => {
    const p = new Planilha(vendas());
    p.classificar({ intervalo: "A1:C7", chaves: [{ coluna: "A", ordem: "desc" }], cabecalho: true });
    p.desfazer();
    expect(coluna(p, "A")[0]).toBe("Carla");
    expect(p.recursos()).toEqual({});
    p.refazer();
    expect(coluna(p, "A")[0]).toBe("Fábio");
  });

  it("adivinha o cabeçalho e a região atual", () => {
    const p = new Planilha(vendas());
    const regiao = p.regiaoAtual({ linha: 3, coluna: 1 });
    expect(regiao).toEqual(deIntervalo("A1:C7"));
    expect(p.pareceCabecalho(regiao)).toBe(true);
    expect(p.pareceCabecalho(deIntervalo("A2:C7"))).toBe(false);
  });
});

describe("filtro", () => {
  it("esconde as linhas que não passam e lista os valores da coluna", () => {
    const p = new Planilha(vendas());
    p.ligarFiltro(deIntervalo("A1:C7"));
    expect(p.valoresDaColuna(1)).toEqual(["Leste", "Norte", "Sul"]);
    p.filtrarColuna(1, ["Sul"]);
    expect(p.linhasVisiveis()).toEqual([2, 4, 6]);
    expect(p.linhaOculta(2)).toBe(true); // linha 3 da planilha (Ana, Norte)
    expect(p.totalDoFiltro()).toBe(6);
  });

  it("critério de número usa o texto como aparece (R$)", () => {
    const p = new Planilha(vendas());
    p.ligarFiltro(deIntervalo("A1:C7"));
    expect(p.valoresDaColuna(2)[0]).toMatch(/^R\$\s?100,00$/);
    p.filtrarColuna(2, [p.valoresDaColuna(2)[5]]);
    expect(p.linhasVisiveis()).toEqual([5]);
  });

  it("a lista de uma coluna respeita o filtro das outras", () => {
    const p = new Planilha(vendas());
    p.ligarFiltro(deIntervalo("A1:C7"));
    p.filtrarColuna(1, ["Norte"]);
    expect(p.valoresDaColuna(0)).toEqual(["Ana", "Fábio"]);
  });

  it("SUBTOTAL ignora as linhas filtradas; SOMA não", () => {
    const g = vendas();
    g.celulas.C9 = { entrada: "=SUBTOTAL(9;C2:C7)", bloqueada: false };
    g.celulas.D9 = { entrada: "=SOMA(C2:C7)", bloqueada: false };
    g.celulas.E9 = { entrada: "=SUBTOTAL(103;A2:A7)", bloqueada: false };
    const p = new Planilha(g);
    expect(p.valor("C9")).toBe(2200);
    p.ligarFiltro(deIntervalo("A1:C7"));
    p.filtrarColuna(1, ["Sul"]);
    expect(p.valor("C9")).toBe(600);
    expect(p.valor("D9")).toBe(2200);
    expect(p.valor("E9")).toBe(3);
    p.desfazer();
    expect(p.valor("C9")).toBe(2200);
  });

  it("SUBTOTAL: média, máximo e não soma outro SUBTOTAL", () => {
    const g = vendas();
    g.celulas.C8 = { entrada: "=SUBTOTAL(9;C2:C7)", bloqueada: false };
    g.celulas.C9 = { entrada: "=SUBTOTAL(9;C2:C8)", bloqueada: false };
    g.celulas.C10 = { entrada: "=SUBTOTAL(1;C2:C7)", bloqueada: false };
    g.celulas.C11 = { entrada: "=SUBTOTAL(4;C2:C7)", bloqueada: false };
    g.celulas.C12 = { entrada: "=SUBTOTAL(99;C2:C7)", bloqueada: false };
    const p = new Planilha(g);
    expect(p.valor("C9")).toBe(2200);
    expect(p.valor("C10")).toBeCloseTo(2200 / 6);
    expect(p.valor("C11")).toBe(700);
    expect(p.valor("C12")).toEqual({ erro: "#VALOR!" });
  });

  it("desligar o filtro mostra tudo de novo", () => {
    const p = new Planilha(vendas());
    p.ligarFiltro(deIntervalo("A1:C7"));
    p.filtrarColuna(1, ["Leste"]);
    p.desligarFiltro();
    expect(p.linhaOculta(2)).toBe(false);
    expect(p.filtroAtual()).toBeNull();
  });
});

describe("recursos: salvar e restaurar", () => {
  it("o que recursos() devolve recria o mesmo estado numa planilha nova", () => {
    const a = new Planilha(vendas());
    a.classificar({ intervalo: "A1:C7", chaves: [{ coluna: "C", ordem: "desc" }], cabecalho: true });
    a.ligarFiltro(deIntervalo("A1:C7"));
    a.filtrarColuna(1, ["Sul", "Norte"]);
    const salvo = JSON.parse(JSON.stringify(a.recursos()));

    const b = new Planilha(vendas());
    b.aplicarRecursos(salvo);
    expect(coluna(b, "A")).toEqual(coluna(a, "A"));
    expect(b.linhasVisiveis()).toEqual(a.linhasVisiveis());
    expect(b.recursos()).toEqual(a.recursos());
  });

  it("filtro inicial do exercício (grade.recursos) não conta como ação do aluno", () => {
    const p = new Planilha(
      vendas({ recursos: { filtro: { intervalo: "A1:C7", criterios: { B: { valores: ["Sul"] } } } } }),
    );
    expect(p.linhasVisiveis()).toEqual([2, 4, 6]);
    p.desfazer(); // nada para desfazer
    expect(p.linhasVisiveis()).toEqual([2, 4, 6]);
  });
});
