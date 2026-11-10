/**
 * Cada exercício do Intro precisa ser resolvível (a solução passa) e o erro
 * típico precisa falhar. Usa a planilha de verdade, como na tela.
 */
import { describe, expect, it } from "vitest";
import { deIntervalo } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { corrigir, type EstadoTela } from "@/grader/corrigir";
import { exercicioPorSlug } from "./index";

type Cenario = { acao?: (p: Planilha) => void; tela?: Partial<EstadoTela> };

const tela = (t: Partial<EstadoTela> = {}): EstadoTela => ({
  ativa: "A1",
  selecao: "A1",
  resposta: "",
  mudancasPeloMouse: 0,
  ...t,
});

function rodar(slug: string, c: Cenario) {
  const ex = exercicioPorSlug(slug)!;
  const p = Planilha.deExercicio(ex);
  c.acao?.(p);
  const r = corrigir(ex, p, tela(c.tela));
  p.destruir();
  return r;
}

const CASOS: Record<string, { certo: Cenario; errado: Cenario }> = {
  "nome-da-celula": { certo: { tela: { ativa: "E4", resposta: "e4" } }, errado: { tela: { ativa: "E4", resposta: "D4" } } },
  "clicar-em-uma-celula": { certo: { tela: { ativa: "C7", mudancasPeloMouse: 1 } }, errado: { tela: { ativa: "C6" } } },
  "navegar-pelo-teclado": {
    certo: { tela: { ativa: "C3" } },
    errado: { tela: { ativa: "C3", mudancasPeloMouse: 1 } },
  },
  "selecionar-intervalo": { certo: { tela: { selecao: "B2:D5" } }, errado: { tela: { selecao: "A1:D5" } } },
  "digitar-um-valor": { certo: { acao: (p) => p.definir("B3", "150") }, errado: { acao: (p) => p.definir("B2", "150") } },
  "editar-uma-celula": { certo: { acao: (p) => p.definir("C2", "120") }, errado: {} },
  "ler-a-barra-de-formulas": { certo: { tela: { resposta: "=B4+C4" } }, errado: { tela: { resposta: "300" } } },
  "primeira-formula": { certo: { acao: (p) => p.definir("C1", "=A1+B1") }, errado: { acao: (p) => p.definir("C1", "65") } },
  "formato-moeda": {
    certo: { acao: (p) => p.formatar(deIntervalo("B2:B5"), "moeda") },
    errado: { acao: (p) => p.formatar(deIntervalo("B2:B4"), "moeda") },
  },
  "formato-porcentagem": {
    certo: { acao: (p) => p.formatar(deIntervalo("C2"), "percentual") },
    errado: { acao: (p) => p.formatar(deIntervalo("C2"), "moeda") },
  },
};

describe.each(Object.entries(CASOS))("%s", (slug, { certo, errado }) => {
  it("existe no conteúdo", () => expect(exercicioPorSlug(slug)?.modulo).toBe("intro"));
  it("solução passa", () => expect(rodar(slug, certo).falhas).toEqual([]));
  it("erro típico falha", () => expect(rodar(slug, errado).ok).toBe(false));
});

describe("detalhes", () => {
  it("C2 do exercício de edição está desbloqueada; D2 (fórmula) continua bloqueada", () => {
    const p = Planilha.deExercicio(exercicioPorSlug("editar-uma-celula")!);
    expect(p.bloqueada("C2")).toBe(false);
    expect(p.bloqueada("D2")).toBe(true);
    p.definir("C2", "120");
    expect(p.valor("D2")).toBe(360);
  });

  it("formatar funciona em célula bloqueada e muda só a exibição", () => {
    const p = Planilha.deExercicio(exercicioPorSlug("formato-porcentagem")!);
    expect(p.exibicao("C2")).toBe("0,75");
    p.formatar(deIntervalo("C2"), "percentual");
    expect(p.exibicao("C2")).toBe("75%");
    expect(p.valor("C2")).toBe(0.75);
    expect(p.formatosDoAluno()).toEqual({ C2: "percentual" });
  });

  it("D4 mostra 300 e guarda =B4+C4", () => {
    const p = Planilha.deExercicio(exercicioPorSlug("ler-a-barra-de-formulas")!);
    expect(p.valor("D4")).toBe(300);
    expect(p.bruto("D4")).toBe("=B4+C4");
  });
});

describe("derramamento", () => {
  it("conteudos() não inclui as células derramadas (senão o FILTRO travaria ao restaurar)", () => {
    const p = new Planilha({
      linhas: 6,
      colunas: 4,
      celulas: { A1: { entrada: "b" }, A2: { entrada: "a" }, A3: { entrada: "b" } },
    });
    p.definir("C1", "=ÚNICO(A1:A3)");
    expect(p.valor("C2")).toBe("a");
    expect(p.conteudos()).toEqual({ A1: "b", A2: "a", A3: "b", C1: "=ÚNICO(A1:A3)" });
    // restaurar a partir de conteudos() mantém o derramamento
    const q = new Planilha({ linhas: 6, colunas: 4, celulas: { A1: { entrada: "b" }, A2: { entrada: "a" }, A3: { entrada: "b" } } });
    q.definirVarias(Object.entries(p.conteudos()).filter(([e]) => e.startsWith("C")).map(([endereco, bruto]) => ({ endereco, bruto })));
    expect(q.valor("C2")).toBe("a");
  });
});
