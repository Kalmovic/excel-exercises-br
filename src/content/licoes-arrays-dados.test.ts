/**
 * Lições 4 e 5 de Arrays dinâmicos (FILTRO com E/OU, ranking com PEGAR) e de
 * Organizar dados ((Vazias) e Pesquisar no filtro): os erros típicos falham
 * com a mensagem que explica o erro.
 */
import { describe, expect, it } from "vitest";
import { exercicioPorSlug } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";

const formula = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"formula">;
const ferramenta = (slug: string) => exercicioPorSlug(slug) as ExercicioDoTipo<"ferramenta">;

function comFormula(slug: string, f: string) {
  const ex = formula(slug);
  const p = Planilha.deExercicio(ex);
  p.definir("F2", f);
  return corrigir(ex, p);
}

describe("arrays: FILTRO com duas condições", () => {
  it("E() dentro do FILTRO dá #VALOR! e a dica explica", () => {
    const ex = formula("filtro-condicoes-e-ou-pegadinha");
    const p = Planilha.deExercicio(ex);
    expect(p.exibicao("F2")).toBe("#VALOR!");
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("A função E não serve");
  });
  it("+ no lugar de * mostra a dica do OU", () => {
    const r = comFormula("filtro-condicoes-e-ou", '=FILTRO(A2:D8;(B2:B8="Sul")+(D2:D8="Pago"))');
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("basta UMA condição");
  });
  it("faixa sem o igual deixa as pontas de fora", () => {
    const r = comFormula("filtro-condicoes-e-ou-variacao-b", "=FILTRO(A2:D8;(C2:C8>300)*(C2:C8<600))");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("As pontas também contam");
  });
});

describe("arrays: ranking com PEGAR", () => {
  it("PEGAR sem classificar não é o top 3", () => {
    const ex = formula("pegar-ranking-maiores-pegadinha");
    const r = corrigir(ex, Planilha.deExercicio(ex));
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("Sem classificar antes");
  });
  it("classificar depois de pegar não serve", () => {
    const r = comFormula("pegar-ranking-maiores", "=CLASSIFICAR(PEGAR(A2:D8;3);3;-1)");
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("A ordem das funções importa");
  });
});

describe("dados: (Vazias) e Pesquisar", () => {
  it("só (Vazias) não pega o traço", () => {
    const ex = ferramenta("dados-filtrar-vazias-pegadinha");
    const p = Planilha.deExercicio(ex);
    p.aplicarRecursos({ filtro: { intervalo: "A1:D10", criterios: { C: { valores: [""] } } } });
    expect(p.valoresDaColuna(2)).toEqual(["-", "Dr. Paulo", "Dra. Marina", ""]);
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("outro item");
  });
  it("contar a coluna Responsável dá 0 e não passa", () => {
    const ex = ferramenta("dados-filtrar-vazias-variacao-b");
    const p = Planilha.deExercicio(ex);
    p.aplicarRecursos({ filtro: { intervalo: "A1:D10", criterios: { C: { valores: [""] } } } });
    p.definir("C12", "=SUBTOTAL(3;C2:C10)");
    expect(p.valor("C12")).toBe(0);
    expect(corrigir(ex, p).ok).toBe(false);
  });
  it("pesquisar Ana e aceitar tudo traz Mariana e Luana junto", () => {
    const ex = ferramenta("dados-filtro-pesquisar-pegadinha");
    const p = Planilha.deExercicio(ex);
    p.aplicarRecursos({ filtro: { intervalo: "A1:D10", criterios: {} } });
    const achados = p.valoresDaColuna(0).filter((v) => v.toLowerCase().includes("ana"));
    expect(achados).toEqual(["Ana Paula Souza", "Ana Ribeiro", "Luana Martins", "Mariana Costa"]);
    p.filtrarColuna(0, achados);
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).toContain("qualquer parte do nome");
  });
});
