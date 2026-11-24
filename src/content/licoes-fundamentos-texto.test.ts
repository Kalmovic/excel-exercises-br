/**
 * Lições 8 a 10 de Fundamentos (ARRED nas parcelas, SOMARPRODUTO, orçamento
 * com $ misto e acumulado) e de Texto (TEXTO em frases, LOCALIZAR com início,
 * lista de clientes): os erros típicos falham com a mensagem que explica o
 * erro, e os outros jeitos certos de resolver passam.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const formula = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"formula">;

/** Corrige com as fórmulas dadas (célula → fórmula); as outras células-alvo ficam com a solução de referência. */
function com(slug: string, celulas: Record<string, string>, { soEssas = false } = {}) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  if (!soEssas) for (const a of ex.alvos) if (!(a.celula in celulas)) p.definir(a.celula, a.solucaoReferencia);
  for (const [c, f] of Object.entries(celulas)) p.definir(c, f);
  return { r: corrigir(ex, p), p };
}

const mensagem = (r: ReturnType<typeof corrigir>, celula: string) => r.falhas.find((f) => f.celula === celula)?.mensagem ?? "";

describe("fundamentos: ARRED nas parcelas", () => {
  it("todas as parcelas iguais deixam o total em R$ 999,99", () => {
    const { r, p } = com("arred-parcelas-que-fecham", { B7: "=ARRED($B$1/$B$2;2)" });
    expect(p.exibicao("B8").replace(/\s/g, " ")).toBe("R$ 999,99");
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B7")).toContain("falta um centavo");
  });
  it("sem $, a cópia para B6 divide por vazio e a dica fala da trava", () => {
    const { r } = com("arred-parcelas-que-fecham", { B5: "=ARRED(B1/B2;2)", B6: "=ARRED(B2/B3;2)" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B6")).toContain("desceram junto");
  });
  it("a última parcela como B1-B5-B6 também vale", () => {
    expect(com("arred-parcelas-que-fecham", { B7: "=B1-B5-B6" }).r.ok).toBe(true);
  });
  it("pegadinha: a fórmula original soma os valores guardados e o total fica em R$ 55,22", () => {
    const ex = formula("arred-parcelas-que-fecham-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(p.exibicao("C5").replace(/\s/g, " ")).toBe("R$ 55,22");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(mensagem(r, "C2")).toContain("SOMA usa o valor guardado");
    const certo = com("arred-parcelas-que-fecham-pegadinha", {});
    expect(certo.p.exibicao("C5").replace(/\s/g, " ")).toBe("R$ 55,23");
    expect(certo.r.ok).toBe(true);
  });
  it("caixas: ARRED deixa unidades de fora", () => {
    const { r } = com("arred-parcelas-que-fecham-variacao-b", { B3: "=ARRED(B1/B2;0)" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B3")).toContain("sempre para cima");
  });
});

describe("fundamentos: SOMARPRODUTO", () => {
  it("soma × soma não é o total do pedido", () => {
    const { r } = com("somarproduto-total-do-pedido", { B8: "=SOMA(B2:B6)*SOMA(C2:C6)" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B8")).toContain("própria linha");
  });
  it("a conta linha a linha dá o valor, mas o exercício pede SOMARPRODUTO", () => {
    const { r } = com("somarproduto-total-do-pedido", { B8: "=B2*C2+B3*C3+B4*C4+B5*C5+B6*C6" });
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("SOMARPRODUTO");
  });
  it("custo médio: a média simples não pondera", () => {
    const { r } = com("somarproduto-total-do-pedido-variacao-b", { B6: "=MÉDIA(C2:C4)" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B6")).toContain("pesar mais");
  });
  it("pegadinha: o total desalinhado começa errado e a dica aponta a linha 3", () => {
    const ex = formula("somarproduto-total-do-pedido-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(p.valor("B7")).toBe(829);
    expect(mensagem(corrigir(ex, p), "B7")).toContain("linha 3");
    expect(com("somarproduto-total-do-pedido-pegadinha", { B7: "=SOMARPRODUTO(B2:B5;C2:C6)" }).r.falhas[0].mensagem).toContain("#VALOR!");
  });
});

describe("fundamentos: orçamento com referência mista e acumulado", () => {
  /** E2:F6 copiados a partir de uma fórmula escrita em E2 (`B` e `7` são trocados por coluna e linha). */
  const bloco = (f: (col: string, lin: number) => string) => {
    const out: Record<string, string> = {};
    for (const [destino, col] of [["E", "B"], ["F", "C"]] as const) for (let l = 2; l <= 6; l++) out[`${destino}${l}`] = f(col, l);
    return out;
  };
  it("com $B$7, a coluna F divide pelo total orçado", () => {
    const { r } = com("orcamento-do-departamento", bloco((c, l) => `=${c}${l}/$B$7`));
    expect(r.ok).toBe(false);
    expect(mensagem(r, "F2")).toContain("continua dividindo pelo total orçado");
  });
  it("sem $, a cópia para baixo divide por células vazias", () => {
    const { r } = com("orcamento-do-departamento", bloco((c, l) => `=${c}${l}/${c}${l + 5}`));
    expect(r.ok).toBe(false);
    expect(mensagem(r, "E3")).toContain("Trave a linha do total");
  });
  it("diferença com o sinal trocado", () => {
    const { r } = com("orcamento-do-departamento", { D3: "=B3-C3" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "D3")).toContain("sinal trocado");
  });
  it("acumulado sem $ soma só o mês; com o fim travado soma o semestre", () => {
    const sem: Record<string, string> = {};
    const fim: Record<string, string> = {};
    for (let l = 2; l <= 7; l++) {
      sem[`C${l}`] = `=SOMA(B${l}:B${l})`;
      fim[`C${l}`] = "=SOMA($B$2:$B$7)";
    }
    expect(mensagem(com("orcamento-do-departamento-variacao-a", sem).r, "C3")).toContain("Trave o começo");
    expect(mensagem(com("orcamento-do-departamento-variacao-a", fim).r, "C2")).toContain("fim travado");
  });
  it("acumulado como 'anterior + mês' também vale", () => {
    const f: Record<string, string> = { C2: "=B2" };
    for (let l = 3; l <= 7; l++) f[`C${l}`] = `=C${l - 1}+B${l}`;
    expect(com("orcamento-do-departamento-variacao-a", f).r.ok).toBe(true);
  });
  it("curva ABC: o total sem trava sai da linha 8", () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 7; l++) f[`C${l}`] = `=SOMA($B$2:B${l})/B${l + 6}`;
    const { r } = com("orcamento-do-departamento-variacao-b", f);
    expect(r.ok).toBe(false);
    expect(mensagem(r, "C3")).toContain("Trave a referência ao total");
  });
});

describe("texto: TEXTO em frases", () => {
  it("data juntada com & vira número e a dica explica", () => {
    const { r, p } = com("texto-data-e-valor-na-frase", { D2: '="Valor de R$ "&TEXTO(B2;"#.##0,00")&" com vencimento em "&C2' });
    expect(p.valor("D2")).toBe("Valor de R$ 1.250,00 com vencimento em 46361");
    expect(mensagem(r, "D2")).toContain("46361");
  });
  it("valor sem o ponto de milhar", () => {
    const { r } = com("texto-data-e-valor-na-frase", { D2: '="Valor de R$ "&TEXTO(B2;"0,00")&" com vencimento em "&TEXTO(C2;"dd/mm/aaaa")' });
    expect(mensagem(r, "D2")).toContain("ponto de milhar");
  });
  it("data digitada dentro da fórmula não acompanha a troca do vencimento", () => {
    const { r } = com("texto-data-e-valor-na-frase", { D2: '="Valor de R$ "&TEXTO(B2;"#.##0,00")&" com vencimento em 05/12/2026"' });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "D2")).toContain("digitada dentro da fórmula");
  });
  it("o R$ dentro do formato também vale", () => {
    expect(com("texto-data-e-valor-na-frase", { D2: '="Valor de "&TEXTO(B2;"R$ #.##0,00")&" com vencimento em "&TEXTO(C2;"dd/mm/aaaa")' }).r.ok).toBe(true);
  });
  it("mês digitado à mão é pego quando a competência muda", () => {
    const { r } = com("texto-data-e-valor-na-frase-variacao-a", { B3: '="Folha de pagamento de novembro/"&TEXTO(B1;"aaaa")' });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "B3")).toContain("digitado à mão");
  });
  it("pegadinha: a porcentagem juntada com & aparece como 0,125", () => {
    const ex = formula("texto-data-e-valor-na-frase-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(p.valor("B3")).toBe("O aluguel será reajustado em 0,125");
    expect(mensagem(corrigir(ex, p), "B3")).toContain("fórmula original");
  });
});

describe("texto: LOCALIZAR com início", () => {
  it("sem o 3º argumento, o 2º hífen é o 1º", () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 5; l++) f[`C${l}`] = `=LOCALIZAR("-";A${l})`;
    const { r } = com("localizar-entre-dois-hifens", f);
    expect(r.ok).toBe(false);
    expect(mensagem(r, "C2")).toContain("3º argumento");
  });
  it("posições fixas só servem no primeiro código", () => {
    const { r } = com("localizar-entre-dois-hifens", { D2: "=EXT.TEXTO(A2;5;4)" });
    expect(r.ok).toBe(false);
    expect(mensagem(r, "D2")).toContain("números fixos");
  });
  it("o número numa fórmula só, sem as colunas auxiliares, também vale", () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 5; l++) f[`D${l}`] = `=EXT.TEXTO(A${l};LOCALIZAR("-";A${l})+1;LOCALIZAR("-";A${l};LOCALIZAR("-";A${l})+1)-LOCALIZAR("-";A${l})-1)`;
    expect(com("localizar-entre-dois-hifens", f).r.ok).toBe(true);
  });
  it("cidade: procurar só o hífen, somando e descontando 2, também vale", () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 4; l++) f[`B${l}`] = `=EXT.TEXTO(A${l};LOCALIZAR("-";A${l})+2;LOCALIZAR("/";A${l})-LOCALIZAR("-";A${l})-2)`;
    expect(com("localizar-entre-dois-hifens-variacao-b", f).r.ok).toBe(true);
  });
  it("pegadinha: D começa em #VALOR! e começar a busca em cima do hífen não resolve", () => {
    const ex = formula("localizar-entre-dois-hifens-pegadinha");
    expect(Planilha.deExercicio(ex).exibicao("D2")).toBe("#VALOR!");
    const { r } = com("localizar-entre-dois-hifens-pegadinha", { C2: '=LOCALIZAR("-";A2;B2)' });
    expect(mensagem(r, "C2")).toContain("Comece uma posição depois");
  });
});

describe("texto: lista de clientes", () => {
  it('="0"& estraga o CPF de 11 dígitos', () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 5; l++) f[`E${l}`] = `="0"&B${l}`;
    const { r, p } = com("caso-lista-de-clientes", f);
    expect(p.valor("E2")).toBe("012345678909");
    expect(mensagem(r, "E2")).toContain("TEXTO completa só o que falta");
  });
  it("PRI.MAIÚSCULA sem ARRUMAR deixa os espaços", () => {
    const { r } = com("caso-lista-de-clientes", { D2: "=PRI.MAIÚSCULA(A2)" });
    expect(mensagem(r, "D2")).toContain("espaços sobrando");
  });
  it("CPF com o ponto sem barra invertida sai com os pontos no lugar errado", () => {
    const { r, p } = com("caso-lista-de-clientes-variacao-a", { B3: '=TEXTO(A3;"000.000.000-00")' });
    expect(p.valor("B3")).not.toBe("098.765.432-10");
    expect(mensagem(r, "B3")).toContain("barra invertida");
  });
  it('o ponto entre aspas ("000"".""000"…) também vale', () => {
    const f: Record<string, string> = {};
    for (let l = 2; l <= 4; l++) f[`B${l}`] = `=TEXTO(A${l};"000"".""000"".""000-00")`;
    expect(com("caso-lista-de-clientes-variacao-a", f).r.ok).toBe(true);
  });
  it("código do cliente sem ARRUMAR pega o espaço da frente", () => {
    const { r, p } = com("caso-lista-de-clientes-variacao-b", { C2: '=MAIÚSCULA(ESQUERDA(A2;3))&"-"&TEXTO(B2;"0000")' });
    expect(p.valor("C2")).toBe(" PA-0007");
    expect(mensagem(r, "C2")).toContain("espaço da frente");
  });
});
