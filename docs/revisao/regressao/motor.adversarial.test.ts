import { describe, expect, it } from "vitest";
import { Planilha, Pasta, deslocarFormula, type Grade } from "@/engine/engine";
import { exercicios } from "@/content/index";
import type { ExercicioDoTipo } from "@/content/schema";
import { corrigir } from "@/grader/corrigir";
import { conferirQuestao } from "@/grader/conferir-teste";

const g = (celulas: Grade["celulas"], extra: Partial<Grade> = {}): Grade => ({ linhas: 12, colunas: 8, celulas, ...extra });

/** Simula Simulador.montar: recursos, depois conteúdos. */
function restaurar(grade: Grade, p: Planilha) {
  const salvo = { recursos: JSON.parse(JSON.stringify(p.recursos())), conteudos: p.conteudosDoAluno() };
  const q = new Planilha(grade);
  q.aplicarRecursos(salvo.recursos);
  q.definirVarias(Object.entries(salvo.conteudos).map(([endereco, bruto]) => ({ endereco, bruto })));
  q.limparHistorico();
  return q;
}
const tela = (p: Planilha) => {
  const out: string[] = [];
  for (let l = 0; l < p.linhas; l++) for (let c = 0; c < p.colunas; c++) out.push(p.exibicao({ linha: l, coluna: c }));
  return out;
};

describe("restauração", () => {
  it("R1: classificar por coluna digitada pelo aluno não se reproduz na restauração", () => {
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
    const q = restaurar(grade, p);
    expect(tela(q)).toEqual(tela(p));
  });

  it("R2: célula pré-preenchida apagada pelo aluno volta depois de classificar + recarregar", () => {
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
    const q = restaurar(grade, p);
    expect(q.valor("B4")).toBe(null);
  });

  it("R3: conteúdo do aluno onde a tabela dinâmica (que dava erro) passa a caber é perdido", () => {
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
    expect(p.tabelasDinamicas()[0].erro).not.toBe(null); // não cabe por causa de E3
    const q = restaurar(grade, p);
    expect(q.valor("E3")).toBe("minha anotação");
  });

  it("R4: classificar perde o tipo moeda digitado (R$) pelo aluno", () => {
    const grade = g({ A1: { entrada: "Nome", negrito: true }, B1: { entrada: "Valor", negrito: true }, A2: { entrada: "B" }, A3: { entrada: "A" } });
    const p = new Planilha(grade);
    p.definir("B2", "R$ 10,00");
    p.definir("B3", "R$ 5,00");
    const antes = p.exibicao("B2");
    p.classificar({ intervalo: "A1:B3", chaves: [{ coluna: "A", ordem: "desc" }], cabecalho: true }); // ordem não muda
    expect(p.exibicao("B2")).toBe(antes);
  });

  it("R5: Ctrl+Z na outra aba apaga o que a restauração gravou lá", () => {
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

  it("R6: recursos das outras abas não entram no progresso", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Jan", grade: g({ A1: { entrada: "x" }, A2: { entrada: "1" }, A3: { entrada: "2" } }) },
    ]);
    pasta.abas[1].ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 0 } });
    expect(JSON.stringify(pasta.abas[0].recursos())).toContain("A1:A3");
  });
});

describe("fórmulas / abas", () => {
  it("F1: copiar fórmula com aba citada que parece célula ('Vendas T1'!B2) corrompe o nome da aba", () => {
    expect(deslocarFormula("='VENDAS T1'!B2", 1, 0)).toBe("='VENDAS T1'!B3");
  });

  it("F1b: na Pasta, a fórmula copiada para baixo vira #REF!", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Vendas T1", grade: g({ B2: { entrada: "10" }, B3: { entrada: "20" } }) },
    ]);
    const p = pasta.abas[0];
    p.definir("A1", "='Vendas T1'!B2");
    p.preencher({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 0, coluna: 0 } }, { inicio: { linha: 0, coluna: 0 }, fim: { linha: 1, coluna: 0 } });
    expect(p.valor("A2")).toBe(20);
  });

  it("F2: aba chamada 'Ref' corrompe o literal #REF! em outra fórmula", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: g({}) },
      { nome: "Ref", grade: g({}) },
    ]);
    const p = pasta.abas[0];
    const r = p.definir("A1", "=SEERRO(1/0;#REF!)");
    expect(r.ok).toBe(true);
    expect(p.bruto("A1")).toBe("=SEERRO(1/0;#REF!)");
    expect(p.valor("A1")).toEqual({ erro: "#REF!" });
  });

  it("F3: LET com nome ligado a intervalo em funções que pedem referência", () => {
    const p = new Planilha(g({ A1: { entrada: "1" }, A2: { entrada: "2" }, A3: { entrada: "3" } }));
    p.definir("C1", "=LET(r;A1:A3;CONT.SE(r;\">1\"))");
    p.definir("C2", "=LET(r;A1:A3;SOMASE(r;\">1\"))");
    p.definir("C3", "=LET(r;A1:A3;SUBTOTAL(9;r))");
    expect([p.valor("C1"), p.valor("C2"), p.valor("C3")]).toEqual([2, 5, 6]);
  });

});

describe("correção", () => {
  const ferr = exercicios.filter((e): e is ExercicioDoTipo<"ferramenta"> => e.type === "ferramenta");
  it("G1: filtrar certo depois de classificar é recusado (linhasVisiveis compara número da linha)", () => {
    const ex = ferr.find((e) => e.slug === "dados-filtrar-regiao")!;
    const p = Planilha.deExercicio(ex);
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 9, coluna: 3 } });
    p.filtrarColuna(1, ["Sul"]);
    // Mostra exatamente as 4 vendas do Sul
    const visiveis = p.linhasVisiveis().map((l) => p.valor(`A${l}`));
    expect(new Set(visiveis)).toEqual(new Set(["Carla", "Bruno", "Eduardo", "Hugo"]));
    expect(corrigir(ex, p).falhas).toEqual([]);
  });

  it("G2: aceitariaNaCelula muda o tipo da célula (moeda vira número)", () => {
    const ex = ferr.find((e) => e.type === "ferramenta" && e.verificacoes.some((v) => v.tipo === "validacao"))!;
    const v = ex.verificacoes.find((x) => x.tipo === "validacao")! as { intervalo: string };
    const cel = v.intervalo.split(":")[0];
    const p = Planilha.deExercicio(ex);
    p.definir(cel, "R$ 3,00");
    const antes = p.tipo(cel);
    p.aceitariaNaCelula(cel, "5");
    expect(p.tipo(cel)).toBe(antes);
  });

});

describe("derivados", () => {
  it("D1: tabela dinâmica fica com o SUBTOTAL de antes do filtro (dinâmicas são recalculadas antes das linhas ocultas)", () => {
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
    // a linha "x" da dinâmica (G2/H2) deveria mostrar 40
    expect(p.valor("H2")).toBe(40);
  });

  it("D2: aceitariaNaCelula sobre a saída da dinâmica apaga o valor dela", () => {
    const p = new Planilha(g({ A1: { entrada: "Cat", negrito: true }, B1: { entrada: "Val", negrito: true }, A2: { entrada: "a" }, B2: { entrada: "10" } }));
    p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 1, coluna: 1 } }, { linha: 0, coluna: 3 });
    const d = p.tabelasDinamicas()[0].config;
    p.configurarDinamica(0, { ...d, linhas: ["A"], valores: [{ campo: "B", funcao: "soma" }] });
    const antes = p.valor("E2");
    p.aceitariaNaCelula("E2", "1");
    expect(p.valor("E2")).toBe(antes);
  });
});

describe("mensagens", () => {
  it("M1: verificação 'valores' fora de classificação fala em 'ordem pedida'", () => {
    const ex = exercicios.find((e) => e.slug === "validacao-lista-status-variacao-b")!;
    const p = Planilha.deExercicio(ex);
    p.definir("C2", "Cancelado");
    p.definir("C3", "Pago");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).not.toMatch(/ordem pedida/);
  });
  it("M1b: idem em validacao-dados-antigos (só valores errados, nada a classificar)", () => {
    const ex = exercicios.find((e) => e.slug === "validacao-dados-antigos")!;
    const p = Planilha.deExercicio(ex);
    p.definir("B3", "2");
    p.definir("B5", "1");
    p.definir("B7", "1");
    const r = corrigir(ex, p);
    expect(r.falhas.map((f) => f.mensagem).join(" ")).not.toMatch(/ordem pedida/);
  });
});

