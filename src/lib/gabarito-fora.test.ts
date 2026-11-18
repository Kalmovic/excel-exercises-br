/**
 * Regressão da segunda revisão adversarial (P0-A): as 75 questões de teste
 * também eram geradas como páginas comuns em /exercicios/teste-*, com o
 * gabarito no HTML. Nenhuma questão de teste pode ter página de exercício.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "@/content";
import { temPaginaDeExercicio } from "./acesso-conteudo";
import { generateStaticParams } from "@/app/(app)/exercicios/[slug]/page";
import sitemap from "@/app/sitemap";

describe("gabarito do teste fora das páginas de exercício", () => {
  const testes = exercicios.filter((e) => e.teste);

  it("há questões de teste, e nenhuma tem página de exercício", () => {
    expect(testes.length).toBeGreaterThan(50);
    expect(testes.filter(temPaginaDeExercicio)).toEqual([]);
  });

  it("generateStaticParams não gera nenhuma", () => {
    const slugs = new Set(generateStaticParams().map((p) => p.slug));
    expect(testes.filter((t) => slugs.has(t.slug)).map((t) => t.slug)).toEqual([]);
    expect(slugs.size).toBeGreaterThan(300); // as lições continuam
  });

  it("o sitemap não lista nenhuma", () => {
    const urls = sitemap().map((u) => u.url);
    expect(urls.filter((u) => /\/exercicios\/teste-/.test(u))).toEqual([]);
  });
});
