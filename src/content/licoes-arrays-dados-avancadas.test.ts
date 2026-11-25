/**
 * Lições 6 a 10 de Arrays dinâmicos (CLASSIFICARPOR, FILTRO por pedaço do
 * texto, SEQUÊNCIA com datas, FILTRO dentro de outras funções, relatório de
 * pendências) e de Organizar dados (classificar em níveis, SUBTOTAL além da
 * soma, relatório de contas, duplicados, base de processos): os erros típicos
 * falham com a mensagem que explica o erro.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const formula = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"formula">;
const ferramenta = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"ferramenta">;

function comFormula(slug: string, f: string, celula?: string) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  p.definir(celula ?? ex.alvos[0].celula, f);
  return { r: corrigir(ex, p), p };
}
const inicial = (slug: string) => {
  const ex = exercicioPorSlug(slug)!;
  const p = Planilha.deExercicio(ex);
  return { r: corrigir(ex, p), p };
};

describe("arrays: CLASSIFICARPOR", () => {
  it("a pegadinha começa com #VALOR! (a linha do total entrou) e a dica aponta a linha 10", () => {
    const { r, p } = inicial("classificarpor-salario-pegadinha");
    expect(p.exibicao("F2")).toBe("#VALOR!");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("linha 10");
  });
  it("CLASSIFICAR só com os nomes não ordena pelo salário", () => {
    const { r } = comFormula("classificarpor-salario", "=CLASSIFICAR(A2:A9;1;-1)");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("use CLASSIFICARPOR");
  });
  it("a lista digitada à mão (fórmulas constantes) não acompanha a troca de salário", () => {
    const ex = formula("classificarpor-salario");
    const p = Planilha.deExercicio(ex);
    const nomes = (ex.alvos[0].esperado as string[][]).map((l) => l[0]);
    nomes.forEach((n, i) => p.definir(`F${i + 2}`, `="${n}"`));
    expect(corrigir(ex, p).ok).toBe(false);
  });
  it("pares invertidos (salário primeiro) deixam os setores misturados", () => {
    const { r } = comFormula("classificarpor-salario-variacao-b", "=CLASSIFICARPOR(A2:D9;D2:D9;-1;B2:B9;1)");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("o primeiro manda");
  });
});

describe("arrays: FILTRO por pedaço do texto", () => {
  it("o asterisco dentro do FILTRO dá #CALC! e a dica explica", () => {
    const { r, p } = inicial("filtro-texto-parcial-pegadinha");
    expect(p.exibicao("E2")).toBe("#CALC!");
    expect(r.falhas[0].mensagem).toContain("asterisco");
  });
  it("PROCURAR deixa LTDA e ltda de fora", () => {
    const { r } = comFormula("filtro-texto-parcial", '=FILTRO(A2:C9;ÉNÚM(PROCURAR("Ltda";A2:A9)))');
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("diferencia maiúsculas");
  });
  it("LOCALIZAR sem ÉNÚM é bloqueado (no Excel o erro estraga o FILTRO)", () => {
    const { r } = comFormula("filtro-texto-parcial", '=FILTRO(A2:C9;LOCALIZAR("Ltda";A2:A9))');
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("ÉNÚM");
  });
  it("a busca escrita na fórmula não acompanha a célula I1", () => {
    const { r } = comFormula("filtro-texto-parcial-variacao-a", '=FILTRO(A2:C9;ÉNÚM(LOCALIZAR("comércio";A2:A9)))');
    expect(r.ok).toBe(false);
  });
});

describe("arrays: SEQUÊNCIA com datas", () => {
  it("sem o -1, o carnê começa um mês depois", () => {
    const { r, p } = inicial("sequencia-cronograma-pegadinha");
    expect(p.exibicao("B6")).toBe("10/03/2027");
    expect(r.falhas[0].mensagem).toContain("zero meses");
  });
  it("o calendário começa no domingo da semana", () => {
    const ex = formula("sequencia-cronograma-variacao-b");
    const p = Planilha.deExercicio(ex);
    p.definir("A4", ex.alvos[0].solucaoReferencia);
    expect(p.exibicao("A4")).toBe("28/02/2027");
    expect(p.exibicao("B4")).toBe("01/03/2027");
    expect(p.exibicao("G9")).toBe("10/04/2027");
  });
});

describe("arrays: FILTRO dentro de outras funções", () => {
  it("contar o FILTRO conta faturas (6), não clientes (4)", () => {
    const { r, p } = inicial("filtro-dentro-de-funcoes-pegadinha");
    expect(p.valor("G4")).toBe(6);
    expect(r.falhas[0].mensagem).toContain("tire os repetidos");
  });
  it("CONT.VALORES de um FILTRO sem linhas dá 1 (o #CALC! é contado), como diz a questão", () => {
    const p = Planilha.deExercicio(formula("filtro-dentro-de-funcoes"));
    p.definir("G4", '=CONT.VALORES(FILTRO(A2:A9;D2:D9="Cancelado"))');
    expect(p.valor("G4")).toBe(1);
  });
});

describe("arrays: relatório de pendências", () => {
  it("o aviso dentro do FILTRO vira #VALOR! no CLASSIFICAR e a dica explica", () => {
    const { r, p } = comFormula("caso-relatorio-pendencias-pegadinha", '=CLASSIFICAR(FILTRO(A2:C11;(E2:E11="Pendente")*(D2:D11=H1);"Nenhuma pendência");2;1)');
    expect(p.exibicao("G4")).toBe("#VALOR!");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("função mais de fora");
  });
  it("com SEERRO por fora, passa e continua listando quem tem pendências", () => {
    const ex = formula("caso-relatorio-pendencias-pegadinha");
    const p = Planilha.deExercicio(ex);
    p.definir("G4", ex.alvos[0].solucaoReferencia);
    expect(corrigir(ex, p).ok).toBe(true);
  });
  it("classificar antes de filtrar desencontra as linhas", () => {
    const { r } = comFormula("caso-relatorio-pendencias", '=FILTRO(CLASSIFICAR(A2:C11;2;1);E2:E11="Pendente")');
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("Filtre primeiro");
  });
});

describe("dados: classificar em níveis", () => {
  it("níveis invertidos não passam e a mensagem fala do primeiro nível", () => {
    const ex = ferramenta("dados-classificar-niveis");
    const p = Planilha.deExercicio(ex);
    p.classificar({ intervalo: "A1:D11", chaves: [{ coluna: "D", ordem: "desc" }, { coluna: "B", ordem: "asc" }], cabecalho: true });
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("primeiro nível");
  });
  it("só o setor deixa os salários fora de ordem", () => {
    const ex = ferramenta("dados-classificar-niveis");
    const p = Planilha.deExercicio(ex);
    p.classificar({ intervalo: "A1:D11", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    expect(corrigir(ex, p).falhas[0].mensagem).toContain("E depois por");
  });
  it("na pegadinha, que começa por salário, refazer com dois níveis passa", () => {
    const ex = ferramenta("dados-classificar-niveis-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(corrigir(ex, p).ok).toBe(false);
    p.classificar({ intervalo: "A1:D11", chaves: [{ coluna: "B", ordem: "asc" }, { coluna: "D", ordem: "desc" }], cabecalho: true });
    expect(corrigir(ex, p).ok).toBe(true);
  });
});

describe("dados: SUBTOTAL, relatórios e duplicados", () => {
  it("SUBTOTAL(2) na coluna de nomes conta 0", () => {
    const { r, p } = inicial("dados-subtotal-outras-contas-pegadinha");
    expect(p.valor("D13")).toBe(0);
    expect(r.falhas[0].mensagem).toContain("tipo de dado");
  });
  it("MÁXIMO pega a viagem escondida pelo filtro", () => {
    const ex = ferramenta("dados-subtotal-outras-contas-variacao-a");
    const p = Planilha.deExercicio(ex);
    p.definir("D13", "=MÁXIMO(D2:D11)");
    expect(p.valor("D13")).toBe(2140);
    expect(corrigir(ex, p).ok).toBe(false);
  });
  it("o total que para em C10 deixa o Café e Copa de fora", () => {
    const { r, p } = inicial("dados-relatorio-contas-pegadinha");
    expect(p.valor("C13")).toBe(6810);
    expect(r.falhas[0].mensagem).toContain("intervalo da fórmula");
  });
  it("CONT.SE com o intervalo inteiro travado marca a original como cópia", () => {
    const { r, p } = inicial("dados-achar-duplicados-pegadinha");
    expect(p.valor("D2")).toBe(3);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("travado inteiro");
  });
  it("filtrar só Audiência perde a audiência digitada sem acento", () => {
    const ex = ferramenta("dados-caso-base-processos-pegadinha");
    const p = Planilha.deExercicio(ex);
    p.aplicarRecursos({ filtro: { intervalo: "A1:F11", criterios: { D: { valores: ["Audiência"] } } } });
    expect(p.valoresDaColuna(3)).toContain("audiencia");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("digitada de outro jeito");
  });
});

describe("etapa 5 das lições novas: questão de concurso conferida no motor", () => {
  const licoes = [
    "classificarpor-salario", "filtro-texto-parcial", "sequencia-cronograma", "filtro-dentro-de-funcoes", "caso-relatorio-pendencias",
    "dados-classificar-niveis", "dados-subtotal-outras-contas", "dados-relatorio-contas", "dados-achar-duplicados", "dados-caso-base-processos",
  ];
  const questoes = licoes.map((l) => exercicioPorSlug(`${l}-conceito`) as ExercicioDoTipo<"multiple_choice">);
  it("têm banca e tema, e as bancas se alternam", () => {
    for (const q of questoes) {
      expect(q.banca, q.slug).toBeTruthy();
      expect(q.tema, q.slug).toBeTruthy();
      expect(q.titulo.startsWith("Concurso: "), q.slug).toBe(true);
    }
    expect(new Set(questoes.map((q) => q.banca)).size).toBe(5);
  });
  for (const q of questoes)
    for (const c of q.conferir ?? [])
      it(`${q.slug}: o motor confirma ${c.formula}`, () => {
        const p = Planilha.deExercicio(q);
        const livre = { linha: q.grade.linhas - 1, coluna: q.grade.colunas - 1 };
        expect(p.definir(livre, c.formula)).toEqual({ ok: true });
        if (typeof c.esperado === "string" && c.esperado.startsWith("#")) expect(p.exibicao(livre)).toBe(c.esperado);
        else expect(p.valor(livre)).toEqual(c.esperado);
      });
});
