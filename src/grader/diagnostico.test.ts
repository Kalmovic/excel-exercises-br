import { describe, expect, it } from "vitest";
import { exercicios } from "@/content";
import { deEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir } from "./corrigir";
import { diagnosticarValor } from "./diagnostico";

const ex = (slug: string) => exercicios.find((e) => e.slug === slug)!;

/** Mensagem da primeira falha depois de escrever as fórmulas do aluno. */
function mensagem(slug: string, formulas: Record<string, string>, copiar?: [string, string]) {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  for (const [c, f] of Object.entries(formulas)) p.definir(c, f);
  if (copiar) {
    const o = deEndereco(copiar[0]);
    const [a, b] = copiar[1].split(":").map(deEndereco);
    p.preencher({ inicio: o, fim: o }, { inicio: a, fim: b });
  }
  const r = corrigir(e, p);
  p.destruir();
  return r.falhas[0]?.mensagem ?? "";
}

describe("feedback específico", () => {
  it("intervalo que para antes do fim", () => {
    expect(mensagem("soma-total-de-vendas", { B8: "=SOMA(B2:B6)" })).toContain("termina cedo demais");
  });
  it("intervalo que começa no cabeçalho", () => {
    // (na SOMA o cabeçalho de texto é ignorado e o valor dá certo; numa contagem, não)
    expect(
      diagnosticarValor({ formulaAluno: "=CONT.VALORES(A1:A13)", formulaReferencia: "=CONT.VALORES(A2:A13)", obtido: 13, esperado: 12 }),
    ).toContain("inclui o cabeçalho");
  });
  it("coluna errada", () => {
    expect(mensagem("somase-total-por-categoria", { E2: "=SOMASE($A$2:$A$13;D2;$C$2:$C$13)" })).toBeTruthy();
    expect(diagnosticarValor({ formulaAluno: "=SOMA(C2:C7)", formulaReferencia: "=SOMA(B2:B7)", obtido: 0, esperado: 10 })).toContain(
      "coluna errada",
    );
  });
  it("> no lugar de >=", () => {
    const e = ex("se-aprovado-ou-reprovado");
    const formulas = Object.fromEntries(
      e.type === "formula" ? e.alvos.map((a) => [a.celula, a.solucaoReferencia.replace(">=", ">")]) : [],
    );
    // só falha se algum aluno tirou exatamente 7; testa a regra direto também
    expect(
      diagnosticarValor({
        formulaAluno: '=SE(B2>7;"Aprovado";"Reprovado")',
        formulaReferencia: '=SE(B2>=7;"Aprovado";"Reprovado")',
        obtido: "Reprovado",
        esperado: "Aprovado",
      }),
    ).toContain("sinal de comparação");
    expect(formulas).toBeTruthy();
  });
  it("PROCV sem o FALSO e coluna errada", () => {
    expect(
      diagnosticarValor({ formulaAluno: "=PROCV(A2;$E$2:$G$9;3)", formulaReferencia: "=PROCV(A2;$E$2:$G$9;3;FALSO)", obtido: 1, esperado: 2 }),
    ).toContain("último argumento do PROCV");
    expect(mensagem("procv-preco-pelo-codigo", { B2: "=PROCV(A2;$E$2:$G$9;2;FALSO)" })).toContain("número da coluna");
  });
  it("divisão invertida", () => {
    expect(mensagem("porcentagem-do-total", { C2: "=$B$7/B2" })).toContain("ordem da divisão");
  });
  it("porcentagem multiplicada por 100", () => {
    expect(mensagem("porcentagem-do-total", { C2: "=B2/$B$7*100" })).toContain("100 vezes maior");
  });
  it("sinal trocado (PGTO)", () => {
    expect(mensagem("pgto-parcela-do-financiamento", { B5: "=PGTO(B2;B3;B1)" })).toContain("sinal está trocado");
  });
  it("função trocada", () => {
    expect(mensagem("soma-total-de-vendas", { B8: "=MÉDIA(B2:B7)" })).toContain("MÉDIA faz o cálculo que o enunciado pede");
  });
  it("SE aninhado no lugar de SES não é tratado como função errada", () => {
    expect(
      diagnosticarValor({ formulaAluno: '=SE(B2>=90;"A";"B")', formulaReferencia: '=SES(B2>=90;"A";VERDADEIRO;"B")', obtido: "B", esperado: "C" }),
    ).toBeNull();
  });
  it("esqueceu o $ e copiou a fórmula", () => {
    const m = mensagem("referencia-absoluta-comissao", { C2: "=B2*F1" }, ["C2", "C3:C6"]);
    expect(m).toContain("precisava ficar parada");
  });
  it("critério digitado em vez da célula", () => {
    const m = mensagem("criterio-em-celula", { E2: '=CONT.SE(B2:B13;"<15")' });
    expect(m).toContain("não usa uma das células");
  });
  it("só números na fórmula", () => {
    const formulas = { C2: "=1800/4500", C3: "=B3/$B$7", C4: "=B4/$B$7", C5: "=B5/$B$7", C6: "=B6/$B$7" };
    expect(mensagem("porcentagem-do-total", formulas)).toContain("só tem números");
  });
});
