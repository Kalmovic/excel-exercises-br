/**
 * Lições 6 a 10 de Busca e de Datas: o erro típico de cada uma falha, com a
 * mensagem que explica o erro, e o jeito alternativo certo passa.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { formatarValor } from "@/engine/format";
import { corrigir } from "@/grader/corrigir";

const formula = (slug: string) => {
  const ex = exercicioPorSlug(slug);
  if (!ex || ex.type !== "formula") throw new Error(`sem exercício de fórmula ${slug}`);
  return ex as ExercicioDoTipo<"formula">;
};

/** Preenche as células (a fórmula de uma célula "copiada" para as outras linhas é dada por `f(linha)`). */
function com(slug: string, celulas: Record<string, string>) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  for (const [end, f] of Object.entries(celulas)) expect(p.definir(end, f)).toEqual({ ok: true });
  return { r: corrigir(ex, p), p };
}

const linhas = (col: string, de: number, ate: number, f: (l: number) => string) =>
  Object.fromEntries(Array.from({ length: ate - de + 1 }, (_, i) => [`${col}${de + i}`, f(de + i)]));

const reprova = (slug: string, celulas: Record<string, string>, trecho: string) => {
  const { r } = com(slug, celulas);
  expect(r.ok).toBe(false);
  expect(r.falhas.map((f) => f.mensagem).join(" | ")).toContain(trecho);
};

describe("busca: PROCV com CORRESP", () => {
  it("cabeçalho começando em B dá o mês anterior", () =>
    reprova("procv-coluna-variavel-corresp", { I2: "=PROCV(G2;A2:E6;CORRESP(H2;B1:E1;0);FALSO)" }, "a coluna do Vendedor também conta"));
  it("número da coluna digitado não acompanha o mês", () =>
    reprova("procv-coluna-variavel-corresp", { I2: "=PROCV(G2;A2:E6;4;FALSO)" }, "Um número de coluna digitado"));
  it("sem o FALSO é recusado mesmo com o valor certo", () =>
    reprova("procv-coluna-variavel-corresp", { I2: "=PROCV(G2;A2:E6;CORRESP(H2;A1:E1;0))" }, "busca aproximada"));
  it("a lição é do PROCV: ÍNDICE com dois CORRESP pede o PROCV", () =>
    reprova("procv-coluna-variavel-corresp", { I2: "=ÍNDICE(B2:E6;CORRESP(G2;A2:A6;0);CORRESP(H2;B1:E1;0))" }, "use a função PROCV"));
  it("com o cabeçalho certo passa, e acompanha a troca de vendedor e mês", () =>
    expect(com("procv-coluna-variavel-corresp", { I2: "=PROCV(G2;A1:E6;CORRESP(H2;A1:E1;0);FALSO)" }).r.ok).toBe(true));
  it("copiar sem $ perde o cabeçalho", () =>
    reprova(
      "procv-coluna-variavel-corresp-variacao-a",
      linhas("I", 2, 4, (l) => `=PROCV(G${l};A${l}:E${l + 4};CORRESP(H${l};A${l - 1}:E${l - 1};0);FALSO)`),
      "a linha do cabeçalho desceu junto",
    ));
});

describe("busca: PROCX por faixa", () => {
  it("sem o modo de correspondência dá #N/D com a dica", () =>
    reprova("procx-faixa-modo-correspondencia", linhas("F", 2, 5, (l) => `=PROCX(E${l};$A$2:$A$5;$B$2:$B$5)`), "só aceita o valor exato"));
  it("com 1 sobe de categoria antes da hora", () =>
    reprova("procx-faixa-modo-correspondencia", linhas("F", 2, 5, (l) => `=PROCX(E${l};$A$2:$A$5;$B$2:$B$5;;1)`), "próximo valor MAIOR"));
  it("com o 4º argumento preenchido também passa", () =>
    expect(com("procx-faixa-modo-correspondencia", linhas("F", 2, 5, (l) => `=PROCX(E${l};$A$2:$A$5;$B$2:$B$5;"Sem categoria";-1)`)).r.ok).toBe(true));
  it("caixa: -1 escolhe uma caixa pequena demais", () =>
    reprova("procx-faixa-modo-correspondencia-variacao-b", { E2: '=PROCX(E1;B2:B5;A2:A5;"Não cabe";-1)' }, "não cabe nela"));
});

describe("busca: duas condições", () => {
  it("só pelo cargo traz o nível I", () =>
    reprova("procx-duas-condicoes", linhas("H", 2, 4, (l) => `=PROCX(F${l};$A$2:$A$9;$C$2:$C$9)`), "o cargo e o nível juntos"));
  it("ÍNDICE + CORRESP com soma das condições é recusado", () =>
    reprova("procx-duas-condicoes-variacao-a", { H2: "=ÍNDICE(C2:C9;CORRESP(1;(A2:A9=F2)+(B2:B9=G2);0))" }, "multiplique"));
  it("PROCX no lugar de ÍNDICE é recusado na variação sem PROCX", () =>
    reprova("procx-duas-condicoes-variacao-a", { H2: "=PROCX(F2&G2;A2:A9&B2:B9;C2:C9)" }, "Tente resolver sem usar PROCX"));
  it("PROCX dentro de PROCX acompanha cargo e nível trocados", () =>
    expect(com("procx-duas-condicoes-variacao-b", { H2: "=PROCX(F2;A2:A4;PROCX(G2;B1:D1;B2:D4))" }).r.ok).toBe(true));
  it("salário digitado não acompanha", () => expect(com("procx-duas-condicoes-variacao-b", { H2: "=6600" }).r.ok).toBe(false));
});

describe("busca: última ocorrência", () => {
  it("sem o -1 traz a compra mais antiga", () => reprova("procx-ultima-ocorrencia", { G2: '=PROCX(F2;C2:C9;D2:D9;"Sem compra")' }, "PRIMEIRA compra"));
  it("aumento com os dois PROCX iguais dá zero", () =>
    reprova("procx-ultima-ocorrencia-variacao-b", { G2: "=PROCX(F2;C2:C9;D2:D9)-PROCX(F2;C2:C9;D2:D9)" }, "dá zero"));
  it("aumento ao contrário", () =>
    reprova("procx-ultima-ocorrencia-variacao-b", { G2: "=PROCX(F2;C2:C9;D2:D9)-PROCX(F2;C2:C9;D2:D9;;0;-1)" }, "ao contrário"));
});

describe("busca: caso da conferência", () => {
  const seerroDentro = (l: number) => `=SE(SEERRO(PROCV(A${l};$E$2:$G$7;3;FALSO);"Não cadastrado")=B${l};"OK";"Valor divergente")`;
  it("SEERRO só no PROCV vira Valor divergente", () =>
    reprova("caso-conferencia-de-cadastro", linhas("C", 2, 7, seerroDentro), "por fora do SE"));
  it("a pegadinha começa errada", () => expect(corrigir(formula("caso-conferencia-de-cadastro-pegadinha"), Planilha.deExercicio(formula("caso-conferencia-de-cadastro-pegadinha"))).ok).toBe(false));
  it("PROCX com o teste do vazio também passa", () =>
    expect(
      com(
        "caso-conferencia-de-cadastro",
        linhas("C", 2, 7, (l) => `=SE(PROCX(A${l};$E$2:$E$7;$G$2:$G$7;"")="";"Não cadastrado";SE(PROCX(A${l};$E$2:$E$7;$G$2:$G$7)=B${l};"OK";"Valor divergente"))`),
      ).r.ok,
    ).toBe(true));
  it("tolerância sem ABS deixa passar quem pagou a menos", () =>
    reprova(
      "caso-conferencia-de-cadastro-variacao-b",
      linhas("C", 2, 7, (l) => `=SEERRO(SE(B${l}-PROCV(A${l};$E$2:$G$7;3;FALSO)<=1;"OK";"Valor divergente");"Não cadastrado")`),
      "Pagar a menos também é divergência",
    ));
  it("tolerância com < deixa o R$ 1,00 de fora", () =>
    reprova(
      "caso-conferencia-de-cadastro-variacao-b",
      linhas("C", 2, 7, (l) => `=SEERRO(SE(ABS(B${l}-PROCV(A${l};$E$2:$G$7;3;FALSO))<1;"OK";"Valor divergente");"Não cadastrado")`),
      "inclui o próprio limite",
    ));
});

describe("datas: DATAM", () => {
  it("+30 por parcela escorrega", () => reprova("datam-vencimento-das-parcelas", linhas("B", 2, 7, (l) => `=$E$1+(A${l}-1)*30`), "Somar 30 dias"));
  it("sem o -1 a primeira parcela anda um mês", () =>
    reprova("datam-vencimento-das-parcelas", linhas("B", 2, 7, (l) => `=DATAM($E$1;A${l})`), "anda zero meses"));
  it("encadear a partir da anterior perde o dia 31", () =>
    reprova("datam-vencimento-das-parcelas-pegadinha", linhas("B", 3, 7, (l) => `=DATAM(B${l - 1};1)`), "a partir do primeiro vencimento"));
  it("aviso: -60 dias não são 2 meses", () => reprova("datam-vencimento-das-parcelas-variacao-b", linhas("C", 2, 4, (l) => `=B${l}-60`), "60 dias não são 2 meses"));
});

describe("datas: DIA.DA.SEMANA", () => {
  it("sem o tipo 2, a sexta vira fim de semana", () =>
    reprova("dia-da-semana-fim-de-semana", linhas("C", 2, 6, (l) => `=SE(DIA.DA.SEMANA(B${l})>5;"Fim de semana";"Dia útil")`), "a semana começa no domingo"));
  it("OU com sábado e domingo no tipo 1 também passa", () =>
    expect(
      com("dia-da-semana-fim-de-semana", linhas("C", 2, 6, (l) => `=SE(OU(DIA.DA.SEMANA(B${l})=1;DIA.DA.SEMANA(B${l})=7);"Fim de semana";"Dia útil")`)).r.ok,
    ).toBe(true));
  it("próximo dia útil sem o -1 empurra o dia útil", () =>
    reprova("dia-da-semana-fim-de-semana-variacao-b", linhas("C", 2, 5, (l) => `=DIATRABALHO(B${l};1;$E$2:$E$3)`), "Comece a contar do dia anterior"));
  it("nome do dia abreviado", () => reprova("dia-da-semana-fim-de-semana-variacao-a", linhas("C", 2, 6, (l) => `=TEXTO(B${l};"ddd")`), "abreviado"));
});

describe("datas: prazo processual", () => {
  it("dias corridos", () => reprova("diatrabalho-prazo-processual", linhas("D", 2, 5, (l) => `=B${l}+C${l}`), "dias corridos"));
  it("sem feriados", () => reprova("diatrabalho-prazo-processual", linhas("D", 2, 5, (l) => `=DIATRABALHO(B${l};C${l})`), "Faltou considerar os feriados"));
  it("feriados sem $ (a pegadinha) perdem o 20/11", () =>
    reprova("diatrabalho-prazo-processual", linhas("D", 2, 5, (l) => `=DIATRABALHO(B${l};C${l};G${l}:G${l + 4})`), "lista de feriados desceu junto"));
  it("protocolo no último dia: < no lugar de <=", () =>
    reprova(
      "diatrabalho-prazo-processual-variacao-b",
      linhas("D", 2, 4, (l) => `=SE(C${l}<DIATRABALHO(B${l};15;$G$2:$G$6);"No prazo";"Fora do prazo")`),
      "o próprio dia-limite também vale",
    ));
});

describe("datas: horas", () => {
  it("as horas aparecem no formato de hora", () => {
    const { p } = com("horas-trabalhadas-banco-de-horas", linhas("F", 2, 6, (l) => `=(C${l}-B${l})+(E${l}-D${l})`));
    expect(p.exibicao("F3")).toBe("09:25");
  });
  it("almoço contado como trabalho", () => reprova("horas-trabalhadas-banco-de-horas", linhas("F", 2, 6, (l) => `=E${l}-B${l}`), "o almoço entrou na conta"));
  it("saldo em formato de hora", () => reprova("horas-trabalhadas-banco-de-horas-variacao-a", linhas("G", 2, 6, (l) => `=F${l}-$I$1`), "########"));
  it("hora extra sem o ×24", () => reprova("horas-trabalhadas-banco-de-horas-variacao-b", { B4: "=B1*B2*(1+B3)" }, "fração do dia"));
  it("hora extra só com o adicional", () => reprova("horas-trabalhadas-banco-de-horas-variacao-b", { B4: "=B1*24*B2*B3" }, "só o adicional"));
  it("a soma das horas vira o dia", () => {
    const ex = formula("horas-trabalhadas-banco-de-horas-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(p.exibicao("F7")).toBe("19:30");
    expect(corrigir(ex, p).falhas[0].mensagem).toContain("vira o dia");
  });
  it("formato de hora: passa de 24h como o Excel, negativo vira ########", () => {
    expect(formatarValor(1 + 19 / 24 + 50 / 1440, "NUMBER_TIME")).toBe("19:50");
    expect(formatarValor(-0.01, "NUMBER_TIME")).toBe("########");
    expect(formatarValor(0.5, "NUMBER_TIME", "moeda")).toBe("R$ 0,50");
  });
});

describe("datas: caso da agenda", () => {
  const certo = {
    ...linhas("D", 2, 6, (l) => `=DATAM(B${l};C${l})-1`),
    ...linhas("E", 2, 6, (l) => `=D${l}-30`),
  };
  it("SES com o aviso primeiro marca o vencido como Avisar já", () =>
    reprova(
      "caso-agenda-de-vencimentos",
      { ...certo, ...linhas("F", 2, 6, (l) => `=SES(E${l}<=$I$1;"Avisar já";D${l}<$I$1;"Vencido";VERDADEIRO;"Em dia")`) },
      "A ordem das condições importa",
    ));
  it("SE aninhado também passa", () =>
    expect(
      com("caso-agenda-de-vencimentos", { ...certo, ...linhas("F", 2, 6, (l) => `=SE(D${l}<$I$1;"Vencido";SE(E${l}<=$I$1;"Avisar já";"Em dia"))`) }).r.ok,
    ).toBe(true));
  it("término sem tirar um dia", () =>
    reprova(
      "caso-agenda-de-vencimentos",
      {
        ...linhas("D", 2, 6, (l) => `=DATAM(B${l};C${l})`),
        ...linhas("E", 2, 6, (l) => `=D${l}-30`),
        ...linhas("F", 2, 6, (l) => `=SES(D${l}<$I$1;"Vencido";E${l}<=$I$1;"Avisar já";VERDADEIRO;"Em dia")`),
      },
      "Falta tirar um dia",
    ));
  it("próximo término: MÍNIMO de todos pega o vencido", () =>
    reprova("caso-agenda-de-vencimentos-variacao-b", { I3: "=MÍNIMO(D2:D6)", I4: "=PROCX(I3;D2:D6;A2:A6)" }, "já venceu"));
});
