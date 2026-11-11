import { beforeEach, describe, expect, it } from "vitest";
import { calcularOfensiva, lerDias, registrarAtividade } from "./ofensiva";

describe("ofensiva", () => {
  it("conta os dias seguidos até hoje", () => {
    expect(calcularOfensiva(["2026-11-09", "2026-11-10", "2026-11-11"], "2026-11-11")).toEqual({ atual: 3, fezHoje: true, recorde: 3 });
  });
  it("quem jogou ontem e não hoje ainda mantém a sequência", () => {
    expect(calcularOfensiva(["2026-11-09", "2026-11-10"], "2026-11-11")).toEqual({ atual: 2, fezHoje: false, recorde: 2 });
  });
  it("pulou um dia: zera, mas o recorde fica", () => {
    expect(calcularOfensiva(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-09"], "2026-11-11")).toEqual({
      atual: 0,
      fezHoje: false,
      recorde: 3,
    });
  });
  it("vira o mês", () => {
    expect(calcularOfensiva(["2026-10-31", "2026-11-01"], "2026-11-01").atual).toBe(2);
  });
});

describe("registro", () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    } as unknown as Storage;
  });
  it("não repete o dia", () => {
    registrarAtividade("2026-11-11");
    registrarAtividade("2026-11-11");
    registrarAtividade("2026-11-10");
    expect(lerDias()).toEqual(["2026-11-10", "2026-11-11"]);
  });
});
