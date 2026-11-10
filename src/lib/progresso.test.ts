import { beforeEach, describe, expect, it } from "vitest";
import * as progresso from "./progresso";

// localStorage e window mínimos para rodar em Node.
const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  window: { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} },
  Event: class {},
});

beforeEach(() => mem.clear());

describe("progresso no localStorage", () => {
  it("lê o formato salvo antes do Intro (sem formatos/resposta)", () => {
    mem.set(
      "excel-br:progresso:v1",
      JSON.stringify({
        "soma-total-de-vendas": {
          versao: 1,
          status: "concluido",
          tentativas: 2,
          conteudos: { B8: "=SOMA(B2:B7)" },
          atualizadoEm: "2026-11-09T12:00:00.000Z",
        },
      }),
    );
    const p = progresso.ler("soma-total-de-vendas", 1)!;
    expect(p.status).toBe("concluido");
    expect(p.conteudos.B8).toBe("=SOMA(B2:B7)");
    expect(p.formatos).toBeUndefined();
    expect(progresso.trilhaConcluida([{ slug: "soma-total-de-vendas", versao: 1 }])).toBe(true);
  });

  it("pular marca como pulado, mas não conta como feito", () => {
    progresso.pular("nome-da-celula", 1);
    expect(progresso.ler("nome-da-celula", 1)?.status).toBe("pulado");
    expect(progresso.trilhaConcluida([{ slug: "nome-da-celula", versao: 1 }])).toBe(false);
  });

  it("pular não desfaz um exercício concluído", () => {
    progresso.salvar("x", { versao: 1, status: "concluido", tentativas: 1, conteudos: {} });
    progresso.pular("x", 1);
    expect(progresso.ler("x", 1)?.status).toBe("concluido");
  });

  it("troféus são por módulo", () => {
    expect(progresso.registrarTrofeu("intro")).toBe(true);
    expect(progresso.registrarTrofeu("intro")).toBe(false);
    expect(progresso.lerTrofeus().fundamentos).toBeUndefined();
  });
});
