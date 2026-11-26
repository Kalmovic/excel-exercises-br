import { describe, expect, it } from "vitest";
import { validarFerramenta } from "@/grader/validadores/ferramenta";
import type { ExercicioDoTipo, ValidacaoDados } from "@/content/schema";
import type { Grade } from "./engine";
import { Pasta, Planilha } from "./engine";

const g = (celulas: Record<string, string>, editaveis: string[] = []): Grade => ({
  linhas: 12,
  colunas: 8,
  celulas: Object.fromEntries(Object.entries(celulas).map(([e, entrada]) => [e, { entrada, ...(editaveis.includes(e) ? { bloqueada: false } : {}) }])),
});

describe("validação personalizada (fórmula)", () => {
  const pedidos = () => new Planilha(g({ A1: "Valor", B1: "Desconto", A2: "1000", A3: "500", A4: "200" }));
  const regra: ValidacaoDados = { intervalo: "B2:B4", permitir: "personalizado", formula: "=E(B2>=0;B2<=A2*10%)" };

  it("a fórmula é escrita para a primeira célula e anda junto, como copiar", () => {
    const p = pedidos();
    expect(p.adicionarValidacao(regra)).toEqual({ ok: true });
    expect(p.aceitariaNaCelula("B2", "100")).toBe(true);
    expect(p.aceitariaNaCelula("B2", "101")).toBe(false);
    expect(p.aceitariaNaCelula("B3", "50")).toBe(true);
    expect(p.aceitariaNaCelula("B3", "51")).toBe(false);
    expect(p.aceitariaNaCelula("B4", "-1")).toBe(false);
    expect(p.aceitariaNaCelula("B4", "abc")).toBe(false); // texto: a conta dá erro, e erro não passa
    expect(p.definir("B4", "").ok).toBe(true); // vazio sempre passa
    const r = p.definir("B4", "30");
    expect(r.ok === false && r.mensagem).toContain("Valor inválido");
  });

  it("número diferente de zero passa (CONT.SE para não repetir)", () => {
    const p = new Planilha(g({ A1: "Processo", A2: "001", A3: "002" }, ["A2", "A3", "A4"]));
    expect(p.adicionarValidacao({ intervalo: "A2:A10", permitir: "personalizado", formula: "=CONT.SE($A$2:$A$10;A2)=1" })).toEqual({ ok: true });
    expect(p.aceitariaNaCelula("A4", "003")).toBe(true);
    expect(p.aceitariaNaCelula("A4", "002")).toBe(false);
    expect(new Planilha(g({ A1: "x" })).adicionarValidacao({ intervalo: "A2:A3", permitir: "personalizado", formula: "=A2" })).toEqual({ ok: true });
  });

  it("recusa fórmula vazia, em inglês ou com erro de escrita", () => {
    const p = pedidos();
    expect(p.adicionarValidacao({ ...regra, formula: undefined }).ok).toBe(false);
    expect(p.adicionarValidacao({ ...regra, formula: "=AND(B2>0,B2<10)" }).ok).toBe(false);
    expect(p.adicionarValidacao({ ...regra, formula: "=E(B2>0;" }).ok).toBe(false);
  });
});

describe("estilo do alerta de erro", () => {
  const p = () => new Planilha(g({ A1: "Qtd" }));
  it("Parar recusa; Aviso e Informação recusam com alerta e gravam quando aceitos", () => {
    const parar = p();
    parar.adicionarValidacao({ intervalo: "A2:A5", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10" });
    const r = parar.definir("A2", "50");
    expect(r).toEqual({ ok: false, mensagem: expect.stringContaining("Valor inválido") });
    expect(parar.definir("A2", "50", { aceitarAlerta: true }).ok).toBe(false);

    for (const estilo of ["aviso", "informacao"] as const) {
      const x = p();
      x.adicionarValidacao({ intervalo: "A2:A5", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10", estilo, erro: { titulo: "Acima do normal", texto: "Confira a quantidade." } });
      const recusa = x.definir("A2", "50");
      expect(recusa).toEqual({ ok: false, mensagem: "Acima do normal: Confira a quantidade.", alerta: estilo });
      expect(x.valor("A2")).toBe(null);
      expect(x.definir("A2", "50", { aceitarAlerta: true }).ok).toBe(true);
      expect(x.valor("A2")).toBe(50);
      expect(x.celulasInvalidas()).toEqual(["A2"]); // fica fora da regra: Circular Dados Inválidos acha
      expect(x.aceitariaNaCelula("A3", "50")).toBe(false);
    }
  });

  it("a correção confere o estilo pedido", () => {
    const ex = {
      type: "ferramenta",
      verificacoes: [{ tipo: "validacao", intervalo: "A2:A5", aceita: ["5"], recusa: ["50"], alertaEstilo: "aviso" }],
    } as unknown as ExercicioDoTipo<"ferramenta">;
    const x = p();
    x.adicionarValidacao({ intervalo: "A2:A5", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10" });
    const r = validarFerramenta(ex, x);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("Aviso");
    x.adicionarValidacao({ intervalo: "A2:A5", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10", estilo: "aviso" });
    expect(validarFerramenta(ex, x).ok).toBe(true);
  });
});

describe("lista que vem de outra aba", () => {
  it("=Listas!$A$2:$A$5 lê os itens da aba Listas (vazios fora)", () => {
    const pasta = new Pasta([
      { nome: "Clientes", grade: g({ A1: "UF" }, ["A2"]) },
      { nome: "Listas", grade: g({ A1: "UF", A2: "SP", A3: "RJ", A4: "MG" }) },
    ]);
    const [clientes, listas] = pasta.abas;
    expect(clientes.adicionarValidacao({ intervalo: "A2:A9", permitir: "lista", fonte: "=Listas!$A$2:$A$5" })).toEqual({ ok: true });
    expect(clientes.itensDaLista("A2")).toEqual(["SP", "RJ", "MG"]);
    expect(clientes.aceitariaNaCelula("A2", "rj")).toBe(true);
    expect(clientes.aceitariaNaCelula("A2", "BA")).toBe(false);
    listas.definir("A5", "BA");
    expect(clientes.itensDaLista("A2")).toEqual(["SP", "RJ", "MG", "BA"]);
    expect(clientes.adicionarValidacao({ intervalo: "A2:A9", permitir: "lista", fonte: "=Outra!A2:A5" }).ok).toBe(false);
  });
});

describe("gráficos novos", () => {
  it("Colunas Empilhadas e Colunas e Linha leem os dados como os outros tipos", () => {
    const p = new Planilha(g({ A1: "Mês", B1: "Realizado", C1: "Meta", A2: "Jan", B2: "90", C2: "100", A3: "Fev", B3: "120", C3: "100" }));
    expect(p.inserirGrafico("combinado", { inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 2 } }).ok).toBe(true);
    expect(p.inserirGrafico("empilhadas", { inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 2 } }).ok).toBe(true);
    // Mesmos dados: o segundo tipo troca o gráfico que já existe, em vez de empilhar outro.
    expect(p.graficos().map((x) => x.tipo)).toEqual(["empilhadas"]);
    expect(p.dadosDoGrafico(0).series.map((s) => s.nome)).toEqual(["Realizado", "Meta"]);
  });

  it("explorar os tipos com os mesmos dados nunca bate no limite de 4 gráficos", () => {
    const p = new Planilha(g({ A1: "Mês", B1: "Vendas", A2: "Jan", B2: "10", A3: "Fev", B3: "20" }));
    const dados = { inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 1 } };
    for (const tipo of ["colunas", "barras", "linhas", "pizza", "empilhadas", "combinado", "colunas"] as const) {
      const r = p.inserirGrafico(tipo, dados);
      expect(r.ok).toBe(true);
      expect(r.indice).toBe(0);
    }
    expect(p.graficos()).toHaveLength(1);
    expect(p.graficos()[0].tipo).toBe("colunas");
  });

  it("o 5º gráfico com dados diferentes explica o limite e como liberar espaço", () => {
    const p = new Planilha(g({ A1: "a", B1: "1", A2: "b", B2: "2", A3: "c", B3: "3", A4: "d", B4: "4", A5: "e", B5: "5" }));
    for (let i = 0; i < 4; i++) expect(p.inserirGrafico("colunas", { inicio: { linha: i, coluna: 0 }, fim: { linha: i + 1, coluna: 1 } }).ok).toBe(true);
    const r = p.inserirGrafico("colunas", { inicio: { linha: 0, coluna: 0 }, fim: { linha: 4, coluna: 1 } });
    expect(r.ok || r.mensagem).toMatch(/Excluir gráfico/);
    const pos = p.graficos().map((x) => x.posicao);
    expect(new Set(pos).size).toBe(4);
  });
});

describe("motor: #CIRC! falso no cálculo antecipado", () => {
  it("total de subtotais logo abaixo não é referência circular", () => {
    for (const [end, f] of [["F7", "=SOMA(F2:F5)-SOMA(C2:C15)"], ["F7", "=SOMA(F2:F5)"], ["F17", "=SOMA(F2:F5)"]] as const) {
      const p = new Planilha(g({ C2: "5", C3: "7", F2: "=SOMA(C2:C15)", F3: "=C3*2", [end]: f }));
      expect(p.celulasCirculares(), f).toEqual([]);
      expect(p.valor(end), f).toBe(f.includes("-") ? 14 : 26);
    }
  });
  it("ciclo de verdade continua #CIRC!", () => {
    const p = new Planilha(g({ A1: "=B1+1", B1: "=SOMA(A1:A3)", C1: "=SOMA(D1:D4)" }));
    expect(p.valor("A1")).toEqual({ erro: "#CIRC!" });
    expect(p.valor("C1")).toBe(0);
  });
});

describe("tabela dinâmica nova", () => {
  it("a segunda tabela com os mesmos dados é sugerida ao lado da primeira, não em cima", () => {
    const p = new Planilha({ ...g({ A1: "Região", B1: "Valor", A2: "Sul", B2: "10", A3: "Norte", B3: "20" }), colunas: 12 });
    const origem = { inicio: { linha: 0, coluna: 0 }, fim: { linha: 2, coluna: 1 } };
    const d1 = p.destinoSugeridoDinamica(origem);
    expect(p.inserirDinamica(origem, d1).ok).toBe(true);
    const d2 = p.destinoSugeridoDinamica(origem);
    expect(d2).not.toEqual(d1);
    expect(p.inserirDinamica(origem, d2).ok).toBe(true);
    const r = p.inserirDinamica(origem, d1);
    expect(r.ok || r.mensagem).toMatch(/outra tabela dinâmica/);
  });
});
