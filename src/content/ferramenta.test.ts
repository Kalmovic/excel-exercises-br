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
import { deIntervalo } from "@/engine/address";

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
      const conteudos = p.conteudosDoAluno();
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

  describe("formatação condicional: a correção conta sem entregar", () => {
    const ex = ferramentas.find((e) => e.slug === "destaque-vendas-baixas-pegadinha")!;
    const com = (r: import("./schema").RegraCondicional) => {
      const p = Planilha.deExercicio(ex);
      expect(p.adicionarRegra(r).ok).toBe(true);
      return corrigir(ex, p);
    };
    it("Maior do que 1000 deixa de fora quem vendeu exatamente 1000", () =>
      expect(com({ tipo: "maior", intervalo: "C2:C11", valor: "1000", estilo: "verde" }).falhas[0].mensagem).toContain(
        "2 células que deveriam estar destacadas",
      ));
    it("Entre 1000 e um valor alto também acerta", () =>
      expect(com({ tipo: "entre", intervalo: "C2:C11", valor: "1000", valor2: "1000000", estilo: "verde" }).ok).toBe(true));
    it("Maior do que 999,99 também acerta", () => expect(com({ tipo: "maior", intervalo: "C2:C11", valor: "999,99", estilo: "verde" }).ok).toBe(true));
    it("cor errada", () =>
      expect(com({ tipo: "maior", intervalo: "C2:C11", valor: "999,99", estilo: "vermelho" }).falhas[0].mensagem).toContain("outra cor"));
  });

  describe("gráficos: a correção aponta a pegadinha", () => {
    const comGrafico = (slug: string, tipo: import("./schema").TipoGrafico, dados: string, ajuste: Partial<import("./schema").Grafico> = {}) => {
      const ex = ferramentas.find((e) => e.slug === slug)!;
      const p = Planilha.deExercicio(ex);
      expect(p.inserirGrafico(tipo, deIntervalo(dados)).ok).toBe(true);
      if (Object.keys(ajuste).length) p.configurarGrafico(0, { ...p.graficos()[0], ...ajuste });
      return corrigir(ex, p);
    };
    it("linha do Total junto", () =>
      expect(comGrafico("grafico-vendas-por-mes-pegadinha", "colunas", "A1:B8").falhas[0].mensagem).toContain("uma categoria a mais"));
    it("sem Alternar Linha/Coluna", () =>
      expect(comGrafico("grafico-participacao-canal-pegadinha", "colunas", "A1:D4").falhas[0].mensagem).toContain("Alternar Linha/Coluna"));
    it("ano lido como série", () =>
      expect(comGrafico("grafico-duas-series-pegadinha", "linhas", "A1:B6").falhas[0].mensagem).toContain("virou série"));
    it("tipo errado com os dados certos", () =>
      expect(comGrafico("grafico-participacao-canal", "colunas", "A1:B5").falhas[0].mensagem).toContain("não é o melhor"));
    it("falta o título", () =>
      expect(comGrafico("grafico-vendas-por-mes-variacao-b", "colunas", "A1:B7").falhas[0].mensagem).toContain("Falta o título"));
  });
});
