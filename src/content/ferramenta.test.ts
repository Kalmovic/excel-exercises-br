/**
 * Exercícios de ferramenta (classificar, filtrar, SUBTOTAL): a solução do
 * conteúdo passa na correção, a tela inicial não passa, e o servidor (que
 * corrige de novo para o certificado) chega ao mesmo resultado só com o que o
 * progresso guarda.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { conferirQuestao } from "@/grader/conferir-teste";

const ferramentas = exercicios.filter((e): e is ExercicioDoTipo<"ferramenta"> => e.type === "ferramenta");

function resolver(ex: ExercicioDoTipo<"ferramenta">) {
  const p = Planilha.deExercicio(ex);
  if (ex.solucao.recursos) p.aplicarRecursos(ex.solucao.recursos);
  p.definirVarias(Object.entries(ex.solucao.celulas ?? {}).map(([endereco, bruto]) => ({ endereco, bruto })));
  return p;
}

describe("exercícios de ferramenta", () => {
  it("existem (módulo Organizar dados)", () => expect(ferramentas.length).toBeGreaterThanOrEqual(10));

  describe.each(ferramentas.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
    it("a solução passa", () => expect(corrigir(ex, resolver(ex)).falhas).toEqual([]));
    it("a tela inicial não passa", () => expect(corrigir(ex, Planilha.deExercicio(ex)).ok).toBe(false));
    it("o servidor confere igual a partir do progresso salvo", () => {
      const p = resolver(ex);
      const conteudos = Object.fromEntries(Object.entries(p.conteudos()).filter(([end]) => !p.bloqueada(end)));
      expect(conferirQuestao(ex, { conteudos, recursos: JSON.parse(JSON.stringify(p.recursos())) })).toBe(true);
    });
  });

  it("SOMA no lugar de SUBTOTAL é recusada", () => {
    const ex = ferramentas.find((e) => e.slug === "dados-subtotal-visiveis")!;
    const p = Planilha.deExercicio(ex);
    p.definir("C12", "=SOMA(C2:C10)");
    expect(corrigir(ex, p).ok).toBe(false);
  });

  it("pegadinha das duas ordens: classificar na ordem errada não passa", () => {
    const ex = ferramentas.find((e) => e.slug === "dados-classificar-maior-valor-pegadinha")!;
    const p = Planilha.deExercicio(ex);
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "C", ordem: "desc" }], cabecalho: true });
    const r = corrigir(ex, p);
    expect(r.ok).toBe(false);
  });

  it("pegadinha do filtro esquecido: só filtrar Status não passa", () => {
    const ex = ferramentas.find((e) => e.slug === "dados-filtrar-regiao-pegadinha")!;
    const p = Planilha.deExercicio(ex);
    p.filtrarColuna(3, ["Pendente"]);
    const r = corrigir(ex, p);
    expect(r.falhas[0].mensagem).toContain("sobrou filtro");
  });

  it("recursos maliciosos no envio do certificado não quebram a correção", () => {
    const ex = ferramentas[0];
    expect(conferirQuestao(ex, { conteudos: {}, recursos: { filtro: { intervalo: "ZZ999", criterios: {} } } })).toBe(false);
    expect(conferirQuestao(ex, { conteudos: {}, recursos: "lixo" as never })).toBe(false);
  });

  describe("tabela dinâmica: a correção diz o que mudar", () => {
    const ex = ferramentas.find((e) => e.slug === "dinamica-total-por-regiao-pegadinha")!;
    const montar = (config: Partial<import("./schema").Dinamica>) => {
      const p = Planilha.deExercicio(ex);
      p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 14, coluna: 4 } }, { linha: 0, coluna: 6 });
      p.configurarDinamica(0, { ...p.tabelasDinamicas()[0].config, ...config });
      return corrigir(ex, p);
    };
    it("sem tabela", () => expect(corrigir(ex, Planilha.deExercicio(ex)).falhas[0].mensagem).toContain("Ainda não há tabela dinâmica"));
    it("Soma no lugar de Média", () =>
      expect(montar({ linhas: ["D"], valores: [{ campo: "E", funcao: "soma" }] }).falhas[0].mensagem).toContain("“Soma de Valor”"));
    it("campo errado em Linhas", () =>
      expect(montar({ linhas: ["C"], valores: [{ campo: "E", funcao: "media" }] }).falhas[0].mensagem).toContain("Em Linhas está Região"));
    it("campo a mais em Colunas", () =>
      expect(montar({ linhas: ["D"], colunas: ["A"], valores: [{ campo: "E", funcao: "media" }] }).falhas[0].mensagem).toContain("Tire Canal de Colunas"));
    it("certo", () => expect(montar({ linhas: ["D"], valores: [{ campo: "E", funcao: "media" }] }).ok).toBe(true));
  });

  it("pegadinha do Total Geral: somar a coluna inteira da tabela dinâmica não passa", () => {
    const ex = ferramentas.find((e) => e.slug === "dinamica-usar-resultado-pegadinha")!;
    const p = Planilha.deExercicio(ex);
    expect(p.definir("H8", "=SOMA(H2:H5)").ok).toBe(true);
    expect(corrigir(ex, p).ok).toBe(false);
  });
});
