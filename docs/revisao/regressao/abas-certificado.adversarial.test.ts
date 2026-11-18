import { describe, expect, it } from "vitest";
import { exercicios } from "@/content/index";
import { Planilha, Pasta, type Grade } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { conferirQuestao } from "@/grader/conferir-teste";
import { recursosSchema } from "@/content/schema";

const ex = (slug: string) => exercicios.find((e) => e.slug === slug)!;

describe("abas na correção", () => {
  it("A1: o servidor ignora células do aluno em aba com apóstrofo no nome", () => {
    const pasta = new Pasta([
      { nome: "Resumo", grade: { linhas: 5, colunas: 3, celulas: {} } as Grade },
      { nome: "D'Ávila", grade: { linhas: 5, colunas: 3, celulas: {} } as Grade },
    ]);
    pasta.abas[1].definir("A1", "5");
    const c = pasta.abas[0].conteudosDoAluno();
    expect(Object.keys(c)).toContain("D'Ávila!A1");
    // ENDERECO_COM_ABA = /^(?:[^:\\/?*[\]!']{1,31}!)?.../ — o apóstrofo fica de fora
    expect(/^(?:[^:\\/?*[\]!']{1,31}!)?[A-Z]{1,2}[1-9]\d{0,2}$/.test("D'Ávila!A1")).toBe(true);
  });
});

describe("limites do schema contra o que a tela produz", () => {
  it("S1: mais de 30 classificações invalida TODOS os recursos (certificado recusa o pedido)", () => {
    const e = ex("dados-classificar-maior-valor");
    const p = Planilha.deExercicio(e);
    const sol = (e as { solucao: { recursos: { ordenacoes: unknown[] } } }).solucao.recursos.ordenacoes[0] as never;
    for (let i = 0; i < 31; i++) p.classificar(sol);
    expect(corrigir(e, p).ok).toBe(true);
    expect(recursosSchema.safeParse(p.recursos()).success).toBe(true);
  });

  it("S2: regra de destaque com valor > 100 caracteres sai da tela mas o schema recusa", () => {
    const p = new Planilha({ linhas: 5, colunas: 3, celulas: { A1: { entrada: "x" } } } as Grade);
    const r = p.adicionarRegra({ tipo: "texto", intervalo: "A1:A3", valor: "a".repeat(101), estilo: "vermelho" });
    expect(r.ok).toBe(true);
    expect(recursosSchema.safeParse(p.recursos()).success).toBe(true);
  });
});
