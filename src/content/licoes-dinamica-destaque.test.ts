/**
 * Lições 4 e 5 de Tabela dinâmica e Formatação condicional: o erro que cada
 * pegadinha prevê é recusado, e o caminho certo passa.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { Dinamica, ExercicioDoTipo, RegraCondicional } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { deEndereco, deIntervalo } from "@/engine/address";

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

/** Configura a tabela dinâmica que o exercício já traz (ou insere uma em `destino`). */
const ajustarDinamica = (slug: string, config: Partial<Dinamica>, destino = "H1") => {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  if (p.tabelasDinamicas().length === 0) {
    const origem = e.verificacoes.find((v) => v.tipo === "dinamica")!.origem;
    expect(p.inserirDinamica(deIntervalo(origem), deEndereco(destino)).ok).toBe(true);
  }
  expect(p.configurarDinamica(0, { ...p.tabelasDinamicas()[0].config, ...config }).ok).toBe(true);
  return corrigir(e, p);
};

const comFormula = (slug: string, celula: string, formula: string) => {
  const e = exercicios.find((x) => x.slug === slug)!;
  const p = Planilha.deExercicio(e);
  p.definir(celula, formula);
  return corrigir(e, p);
};

describe("tabela dinâmica: lições 6 a 10", () => {
  it("contagem que encolheu: contar um campo com vazios é recusado com o motivo; qualquer campo cheio passa", () => {
    const e = ex("dinamica-contagem-status-pegadinha");
    expect(corrigir(e, Planilha.deExercicio(e)).falhas[0].mensagem).toContain("conta só as células preenchidas");
    expect(ajustarDinamica("dinamica-contagem-status-pegadinha", { valores: [{ campo: "B", funcao: "contagem" }] }).ok).toBe(true);
  });

  it("quantos itens: Contagem de Qtd conta vendas, não itens", () => {
    const r = ajustarDinamica("dinamica-varios-resumos-pegadinha", { linhas: ["B"], valores: [{ campo: "D", funcao: "contagem" }] }, "G1");
    expect(r.falhas[0].mensagem).toContain("“Contagem de Qtd”");
  });

  it("% do Total Geral: a soma em reais não passa; só a % quando pedem os dois também não", () => {
    const soma = ajustarDinamica("dinamica-percentual-total", { linhas: ["B"], valores: [{ campo: "D", funcao: "soma" }] }, "F1");
    expect(soma.falhas[0].mensagem).toContain("% do Total Geral");
    const so = ajustarDinamica("dinamica-percentual-total-pegadinha", { linhas: ["B"], valores: [{ campo: "D", funcao: "soma", mostrar: "totalGeral" }] }, "F1");
    expect(so.falhas[0].mensagem).toContain("lado a lado");
  });

  it("PROCV na dinâmica: apontar para a célula não passa; PROCV sem FALSO é bloqueado", () => {
    expect(comFormula("dinamica-procv-na-dinamica-pegadinha", "I2", "=F6").ok).toBe(false); // a Carla hoje, mas não acompanha H2
    expect(comFormula("dinamica-procv-na-dinamica-pegadinha", "I2", "=PROCV(H2;E:F;2;FALSO)").ok).toBe(true);
    expect(comFormula("dinamica-procv-na-dinamica-variacao-a", "I2", "=SEERRO(PROCV(H2;E:F;2);0)").ok).toBe(false);
  });

  it("novembro sumiu: a origem antiga é apontada na correção", () => {
    const e = ex("dinamica-caso-horas-pegadinha");
    expect(corrigir(e, Planilha.deExercicio(e)).falhas[0].mensagem).toContain("A1:E10");
  });
});

describe("etapa 5 das lições 6 a 10: questão de concurso", () => {
  const licoes = ["dinamica-contagem-status", "dinamica-varios-resumos", "dinamica-percentual-total", "dinamica-procv-na-dinamica", "dinamica-caso-horas",
    "destaque-escala-de-cor", "destaque-formula-e", "destaque-ordem-das-regras", "destaque-orcado-realizado", "destaque-caso-painel-prazos"];
  for (const licao of licoes) {
    const q = exercicios.find((e) => e.slug === `${licao}-conceito`) as ExercicioDoTipo<"multiple_choice">;
    it(`${licao}: banca, tema, dica nas erradas e o motor confirma as fórmulas`, () => {
      expect(q.banca && q.tema).toBeTruthy();
      expect(q.opcoes.length).toBe(q.banca === "Cebraspe" ? 2 : 5);
      q.opcoes.forEach((o, i) => i !== q.correta && expect(o.dica, `alternativa ${i}`).toBeTruthy());
      for (const c of q.conferir ?? []) {
        const p = Planilha.deExercicio(q);
        const livre = { linha: q.grade.linhas - 1, coluna: q.grade.colunas - 1 };
        expect(p.valor(livre)).toBeNull();
        expect(p.definir(livre, c.formula)).toEqual({ ok: true });
        if (typeof c.esperado === "number") expect(p.valor(livre)).toBeCloseTo(c.esperado, 9);
        else expect(p.valor(livre)).toBe(c.esperado);
      }
    });
  }
});

describe("formatação condicional: lições 6 a 10", () => {
  it("escala com os totais junto é recusada", () => {
    expect(comRegras("destaque-escala-de-cor-pegadinha", [{ tipo: "escala", intervalo: "B2:E10" }]).falhas[0].mensagem).toContain("B2:D9");
  });

  it("duas regras do colega: só criar a com E não basta; excluindo as antigas, passa", () => {
    const certa: RegraCondicional = { tipo: "formula", intervalo: "A2:D11", formula: '=E($B2<$G$1;$D2="Pendente")', estilo: "vermelho" };
    expect(comRegras("destaque-formula-e-pegadinha", [certa]).ok).toBe(false);
    expect(comRegras("destaque-formula-e-pegadinha", [certa], true).ok).toBe(true);
  });

  it("ordem das regras: Mover para Cima resolve; a ordem de fábrica, não", () => {
    const e = ex("destaque-ordem-das-regras");
    const p = Planilha.deExercicio(e);
    expect(corrigir(e, p).falhas[0].mensagem).toContain("outra cor");
    p.moverRegra(0, 1);
    expect(corrigir(e, p).ok).toBe(true);
    const peg = ex("destaque-ordem-das-regras-pegadinha");
    const q = Planilha.deExercicio(peg);
    expect(corrigir(peg, q).ok).toBe(false);
    q.moverRegra(0, 1);
    expect(corrigir(peg, q).ok).toBe(true);
  });

  it("10% a mais não é +10%", () => {
    const r = comRegras("destaque-orcado-realizado-pegadinha", [{ tipo: "formula", intervalo: "C2:C11", formula: "=C2>B2+10%", estilo: "vermelho" }]);
    expect(r.falhas[0].mensagem).toContain("2 células destacadas que não deveriam");
  });

  it("painel: o vermelho só com a data, criado depois do verde, pinta os protocolados", () => {
    const verde: RegraCondicional = { tipo: "formula", intervalo: "A2:E13", formula: '=$E2="Protocolado"', estilo: "verde" };
    const vermelho: RegraCondicional = { tipo: "formula", intervalo: "A2:E13", formula: "=$D2<$H$1", estilo: "vermelho" };
    expect(comRegras("destaque-caso-painel-prazos-pegadinha", [verde, vermelho]).ok).toBe(false);
    expect(comRegras("destaque-caso-painel-prazos-pegadinha", [vermelho, verde]).ok).toBe(true);
  });
});
