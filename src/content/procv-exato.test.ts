/**
 * PROCV que precisa de busca exata: sem o 4º argumento (ou com VERDADEIRO/1)
 * ele faz busca aproximada e, com a tabela em ordem, pode até acertar o valor
 * por sorte. Esses exercícios têm um erro comum com `bloqueia: true`, que
 * reprova a fórmula mesmo com o valor certo (contrato com a F3).
 */
import { describe, expect, it } from "vitest";
import busca from "./modulos/busca.json";
import extrasBusca from "./extras/busca.json";
import abas from "./modulos/abas.json";
import texto from "./modulos/texto.json";
import { exercicios } from "./index";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const EXATOS = [
  "procv-preco-pelo-codigo-exato",
  "procv-preco-pelo-codigo-exato-variacao-a",
  "procv-preco-pelo-codigo-exato-variacao-b",
  "procv-preco-pelo-codigo-exato-pegadinha",
  "teste-busca-1",
  "procv-preco-pelo-codigo",
  "procv-seerro-nao-encontrado",
  "abas-procv-tabela-de-precos",
  "abas-procv-tabela-de-precos-pegadinha",
  "teste-abas-2",
  "abas-conferir-recebimentos-variacao-a",
  "abas-conferir-recebimentos-variacao-b",
  "abas-conferir-recebimentos-pegadinha",
  "arrumar-espacos-sobrando-pegadinha",
];

type Bruto = {
  slug: string;
  alvos?: { celula: string; solucaoReferencia: string }[];
  errosComuns?: { padrao: string; dica: string; bloqueia?: boolean }[];
};
// O JSON cru: o schema atual ainda descarta `bloqueia`.
const brutos = [...busca, ...extrasBusca, ...abas, ...texto] as unknown as Bruto[];
const normalizar = (s: string) => s.toUpperCase().replace(/\s+/g, "");

/** A solução de referência com o PROCV trocado: sem o 4º argumento, com VERDADEIRO e com 1. */
const formasAproximadas = (sol: string) =>
  [")", ";VERDADEIRO)", ";1)"].map((fim) => sol.replace(/;FALSO\)/i, fim));

describe("PROCV exato: erro comum que bloqueia a busca aproximada", () => {
  it.each(EXATOS)("%s", (slug) => {
    const ex = brutos.find((e) => e.slug === slug)!;
    expect(ex, slug).toBeDefined();
    const bloqueios = (ex.errosComuns ?? []).filter((e) => e.bloqueia === true);
    expect(bloqueios.length).toBeGreaterThan(0);
    const casa = (f: string) => bloqueios.some((b) => new RegExp(b.padrao, "i").test(normalizar(f)));
    for (const a of ex.alvos ?? []) {
      if (!/PROCV\(/i.test(a.solucaoReferencia)) continue;
      expect(casa(a.solucaoReferencia), a.solucaoReferencia).toBe(false);
      for (const f of formasAproximadas(a.solucaoReferencia)) expect(casa(f), f).toBe(true);
      // 4º argumento vazio: o Excel trata como FALSO (busca exata).
      expect(casa(a.solucaoReferencia.replace(/;FALSO\)/i, ";)"))).toBe(false);
    }
  });

  it("o padrão pega PROCV com função dentro e não pega PROCX nem os de faixa", () => {
    const { padrao } = brutos.find((e) => e.slug === "procv-preco-pelo-codigo-exato")!.errosComuns![0];
    const re = new RegExp(padrao, "i");
    expect(re.test(normalizar("=PROCV(ARRUMAR(F2);A2:C4;3)"))).toBe(true);
    expect(re.test(normalizar("=SEERRO(PROCV(A2;$E$2:$G$9;2);\"Não encontrado\")"))).toBe(true);
    expect(re.test(normalizar("=PROCV(F2; A2:C6; 3; verdadeiro)"))).toBe(true);
    expect(re.test(normalizar("=PROCV(ARRUMAR(F2);A2:C4;3;FALSO)"))).toBe(false);
    expect(re.test(normalizar("=PROCV(F2;A2:C6;3;0)"))).toBe(false);
    expect(re.test(normalizar("=PROCX(F2;A2:A6;C2:C6)"))).toBe(false);
  });

  it("=PROCV(F2;A2:C6;3) é recusado mesmo com o valor certo", () => {
    const ex = exercicios.find((e) => e.slug === "procv-preco-pelo-codigo-exato")!;
    const p = Planilha.deExercicio(ex);
    p.definir("G2", "=PROCV(F2;A2:C6;3)");
    expect(p.valor("G2")).toBe(149);
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("busca aproximada");
  });
});
