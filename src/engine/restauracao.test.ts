/**
 * Regressão da revisão adversarial (docs/revisao/relatorios/adversarial.md):
 * restauração, classificação, abas e derivados.
 */
import { describe, expect, it } from "vitest";
import { Planilha, Pasta, deslocarFormula, type Grade } from "./engine";
import { recursosSchema } from "@/content/schema";

const g = (celulas: Grade["celulas"], extra: Partial<Grade> = {}): Grade => ({ linhas: 12, colunas: 8, celulas, ...extra });

/** O que o Simulador grava e depois restaura, passando por JSON (como no localStorage). */
function restaurar(grade: Grade, p: Planilha) {
  const salvo = JSON.parse(JSON.stringify({ recursos: p.recursos(), conteudos: p.conteudosDoAluno(), formatos: p.formatosDoAluno() }));
  expect(recursosSchema.safeParse(salvo.recursos).success).toBe(true);
  const q = new Planilha(grade);
  q.restaurarProgresso(salvo);
  return q;
}
const tela = (p: Planilha) => {
  const out: string[] = [];
  for (let l = 0; l < p.linhas; l++) for (let c = 0; c < p.colunas; c++) out.push(`${p.exibicao({ linha: l, coluna: c })}|${p.bloqueada({ linha: l, coluna: c })}`);
  return out;
};

describe("restauração (ponto único)", () => {
  it("R1: classificar por coluna digitada pelo aluno se reproduz", () => {
    const grade = g({
      A1: { entrada: "Nome", negrito: true },
      B1: { entrada: "Nota", negrito: true, bloqueada: true },
      A2: { entrada: "Ana" },
      A3: { entrada: "Bia" },
      A4: { entrada: "Caio" },
    });
    const p = new Planilha(grade);
    p.definir("B2", "3");
    p.definir("B3", "1");
    p.definir("B4", "2");
    p.classificar({ intervalo: "A1:B4", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    expect([p.valor("A2"), p.valor("B2")]).toEqual(["Bia", 1]);
    expect(tela(restaurar(grade, p))).toEqual(tela(p));
  });

  it("R2: célula pré-preenchida apagada pelo aluno não volta depois de classificar + recarregar", () => {
    const grade = g({
      A1: { entrada: "Nome", negrito: true },
      B1: { entrada: "Obs", negrito: true, bloqueada: true },
      A2: { entrada: "Caio" },
      B2: { entrada: "x", bloqueada: false },
      A3: { entrada: "Ana" },
      A4: { entrada: "Bia" },
    });
    const p = new Planilha(grade);
    expect(p.definir("B2", "").ok).toBe(true);
    p.classificar({ intervalo: "A1:B4", chaves: [{ coluna: "A", ordem: "asc" }], cabecalho: true });
    expect(p.valor("B4")).toBe(null);
    expect(restaurar(grade, p).valor("B4")).toBe(null);
  });

  it("R3: conteúdo do aluno onde a tabela dinâmica não cabia não é perdido", () => {
    const grade = g({
      A1: { entrada: "Região", negrito: true },
      B1: { entrada: "Valor", negrito: true },
      A2: { entrada: "Sul" },
      B2: { entrada: "10" },
      A3: { entrada: "Norte" },
      B3: { entrada: "5" },
    });
    const p = new Planilha(grade);
    p.definir("E3", "minha anotação");
    expect(p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 1 } }, { linha: 0, coluna: 4 }).ok).toBe(true);
    const d = p.tabelasDinamicas()[0].config;
    p.configurarDinamica(0, { ...d, linhas: ["A"], valores: [{ campo: "B", funcao: "soma" }] });
    expect(p.tabelasDinamicas()[0].erro).not.toBe(null);
    const q = restaurar(grade, p);
    expect(q.valor("E3")).toBe("minha anotação");
    expect(q.tabelasDinamicas()[0].erro).not.toBe(null);
  });

  it("R4: classificar não perde o tipo moeda (R$) nem os segundos da hora", () => {
    const grade = g({ A1: { entrada: "Nome", negrito: true }, B1: { entrada: "Valor", negrito: true }, A2: { entrada: "B" }, A3: { entrada: "A" } });
    const p = new Planilha(grade);
    p.definir("B2", "R$ 10,00");
    p.definir("B3", "08:30:15");
    const [b2, b3] = [p.exibicao("B2"), p.tipo("B3")];
    p.classificar({ intervalo: "A1:B3", chaves: [{ coluna: "A", ordem: "desc" }], cabecalho: true });
    expect(p.exibicao("B2")).toBe(b2);
    p.classificar({ intervalo: "A1:B3", chaves: [{ coluna: "A", ordem: "asc" }], cabecalho: true });
    expect(p.exibicao("B3")).toBe(b2);
    expect(p.tipo("B2")).toBe(b3);
    expect(p.valor("B2")).toBeCloseTo((8 * 3600 + 30 * 60 + 15) / 86400, 10);
    // E sobrevive a salvar e restaurar.
    const q = restaurar(grade, p);
    expect(q.exibicao("B3")).toBe(b2);
    expect(q.valor("B2")).toBeCloseTo((8 * 3600 + 30 * 60 + 15) / 86400, 10);
  });

  it("R5: Ctrl+Z na outra aba não apaga o que a restauração gravou lá", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Jan", grade: g({}) },
    ]);
    const p = pasta.abas[0];
    p.definirVarias([{ endereco: "Jan!A1", bruto: "salvo" }]);
    p.limparHistorico();
    pasta.abas[1].desfazer();
    expect(pasta.abas[1].valor("A1")).toBe("salvo");
  });

  it("R6: recursos e formatos das outras abas entram no progresso e voltam", () => {
    const folhas = () => [
      { nome: "Resumo", grade: g({}) },
      { nome: "Jan", grade: g({ A1: { entrada: "x" }, A2: { entrada: "1" }, A3: { entrada: "2" } }) },
    ];
    const pasta = new Pasta(folhas());
    pasta.abas[1].ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 0 } });
    pasta.abas[1].filtrarColuna(0, ["2"]);
    pasta.abas[1].formatar({ inicio: { linha: 1, coluna: 0 }, fim: { linha: 2, coluna: 0 } }, "moeda");
    const p = pasta.abas[0];
    expect(JSON.stringify(p.recursos())).toContain("A1:A3");
    expect(p.formatosDoAluno()).toMatchObject({ "Jan!A2": "moeda", "Jan!A3": "moeda" });
    const salvo = JSON.parse(JSON.stringify({ recursos: p.recursos(), conteudos: p.conteudosDoAluno(), formatos: p.formatosDoAluno() }));
    expect(recursosSchema.safeParse(salvo.recursos).success).toBe(true);
    const outra = new Pasta(folhas());
    outra.abas[0].restaurarProgresso(salvo);
    expect(outra.abas[1].linhaOculta(1)).toBe(true);
    expect(outra.abas[1].formatoDe("A3")).toBe("moeda");
  });

  it("S1: 31 classificações cabem no progresso (permutação composta)", () => {
    const grade = g({ A1: { entrada: "N", negrito: true }, A2: { entrada: "b" }, A3: { entrada: "a" }, A4: { entrada: "c" } });
    const p = new Planilha(grade);
    for (let i = 0; i < 31; i++) p.classificar({ intervalo: "A1:A4", chaves: [{ coluna: "A", ordem: i % 2 ? "asc" : "desc" }], cabecalho: true });
    const r = p.recursos();
    expect(r.permutacoes).toHaveLength(1);
    expect(recursosSchema.safeParse(r).success).toBe(true);
    expect(tela(restaurar(grade, p))).toEqual(tela(p));
  });

  it("progresso antigo (ordenacoes) continua sendo lido", () => {
    const grade = g({ A1: { entrada: "N", negrito: true }, A2: { entrada: "b" }, A3: { entrada: "a" } });
    const q = new Planilha(grade);
    q.restaurarProgresso({ conteudos: {}, recursos: { ordenacoes: [{ intervalo: "A1:A3", chaves: [{ coluna: "A", ordem: "asc" }], cabecalho: true }] } });
    expect(q.valor("A2")).toBe("a");
    expect(q.recursos().permutacoes).toEqual([{ intervalo: "A2:A3", ordem: [1, 0] }]);
  });

  it("Ctrl+Z desfaz a moeda com o tipo", () => {
    const p = new Planilha(g({}));
    p.definir("A1", "R$ 3,00");
    p.definir("A1", "7");
    p.desfazer();
    expect(p.tipo("A1")).toBe("NUMBER_CURRENCY");
    expect(p.conteudosDoAluno()).toEqual({ A1: "R$ 3" });
  });
});

describe("fórmulas e abas", () => {
  it("F1: copiar fórmula com aba citada que parece célula não corrompe o nome", () => {
    expect(deslocarFormula("='VENDAS T1'!B2", 1, 0)).toBe("='VENDAS T1'!B3");
  });

  it("F1b: na Pasta, a fórmula copiada para baixo funciona", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Vendas T1", grade: g({ B2: { entrada: "10" }, B3: { entrada: "20" } }) },
    ]);
    const p = pasta.abas[0];
    p.definir("A1", "='Vendas T1'!B2");
    p.preencher({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 0, coluna: 0 } }, { inicio: { linha: 0, coluna: 0 }, fim: { linha: 1, coluna: 0 } });
    expect(p.valor("A2")).toBe(20);
  });

  it("F2: aba chamada 'Ref' não corrompe o literal #REF!", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Ref", grade: g({}) },
    ]);
    const p = pasta.abas[0];
    expect(p.definir("A1", "=SEERRO(1/0;#REF!)").ok).toBe(true);
    expect(p.bruto("A1")).toBe("=SEERRO(1/0;#REF!)");
    expect(p.valor("A1")).toEqual({ erro: "#REF!" });
  });
});

describe("derivados", () => {
  it("D1: a tabela dinâmica vê o SUBTOTAL depois do filtro", () => {
    const p = new Planilha(
      g({
        A1: { entrada: "Cat", negrito: true }, B1: { entrada: "Val", negrito: true },
        A2: { entrada: "a" }, B2: { entrada: "10" },
        A3: { entrada: "b" }, B3: { entrada: "20" },
        A4: { entrada: "a" }, B4: { entrada: "30" },
        D1: { entrada: "K" }, E1: { entrada: "V" },
        D2: { entrada: "x" }, E2: { entrada: "=SUBTOTAL(9;B2:B4)" },
      }),
    );
    p.inserirDinamica({ inicio: { linha: 0, coluna: 3 }, fim: { linha: 1, coluna: 4 } }, { linha: 0, coluna: 6 });
    const d = p.tabelasDinamicas()[0].config;
    p.configurarDinamica(0, { ...d, linhas: ["D"], valores: [{ campo: "E", funcao: "soma" }] });
    p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 3, coluna: 1 } });
    p.filtrarColuna(0, ["a"]);
    expect(p.valor("E2")).toBe(40);
    expect(p.valor("H2")).toBe(40);
  });

  it("D2: aceitariaNaCelula sobre a saída da dinâmica não apaga o valor", () => {
    const p = new Planilha(g({ A1: { entrada: "Cat", negrito: true }, B1: { entrada: "Val", negrito: true }, A2: { entrada: "a" }, B2: { entrada: "10" } }));
    p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 1, coluna: 1 } }, { linha: 0, coluna: 3 });
    const d = p.tabelasDinamicas()[0].config;
    p.configurarDinamica(0, { ...d, linhas: ["A"], valores: [{ campo: "B", funcao: "soma" }] });
    const antes = p.valor("E2");
    p.aceitariaNaCelula("E2", "1");
    expect(p.valor("E2")).toBe(antes);
  });
});

describe("abas com apóstrofo", () => {
  it("A1: o nome de aba com apóstrofo no meio é aceito pelo schema e vai no progresso", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "D'Ávila", grade: g({}) },
    ]);
    pasta.abas[1].definir("A1", "5");
    expect(pasta.abas[0].conteudosDoAluno()).toHaveProperty(["D'Ávila!A1"], "5");
    expect(recursosSchema.safeParse({ abas: { "D'Ávila": {} } }).success).toBe(true);
    expect(recursosSchema.safeParse({ abas: { "'Ávila": {} } }).success).toBe(false);
  });
});
