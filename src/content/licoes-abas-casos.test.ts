/**
 * Lições 6 a 10 de Várias abas (aba Config, referência 3D, painel com
 * CONT.SES, INDIRETO, fechamento com três abas) e de Casos reais (folha,
 * fluxo de caixa, reajuste por índice, conciliação, proposta de honorários):
 * os erros típicos falham com a mensagem que explica o erro, os outros jeitos
 * certos passam, e as questões de concurso da etapa 5 batem com o motor.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug, exercicios } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const formula = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"formula">;

/** Corrige com as fórmulas dadas (célula → fórmula); as outras células-alvo ficam com a solução de referência. */
function com(slug: string, celulas: Record<string, string>) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  for (const a of ex.alvos) if (!(a.celula in celulas)) p.definir(a.celula, a.solucaoReferencia);
  for (const [c, f] of Object.entries(celulas)) p.definir(c, f);
  return { r: corrigir(ex, p), p };
}
const mensagem = (r: ReturnType<typeof corrigir>, celula: string) => r.falhas.find((f) => f.celula === celula)?.mensagem ?? "";
/** A mesma fórmula nas linhas de..ate, trocando {l} pelo número da linha. */
const coluna = (col: string, de: number, ate: number, f: string) =>
  Object.fromEntries(Array.from({ length: ate - de + 1 }, (_, i) => [`${col}${de + i}`, f.replaceAll("{l}", String(de + i))]));

describe("abas: aba Config", () => {
  it("sem $, a cópia sai da célula da taxa", () => {
    const { r } = com("abas-parametros-config", { C2: "=B2*Config!B1", C3: "=B3*Config!B2" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "C3")).toContain("Trave a célula da Config");
  });
  it("5% escrito na fórmula dá o valor, mas reprova", () => {
    const { r } = com("abas-parametros-config", coluna("C", 2, 6, "=B{l}*5%"));
    expect(r.ok).toBe(false);
    expect(mensagem(r, "C2")).toContain("dentro da fórmula");
  });
  it("pegadinha: o 5 da Config sem dividir por 100", () => {
    const { r } = com("abas-parametros-config-pegadinha", coluna("C", 2, 6, "=B{l}*Config!$B$1"));
    expect(mensagem(r, "C2")).toContain("500%");
    expect(com("abas-parametros-config-pegadinha", coluna("C", 2, 6, "=B{l}*Config!$B$1%")).r.ok).toBe(true);
  });
});

describe("abas: referência 3D", () => {
  it("aba por aba dá o valor, mas a lição pede o intervalo de abas", () => {
    const { r } = com("abas-referencia-3d", coluna("B", 2, 4, "=Jan!B{l}+Fev!B{l}+Mar!B{l}"));
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B2")).toContain("intervalo de abas");
  });
  it("o total como soma da coluna também vale", () => {
    expect(com("abas-referencia-3d", { B5: "=SOMA(B2:B4)" }).r.ok).toBe(true);
  });
  it("pegadinha: Jan:Mar pega a aba Abr, que está no meio", () => {
    const { r, p } = com("abas-referencia-3d-pegadinha", coluna("B", 2, 4, "=SOMA(Jan:Mar!B{l})"));
    expect(p.valor("B2")).toBe(144920 + 46900);
    expect(mensagem(r, "B2")).toContain("ordem das abas");
    expect(com("abas-referencia-3d-pegadinha", coluna("B", 2, 4, "=SOMA(Jan:Fev!B{l})+Mar!B{l}")).r.ok).toBe(true);
  });
});

describe("abas: painel de processos", () => {
  it("com a área travada na linha, todas as linhas contam a mesma área", () => {
    const f = (col: string) => coluna(col, 2, 4, `=CONT.SES(Processos!$B$2:$B$13;$A$2;Processos!$C$2:$C$13;${col}$1)`);
    const { r } = com("abas-painel-processos", { ...f("B"), ...f("C") });
    expect(mensagem(r, "B3")).toContain("trave só a coluna");
  });
  it("pegadinha: ativo e suspenso no mesmo CONT.SES dá zero", () => {
    const { r, p } = com("abas-painel-processos-pegadinha", coluna("B", 2, 4, '=CONT.SES(Processos!$B$2:$B$13;A{l};Processos!$C$2:$C$13;"Ativo";Processos!$C$2:$C$13;"Suspenso")'));
    expect(p.valor("B2")).toBe(0);
    expect(mensagem(r, "B2")).toContain("um ou outro");
  });
  it("pegadinha: total menos arquivados também vale", () => {
    const f = '=CONT.SE(Processos!$B$2:$B$13;A{l})-CONT.SES(Processos!$B$2:$B$13;A{l};Processos!$C$2:$C$13;"Arquivado")';
    expect(com("abas-painel-processos-pegadinha", coluna("B", 2, 4, f)).r.ok).toBe(true);
  });
});

describe("abas: INDIRETO", () => {
  it("=Fev!B2 dá o valor, mas fica preso ao mês", () => {
    const { r } = com("abas-indireto-mes", { B3: "=Fev!B2", B4: "=Fev!B3" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B3")).toContain("preso em fevereiro");
  });
  it("B1 entre aspas vira texto", () => {
    expect(mensagem(com("abas-indireto-mes", { B3: '=INDIRETO("B1!B2")' }).r, "B3")).toContain("ao pé da letra");
  });
  it("pegadinha: sem as aspas simples, #REF!", () => {
    const { r, p } = com("abas-indireto-mes-pegadinha", { B3: '=INDIRETO($B$1&"!B2")' });
    expect(p.valor("B3")).toEqual({ erro: "#REF!" });
    expect(mensagem(r, "B3")).toContain("aspas simples");
  });
  it("categorias: SOMASE com INDIRETO também vale", () => {
    const f = '=SOMASE(INDIRETO($B$1&"!A2:A5");A{l};INDIRETO($B$1&"!B2:B5"))';
    expect(com("abas-indireto-mes-variacao-a", coluna("B", 4, 7, f)).r.ok).toBe(true);
  });
});

describe("abas: fechamento mensal", () => {
  it("pegadinha: bônus pelo bruto paga Bruno e Daniel", () => {
    const { r } = com("abas-fechamento-mensal-pegadinha", coluna("E", 2, 5, "=D{l}*Config!$B$1+SE(B{l}>=Config!$B$2;Config!$B$3;0)"));
    expect(mensagem(r, "E3")).toContain("abaixo da meta");
  });
  it("comissão sobre o bruto é recusada", () => {
    expect(mensagem(com("abas-fechamento-mensal", coluna("E", 2, 5, "=B{l}*Config!$B$1+SE(D{l}>=Config!$B$2;Config!$B$3;0)")).r, "E2")).toContain("brutas");
  });
});

describe("casos: folha de pagamento", () => {
  it("hora extra sem o adicional", () => {
    expect(mensagem(com("folha-horas-extras", coluna("F", 2, 5, "=C{l}*E{l}")).r, "F2")).toContain("adicional");
  });
  it("pegadinha: horário sem ×24 sai em centavos", () => {
    const { r, p } = com("folha-horas-extras-pegadinha", coluna("E", 2, 5, "=C{l}*D{l}*(1+$K$2)"));
    expect(p.valor("E2") as number).toBeLessThan(10);
    expect(mensagem(r, "E2")).toContain("24");
  });
});

describe("casos: fluxo de caixa", () => {
  it("acumulado sem o saldo inicial", () => {
    expect(mensagem(com("fluxo-de-caixa", coluna("E", 4, 9, "=SOMA($D$4:D{l})")).r, "E4")).toContain("saldo inicial");
  });
  it("acumulado com SOMA e o saldo inicial travado também vale", () => {
    expect(com("fluxo-de-caixa", coluna("E", 4, 9, "=$B$1+SOMA($D$4:D{l})")).r.ok).toBe(true);
  });
  it("pegadinha: subtrair saída negativa", () => {
    expect(mensagem(com("fluxo-de-caixa-pegadinha", coluna("D", 4, 9, "=B{l}-C{l}")).r, "D4")).toContain("sinal de menos");
  });
});

describe("casos: reajuste por índice", () => {
  it("somar os índices dá menos que o acumulado", () => {
    const { r, p } = com("reajuste-ipca", { F2: "=SOMA(B2:B13)" });
    expect(p.valor("F2") as number).toBeCloseTo(0.0381, 6);
    expect(mensagem(r, "F2")).toContain("Multiplique os fatores");
  });
  it("pegadinha: 14 meses em vez de 12", () => {
    expect(mensagem(com("reajuste-ipca-pegadinha", { F2: "=C15-1" }).r, "F2")).toContain("14 meses");
  });
});

describe("casos: conciliação bancária", () => {
  it("só pelo valor reprova mesmo acertando", () => {
    const { r } = com("conciliacao-bancaria", coluna("D", 2, 9, '=SE(CONT.SE(Extrato!$C$2:$C$9;C{l})>0;"Conciliado";"Pendente")'));
    expect(r.ok).toBe(false);
    expect(mensagem(r, "D2")).toContain("data e valor");
  });
  it("pegadinha: com a data exata, a TED de 2 dias depois fica pendente", () => {
    const { r, p } = com("conciliacao-bancaria-pegadinha", coluna("D", 2, 9, '=SE(CONT.SES(Extrato!$A$2:$A$9;A{l};Extrato!$C$2:$C$9;C{l})>0;"Conciliado";"Pendente")'));
    expect(p.valor("D4")).toBe("Pendente");
    expect(mensagem(r, "D4")).toContain("janela de 2 dias");
  });
});

describe("casos: proposta de honorários", () => {
  it("imposto por fora", () => {
    expect(mensagem(com("proposta-de-honorarios", { B10: "=(B8-B9)*(1+Tabela!$B$8)" }).r, "B10")).toContain("Divida por");
  });
  it("pegadinha: com o imposto por fora, sobra menos que o custo com a margem", () => {
    const { r, p } = com("proposta-de-honorarios-pegadinha", { B5: "=B1*(1+B2)*(1+B3)" });
    expect(p.valor("B7") as number).toBeCloseTo(2941.2, 6);
    expect(mensagem(r, "B5")).toContain("linha 7");
  });
});

describe("etapa 5: questões de concurso das lições novas", () => {
  const novas = exercicios.filter(
    (e): e is ExercicioDoTipo<"multiple_choice"> =>
      (e.modulo === "abas" || e.modulo === "casos") && e.etapa === 5 && e.ordem >= 65 && e.type === "multiple_choice",
  );
  it("são 10, com banca e tema, e as bancas variam", () => {
    expect(novas).toHaveLength(10);
    expect(novas.every((e) => e.banca && e.tema && e.titulo.startsWith("Concurso:"))).toBe(true);
    expect(new Set(novas.map((e) => e.banca)).size).toBe(5);
  });
  for (const q of novas)
    it(`${q.slug}: alternativas e fórmulas conferidas no motor`, () => {
      q.opcoes.forEach((o, i) => {
        if (i !== q.correta) expect(o.dica, `alternativa ${i}`).toBeTruthy();
        const r = corrigir(q, Planilha.deExercicio(q), { ativa: "A1", selecao: "A1", resposta: String(i), mudancasPeloMouse: 0 });
        expect(r.ok, `alternativa ${i}`).toBe(i === q.correta);
      });
      for (const c of q.conferir ?? []) {
        const p = Planilha.deExercicio(q);
        const livre = { linha: q.grade.linhas - 1, coluna: q.grade.colunas - 1 };
        expect(p.definir(livre, c.formula)).toEqual({ ok: true });
        if (typeof c.esperado === "number") expect(p.valor(livre) as number).toBeCloseTo(c.esperado, 5);
        else if (typeof c.esperado === "string" && c.esperado.startsWith("#")) expect(p.valor(livre)).toEqual({ erro: c.esperado });
        else expect(p.valor(livre)).toBe(c.esperado);
      }
    });
});
