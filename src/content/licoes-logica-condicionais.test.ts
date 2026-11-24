/**
 * Lições 6–10 de Lógica e 7–10 de Contar e somar com condição: a pegadinha
 * começa errada pelo motivo que ela ensina, e os erros típicos falham com a
 * mensagem que explica o erro.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { deEndereco } from "@/engine/address";

const formula = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"formula">;

/** Preenche as linhas `de` a `ate` da coluna com a fórmula (`#` vira o número da linha) e corrige. */
function comColuna(slug: string, coluna: string, de: number, ate: number, f: string) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  for (let l = de; l <= ate; l++) p.definir(`${coluna}${l}`, f.replaceAll("#", String(l)));
  return { r: corrigir(ex, p), p };
}

/** Escreve a fórmula na primeira linha e copia com a alça de preenchimento, como o aluno faria. */
function copiando(slug: string, coluna: string, de: number, ate: number, f: string) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  p.definir(`${coluna}${de}`, f);
  const ini = deEndereco(`${coluna}${de}`);
  p.preencher({ inicio: ini, fim: ini }, { inicio: deEndereco(`${coluna}${de + 1}`), fim: deEndereco(`${coluna}${ate}`) });
  return { r: corrigir(ex, p), p };
}

function inicial(slug: string) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  return { r: corrigir(ex, p), p };
}

const mensagens = (r: ReturnType<typeof corrigir>) => r.falhas.map((f) => f.mensagem).join(" | ");

describe("lógica: SE com datas", () => {
  it("a data entre aspas marca tudo como vencido, até o prazo de dezembro", () => {
    const { r, p } = inicial("se-prazo-vencido-pegadinha");
    expect(p.valor("E5")).toBe("Vencido"); // 02/12/2026, depois de hoje
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("A data continua entre aspas");
  });
  it("comparar com a célula corrige; DATA() fixo não acompanha o dia", () => {
    expect(comColuna("se-prazo-vencido-pegadinha", "E", 2, 7, '=SE(C#<$H$1;"Vencido";"No prazo")').r.ok).toBe(true);
    const { r } = comColuna("se-prazo-vencido-pegadinha", "E", 2, 7, '=SE(C#<DATA(2026;11;24);"Vencido";"No prazo")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("só hoje");
  });
  it("sem $ na data de hoje, a cópia quebra e a dica fala do $", () => {
    const { r } = copiando("se-prazo-vencido", "E", 2, 7, '=SE(C2<H1;"Vencido";"No prazo")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("Trave a data de hoje");
  });
  it("<= marca como vencido o prazo de hoje", () => {
    const { r } = comColuna("se-prazo-vencido", "E", 2, 7, '=SE(C#<=$H$1;"Vencido";"No prazo")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("vence hoje ainda está no prazo");
  });
});

describe("lógica: NÃO e OU", () => {
  it("OU com diferente de aprova tudo", () => {
    const { r, p } = inicial("nao-despesa-reembolsavel-pegadinha");
    expect(["D2", "D3", "D4", "D5", "D6", "D7"].map((c) => p.valor(c))).toEqual(Array(6).fill("Sim"));
    expect(mensagens(r)).toContain("Ainda com OU");
  });
  it("as duas formas certas passam na pegadinha", () => {
    expect(comColuna("nao-despesa-reembolsavel-pegadinha", "D", 2, 7, '=SE(E(B#<>"Multa";B#<>"Pessoal");"Sim";"Não")').r.ok).toBe(true);
    expect(comColuna("nao-despesa-reembolsavel-pegadinha", "D", 2, 7, '=SE(NÃO(OU(B#="Multa";B#="Pessoal"));"Sim";"Não")').r.ok).toBe(true);
  });
  it("a variação sem NÃO recusa o NÃO", () => {
    const { r } = comColuna("nao-despesa-reembolsavel-variacao-b", "D", 2, 6, '=SE(NÃO(OU(B#="Multa";B#="Pessoal"));"Sim";"Não")');
    expect(r.falhas.map((f) => f.motivo)).toContain("funcao-proibida");
  });
});

describe("lógica: ÉCÉL.VAZIA e ÉNÚM", () => {
  it("testar zero manda quem lançou 0 para Falta lançar", () => {
    const { r, p } = inicial("ecel-vazia-horas-extras-pegadinha");
    expect(p.valor("D4")).toBe("Falta lançar");
    expect(mensagens(r)).toContain("Ainda testando o zero");
  });
  it('C="" também separa o vazio do zero', () => {
    expect(comColuna("ecel-vazia-horas-extras-pegadinha", "D", 2, 7, '=SE(C#="";"Falta lançar";B#*C#)').r.ok).toBe(true);
  });
  it("ÉNÚM antes do ÉCÉL.VAZIA manda quem não lançou para Corrigir", () => {
    const { r } = comColuna("ecel-vazia-horas-extras-variacao-b", "D", 2, 7, '=SE(ÉNÚM(C#);B#*C#;SE(ÉCÉL.VAZIA(C#);"Falta lançar";"Corrigir"))');
    expect(r.ok).toBe(true); // nesta ordem funciona: o número sai antes
    const errado = comColuna("ecel-vazia-horas-extras-variacao-b", "D", 2, 7, '=SE(ÉNÚM(C#);B#*C#;"Corrigir")').r;
    expect(mensagens(errado)).toContain("Célula vazia também não é número");
  });
});

describe("lógica: honorários e classificação", () => {
  it("E com Procedente e Acordo ao mesmo tempo dá zero para todos", () => {
    const { r, p } = inicial("honorarios-de-exito-pegadinha");
    expect(["E2", "E3", "E7"].map((c) => p.valor(c))).toEqual([0, 0, 0]);
    expect(mensagens(r)).toContain("Procedente e Acordo ao mesmo tempo");
  });
  it("percentual sem $ falha com a dica do $", () => {
    const f = '=SE(D2="Sim";SES(C2="Procedente";B2*H1;C2="Acordo";B2*H2;VERDADEIRO;0);"Aguardando")';
    expect(mensagens(copiando("honorarios-de-exito", "E", 2, 7, f).r)).toContain("Trave os percentuais");
  });
  it("SE aninhado também resolve o caso", () => {
    const f = '=SE(D#<>"Sim";"Aguardando";SE(C#="Procedente";B#*$H$1;SE(C#="Acordo";B#*$H$2;0)))';
    expect(comColuna("honorarios-de-exito", "E", 2, 7, f).r.ok).toBe(true);
  });
  it("bloqueio no fim da fila: a Auto Peças Silva vira Ouro", () => {
    const { r, p } = inicial("caso-classificacao-clientes-pegadinha");
    expect(p.valor("F5")).toBe("Ouro");
    expect(mensagens(r)).toContain("O bloqueio ainda não está em primeiro");
  });
  it(">=30 bloqueia o Café Central, que está com 30 dias", () => {
    const f = '=SES(E#>=30;"Bloqueado";E(B#+C#>=100000;D#>=3);"Ouro";OU(B#+C#>=50000;D#>=5);"Prata";VERDADEIRO;"Bronze")';
    expect(mensagens(comColuna("caso-classificacao-clientes", "F", 2, 9, f).r)).toContain("não inclui os 30");
  });
});

describe("condicionais: curingas", () => {
  it('"Ltda" sem curinga dá zero', () => {
    const { r, p } = inicial("cont-se-curinga-ltda-pegadinha");
    expect(p.valor("G1")).toBe(0);
    expect(mensagens(r)).toContain("Falta o curinga");
  });
  it('"Ltda*" procura o começo', () => {
    const { r } = comColuna("cont-se-curinga-ltda", "G", 1, 1, '=CONT.SE(A2:A11;"Ltda*")');
    expect(mensagens(r)).toContain("começam");
  });
  it("busca com o texto escrito na fórmula não acompanha F1", () => {
    const { r } = comColuna("cont-se-curinga-ltda-variacao-b", "F", 2, 2, '=CONT.SE(A2:A11;"*Silva*")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("precisa usar a célula F1");
  });
  it('"TR*" soma os tributários junto', () => {
    const { r } = comColuna("cont-se-curinga-ltda-variacao-a", "G", 1, 1, '=SOMASE(A2:A9;"TR*";C2:C9)');
    expect(mensagens(r)).toContain("TRIB");
  });
});

describe("condicionais: período de datas", () => {
  it("a célula dentro das aspas soma zero", () => {
    const { r, p } = inicial("somases-periodo-datas-pegadinha");
    expect(p.valor("G3")).toBe(0);
    expect(mensagens(r)).toContain("Ainda há uma célula dentro das aspas");
  });
  it("> e < deixam as pontas de fora", () => {
    const { r } = comColuna("somases-periodo-datas", "G", 3, 3, '=SOMASES(C2:C11;A2:A11;">"&G1;A2:A11;"<"&G2)');
    expect(mensagens(r)).toContain("As pontas contam");
  });
  it("as datas escritas na fórmula não acompanham G1 e G2", () => {
    const { r } = comColuna("somases-periodo-datas", "G", 3, 3, '=SOMASES(C2:C11;A2:A11;">=01/11/2026";A2:A11;"<=30/11/2026")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("precisa usar G1 e G2");
  });
});

describe("condicionais: diferente de e vazio", () => {
  it("as linhas vazias entram no <>Cancelada", () => {
    const { r, p } = inicial("criterios-diferente-vazio-pegadinha");
    expect(p.valor("H1")).toBe(17);
    expect(mensagens(r)).toContain("As linhas vazias também");
  });
  it("encurtar o intervalo acerta o número, mas é recusado", () => {
    const { r } = comColuna("criterios-diferente-vazio-pegadinha", "H", 1, 1, '=CONT.SE(E2:E11;"<>Cancelada")');
    expect(r.ok).toBe(false);
    expect(mensagens(r)).toContain("Encurtar o intervalo");
  });
  it("contar as notas e tirar as canceladas também serve", () => {
    expect(comColuna("criterios-diferente-vazio-pegadinha", "H", 1, 1, '=CONT.VALORES(A2:A20)-CONT.SE(E2:E20;"Cancelada")').r.ok).toBe(true);
  });
  it('"<>" na data de pagamento soma as pagas', () => {
    const { r } = comColuna("criterios-diferente-vazio", "H", 1, 1, '=SOMASES(C2:C20;D2:D20;"<>";E2:E20;"<>Cancelada")');
    expect(mensagens(r)).toContain("não vazio");
  });
});

describe("condicionais: relatório por responsável", () => {
  it("a fórmula copiada sem $ erra a partir da segunda linha", () => {
    const { r, p } = inicial("caso-relatorio-por-responsavel-pegadinha");
    expect(p.valor("H5")).toBe(3);
    expect(r.ok).toBe(false);
    expect(r.falhas.map((f) => f.celula)).not.toContain("H5");
    expect(mensagens(r)).toContain("Ainda há intervalo ou data do período sem $");
  });
  it("copiando a linha 5 com $ passa", () => {
    const f = '=CONT.SES($B$2:$B$17;G5;$A$2:$A$17;">="&$H$1;$A$2:$A$17;"<="&$H$2;$E$2:$E$17;"<>Cancelado")';
    expect(copiando("caso-relatorio-por-responsavel-pegadinha", "H", 5, 8, f).r.ok).toBe(true);
  });
  it("com $ na base e no período passa; o valor médio da Daniela é 0", () => {
    const ex = formula("caso-relatorio-por-responsavel");
    const p = Planilha.deExercicio(ex);
    const per = '$A$2:$A$17;">="&$H$1;$A$2:$A$17;"<="&$H$2;$E$2:$E$17;"<>Cancelado"';
    for (const l of [5, 6, 7, 8]) {
      p.definir(`H${l}`, `=CONT.SES($B$2:$B$17;G${l};${per})`);
      p.definir(`I${l}`, `=SOMASES($D$2:$D$17;$B$2:$B$17;G${l};${per})`);
      p.definir(`J${l}`, `=SEERRO(I${l}/H${l};0)`);
    }
    expect(p.valor("J8")).toBe(0);
    expect(corrigir(ex, p).ok).toBe(true);
    p.definir("H5", `=CONT.SES($B$2:$B$17;"Ana";${per})`);
    expect(corrigir(ex, p).ok).toBe(false);
  });
});
