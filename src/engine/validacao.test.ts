import { describe, expect, it } from "vitest";
import type { ValidacaoDados } from "@/content/schema";
import { deIntervalo } from "./address";
import type { Grade } from "./engine";
import { Planilha } from "./engine";

const base = (): Grade => ({
  linhas: 12,
  colunas: 8,
  celulas: {
    A1: { entrada: "Qtd" },
    B1: { entrada: "Status" },
    A2: { entrada: "0", bloqueada: false },
    A3: { entrada: "50", bloqueada: false },
    F1: { entrada: "Depto" },
    F2: { entrada: "Vendas" },
    F3: { entrada: "RH" },
    F4: { entrada: "TI" },
  },
});

const com = (v: ValidacaoDados) => {
  const p = new Planilha(base());
  expect(p.adicionarValidacao(v)).toEqual({ ok: true });
  return p;
};

describe("validação de dados", () => {
  it("inteiro entre 1 e 100: recusa decimal, fora do limite e texto; vazio passa", () => {
    const p = com({ intervalo: "A2:A10", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "100" });
    expect(p.definir("A4", "37").ok).toBe(true);
    for (const x of ["0", "101", "2,5", "abc"]) expect(p.definir("A4", x).ok, x).toBe(false);
    expect(p.valor("A4")).toBe(37); // a recusa não grava
    expect(p.definir("A4", "").ok).toBe(true);
    const r = p.definir("A5", "500");
    expect(r.ok === false && r.mensagem).toContain("Valor inválido");
  });

  it("decimal com %, data a partir de, comprimento do texto", () => {
    const d = com({ intervalo: "C2:C9", permitir: "decimal", operador: "entre", valor1: "0%", valor2: "30%" });
    expect(d.aceitariaNaCelula("C2", "15%")).toBe(true);
    expect(d.aceitariaNaCelula("C2", "0,3")).toBe(true);
    expect(d.aceitariaNaCelula("C2", "31%")).toBe(false);
    const t = com({ intervalo: "D2:D9", permitir: "data", operador: "maiorIgual", valor1: "01/12/2026" });
    expect(t.aceitariaNaCelula("D2", "01/12/2026")).toBe(true);
    expect(t.aceitariaNaCelula("D2", "30/11/2026")).toBe(false);
    const c = com({ intervalo: "E2:E9", permitir: "comprimento", operador: "igual", valor1: "3" });
    expect(c.aceitariaNaCelula("E2", "ABC")).toBe(true);
    expect(c.aceitariaNaCelula("E2", "ABCD")).toBe(false);
  });

  it("lista: ponto e vírgula, ou intervalo; sem diferenciar maiúsculas", () => {
    const p = com({ intervalo: "B2:B9", permitir: "lista", fonte: "Pago;Pendente; Cancelado" });
    expect(p.itensDaLista("B3")).toEqual(["Pago", "Pendente", "Cancelado"]);
    expect(p.definir("B3", "pago").ok).toBe(true);
    expect(p.definir("B3", "Aprovado").ok).toBe(false);
    const q = com({ intervalo: "B2:B9", permitir: "lista", fonte: "=$F$2:$F$5" });
    expect(q.itensDaLista("B2")).toEqual(["Vendas", "RH", "TI"]);
    // vírgula não separa: vira um item só
    expect(com({ intervalo: "B2", permitir: "lista", fonte: "Sim,Não" }).itensDaLista("B2")).toEqual(["Sim,Não"]);
  });

  it("mensagem de erro personalizada", () => {
    const p = com({ intervalo: "A2:A10", permitir: "inteiro", operador: "menorIgual", valor1: "10", erro: { titulo: "Quantidade inválida", texto: "Use até 10." } });
    expect(p.definir("A5", "11")).toEqual({ ok: false, mensagem: "Quantidade inválida: Use até 10." });
  });

  it("não corrige o que já estava lá: Circular Dados Inválidos encontra", () => {
    const p = com({ intervalo: "A2:A10", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "100" });
    expect(p.celulasInvalidas()).toEqual(["A2"]);
    p.definir("A2", "1");
    expect(p.celulasInvalidas()).toEqual([]);
  });

  it("aplicar de novo substitui a regra das células; recusa configuração incompleta; desfaz e restaura", () => {
    const p = com({ intervalo: "A2:A10", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "100" });
    expect(p.adicionarValidacao({ intervalo: "A2:A10", permitir: "inteiro", operador: "entre", valor1: "1" }).ok).toBe(false);
    expect(p.adicionarValidacao({ intervalo: "B2:B9", permitir: "lista", fonte: " ; " }).ok).toBe(false);
    p.adicionarValidacao({ intervalo: "A1:A10", permitir: "decimal", operador: "maior", valor1: "0" });
    expect(p.validacoes()).toHaveLength(1);
    const salvo = JSON.parse(JSON.stringify(p.recursos()));
    const q = new Planilha(base());
    q.aplicarRecursos(salvo);
    expect(q.validacoes()).toEqual(p.validacoes());
    p.desfazer();
    expect(p.validacoes()[0].permitir).toBe("inteiro");
    p.limparValidacoes(deIntervalo("A5"));
    expect(p.validacoes()).toEqual([]);
  });
});
