import { describe, expect, it } from "vitest";
import { CHAVE_INTERNO, ehVisitaInterna } from "./interno";

const armazenamento = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

describe("visita interna (fora do Analytics)", () => {
  it("?interno=1 marca o navegador; daí em diante, qualquer página é interna", () => {
    const s = armazenamento();
    expect(ehVisitaInterna("https://planilhes.com.br/", s)).toBe(false);
    expect(ehVisitaInterna("https://planilhes.com.br/?interno=1", s)).toBe(true);
    expect(ehVisitaInterna("https://planilhes.com.br/trilha", s)).toBe(true);
    expect(s.m.get(CHAVE_INTERNO)).toBe("1");
  });

  it("?interno=0 desliga", () => {
    const s = armazenamento();
    ehVisitaInterna("https://planilhes.com.br/?interno=1", s);
    expect(ehVisitaInterna("https://planilhes.com.br/pro?interno=0", s)).toBe(false);
    expect(ehVisitaInterna("https://planilhes.com.br/pro", s)).toBe(false);
  });

  it("armazenamento bloqueado: conta normalmente, sem quebrar", () => {
    const quebrado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => {}, removeItem: () => {} };
    expect(ehVisitaInterna("https://planilhes.com.br/", quebrado)).toBe(false);
  });
});
