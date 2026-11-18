// Limite de requisições: muitos IPs novos não soltam quem já está barrado; na Vercel o XFF forjado não vale.
import { beforeEach, describe, expect, it } from "vitest";
import { limitar, zerarLimites } from "@/lib/limite";

const h = (ip: string) => new Headers({ "x-forwarded-for": ip });

describe("limite: contornos (revisão 2)", () => {
  beforeEach(() => zerarLimites());

  it("na Vercel, o IP escrito pela plataforma vence o X-Forwarded-For forjado", () => {
    const v = (xff: string) => new Headers({ "x-forwarded-for": xff, "x-vercel-forwarded-for": "1.1.1.1" });
    for (let i = 0; i < 30; i++) expect(limitar(v("1.1.1.1"), "corrigirTeste")).toBeNull();
    expect(limitar(v("9.9.9.9, 1.1.1.1"), "corrigirTeste")?.status).toBe(429);
  });

  it("10.000 chaves novas zeram os baldes de TODO MUNDO (faxina → clear)", () => {
    for (let i = 0; i < 30; i++) limitar(h("1.1.1.1"), "corrigirTeste");
    expect(limitar(h("1.1.1.1"), "corrigirTeste")?.status).toBe(429);
    for (let i = 0; i < 10_000; i++) limitar(h(`10.0.${i >> 8}.${i & 255}`), "corrigirTeste");
    // Quem já estava barrado continua barrado.
    expect(limitar(h("1.1.1.1"), "corrigirTeste")?.status).toBe(429);
  });
});
