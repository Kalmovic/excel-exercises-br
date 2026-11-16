import { describe, expect, it } from "vitest";
import { deIntervalo } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { criarStore } from "./store";

const grade = { linhas: 5, colunas: 5, celulas: {} };

describe("store", () => {
  it("seleção fixa: clique, setas e edição não mudam nada, sem mensagem", () => {
    const s = criarStore(new Planilha(grade), deIntervalo("E4"), "", { selecaoFixa: true });
    s.getState().selecionarPeloMouse({ linha: 1, coluna: 2 });
    s.getState().mover(1, 0);
    expect(s.getState().iniciarEdicao("inserir", "x")).toBe(false);
    expect(s.getState().ancora).toEqual({ linha: 3, coluna: 4 });
    expect(s.getState().mudancasPeloMouse).toBe(0);
    expect(s.getState().mensagem).toBeNull();
  });

  it("sem seleção fixa: começa em A1 e conta mudanças pelo mouse", () => {
    const s = criarStore(new Planilha(grade));
    expect(s.getState().ancora).toEqual({ linha: 0, coluna: 0 });
    s.getState().selecionarPeloMouse({ linha: 0, coluna: 0 }); // mesma célula: não conta
    expect(s.getState().mudancasPeloMouse).toBe(0);
    s.getState().selecionarPeloMouse({ linha: 2, coluna: 2 });
    expect(s.getState().mudancasPeloMouse).toBe(1);
  });

  it("Ctrl+D numa célula só copia a de cima (como no Excel), ajustando a referência", () => {
    const p = new Planilha(grade);
    p.definir("A1", "5");
    p.definir("A2", "7");
    p.definir("B1", "=A1*2");
    const s = criarStore(p, deIntervalo("B2"));
    s.getState().preencherSelecao("baixo");
    expect(p.bruto("B2")).toBe("=A2*2");
    expect(p.valor("B2")).toBe(14);
  });

  it("Ctrl+D num intervalo copia a primeira linha para as de baixo", () => {
    const p = new Planilha(grade);
    p.definir("A1", "1");
    p.definir("A2", "2");
    p.definir("A3", "3");
    p.definir("B1", "=A1+10");
    const s = criarStore(p, deIntervalo("B1:B3"));
    s.getState().preencherSelecao("baixo");
    expect([p.valor("B2"), p.valor("B3")]).toEqual([12, 13]);
  });

  it("Ctrl+D na linha 1 não faz nada; Ctrl+R numa célula copia a da esquerda", () => {
    const p = new Planilha(grade);
    p.definir("A1", "=1+1");
    const s = criarStore(p, deIntervalo("A1"));
    s.getState().preencherSelecao("baixo");
    expect(p.bruto("A1")).toBe("=1+1");
    const r = criarStore(p, deIntervalo("B1"));
    r.getState().preencherSelecao("direita");
    expect(p.bruto("B1")).toBe("=1+1");
  });
});
