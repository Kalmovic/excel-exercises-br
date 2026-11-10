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
});
