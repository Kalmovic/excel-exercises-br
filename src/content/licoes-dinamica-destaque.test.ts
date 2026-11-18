/**
 * Lições 4 e 5 de Tabela dinâmica e Formatação condicional: o erro que cada
 * pegadinha prevê é recusado, e o caminho certo passa.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { Dinamica, ExercicioDoTipo, RegraCondicional } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const ex = (slug: string) => exercicios.find((e) => e.slug === slug) as ExercicioDoTipo<"ferramenta">;

const comDinamica = (slug: string, config: Partial<Dinamica>) => {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 16, coluna: 4 } }, { linha: 0, coluna: 6 });
  p.configurarDinamica(0, { ...p.tabelasDinamicas()[0].config, ...config });
  return corrigir(e, p);
};

const comRegras = (slug: string, regras: RegraCondicional[], excluirAntigas = false) => {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  if (excluirAntigas) while (p.regrasCondicionais().length) p.removerRegra(0);
  for (const r of regras) expect(p.adicionarRegra(r).ok).toBe(true);
  return corrigir(e, p);
};

describe("tabela dinâmica: Máx./Mín. e filtros com vários itens", () => {
  it("limite por despesa: Soma no lugar de Máx. é recusada", () => {
    const r = comDinamica("dinamica-maior-e-menor-pegadinha", { linhas: ["B"], valores: [{ campo: "E", funcao: "soma" }] });
    expect(r.falhas[0].mensagem).toContain("“Soma de Valor”");
    expect(comDinamica("dinamica-maior-e-menor-pegadinha", { linhas: ["B"], valores: [{ campo: "E", funcao: "max" }] }).ok).toBe(true);
  });

  it("todas menos Software: marcar só Software é recusado", () => {
    const base = { linhas: ["B"], valores: [{ campo: "E", funcao: "soma" as const }] };
    const so = comDinamica("dinamica-filtro-varios-itens-pegadinha", { ...base, filtros: [{ campo: "C", valores: ["Software"] }] });
    expect(so.falhas[0].mensagem).toContain("O filtro de Categoria");
    const certo = comDinamica("dinamica-filtro-varios-itens-pegadinha", { ...base, filtros: [{ campo: "C", valores: ["Viagem", "Material"] }] });
    expect(certo.ok).toBe(true);
  });

  it("vários itens: só um dos meses não passa", () => {
    const r = comDinamica("dinamica-filtro-varios-itens", { linhas: ["B"], valores: [{ campo: "E", funcao: "soma" }], filtros: [{ campo: "A", valores: ["Jan"] }] });
    expect(r.ok).toBe(false);
  });
});

describe("formatação condicional: prazos e texto que contém", () => {
  it("prazo em branco: a regra sem checar o vazio pinta linhas a mais", () => {
    const r = comRegras("destaque-prazos-vencidos-pegadinha", [{ tipo: "formula", intervalo: "A2:D11", formula: "=$D2<$G$1", estilo: "vermelho" }]);
    expect(r.falhas[0].mensagem).toContain("8 células destacadas que não deveriam");
  });

  it("prazos vencidos: Menor do que é estrito (o prazo de hoje não vence)", () => {
    const r = comRegras("destaque-prazos-vencidos", [{ tipo: "menor", intervalo: "D2:D11", valor: "19/11/2026", estilo: "vermelho" }]);
    expect(r.ok).toBe(false);
  });

  it("texto que contém: É Igual a não acha a palavra no meio da frase", () => {
    const r = comRegras("destaque-texto-contem", [{ tipo: "igual", intervalo: "C2:C11", valor: "trabalhista", estilo: "amarelo" }]);
    expect(r.ok).toBe(false);
  });

  it("regra do colega: criar a certa sem excluir a antiga não passa; excluindo, passa", () => {
    const certa: RegraCondicional = { tipo: "igual", intervalo: "B2:B11", valor: "Ana Lima", estilo: "amarelo" };
    expect(comRegras("destaque-texto-contem-pegadinha", [certa]).falhas[0].mensagem).toContain("2 células destacadas que não deveriam");
    expect(comRegras("destaque-texto-contem-pegadinha", [certa], true).ok).toBe(true);
  });
});
