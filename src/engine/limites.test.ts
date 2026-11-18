/**
 * Limites da própria Planilha (seguranca.md P0-1 e P0/P1-3, adversarial.md S2):
 * o que vem da internet ou de uma tela adulterada não trava nem estoura a memória.
 */
import { describe, expect, it } from "vitest";
import { Planilha, type Grade } from "./engine";
import { deIntervalo } from "./address";
import { exercicios } from "@/content/index";
import { recursosSchema, type RegraCondicional } from "@/content/schema";
import { conferirQuestao } from "@/grader/conferir-teste";

const grade = (linhas = 10, colunas = 6): Grade => ({ linhas, colunas, celulas: { A1: { entrada: "x" }, B2: { entrada: "5" } } });

describe("fora da grade", () => {
  it("formatar recorta o intervalo na grade e ignora o que fica todo fora", () => {
    const p = new Planilha(grade());
    p.formatar(deIntervalo("A1:ZZ999"), "moeda");
    expect(Object.keys(p.formatosDoAluno())).toHaveLength(60);
    p.formatar(deIntervalo("Z50:ZZ999"), "percentual");
    expect(Object.keys(p.formatosDoAluno())).toHaveLength(60);
  });

  it("definirVarias ignora endereços fora da grade ou mal formados", () => {
    const p = new Planilha(grade());
    p.definirVarias([
      { endereco: "ZZ999", bruto: "1" },
      { endereco: "A0", bruto: "1" },
      { endereco: "lixo", bruto: "1" },
      { endereco: "C3", bruto: "2" },
    ]);
    expect(p.conteudosDoAluno()).toEqual({ C3: "2" });
  });

  it("definir recusa além do maior exercício possível", () => {
    const p = new Planilha(grade());
    expect(p.definir("ZZ999", "1").ok).toBe(false);
  });
});

describe("histórico em memória", () => {
  it("guarda no máximo 200 ações e um total limitado de células", () => {
    const p = new Planilha(grade(50, 26));
    for (let i = 0; i < 300; i++) p.definir("C3", String(i));
    expect(p.tamanhoDoHistorico().acoes).toBe(200);
    for (let i = 0; i < 200; i++) p.formatar(deIntervalo("A1:Z50"), i % 2 ? "moeda" : "percentual");
    expect(p.tamanhoDoHistorico().celulas).toBeLessThanOrEqual(60_000);
    // Ainda dá para desfazer o mais recente.
    p.desfazer();
    expect(p.formatoDe("A1")).toBe("percentual");
  });
});

describe("regras condicionais com orçamento", () => {
  it("20 regras de fórmula na grade inteira terminam rápido; as mais novas valem", () => {
    const p = new Planilha(grade(50, 26));
    for (let i = 0; i < 20; i++) expect(p.adicionarRegra({ tipo: "formula", intervalo: "A1:Z50", formula: "=$B$2>0", estilo: "vermelho" }).ok).toBe(true);
    const t = performance.now();
    p.definir("C3", "1");
    expect(performance.now() - t).toBeLessThan(1500);
    expect(p.estiloCondicional("A1")?.destaque).toBe("vermelho");
  });
});

describe("S2: o que a tela grava, o schema aceita", () => {
  it("regra com valor de mais de 100 caracteres é recusada com mensagem clara", () => {
    const p = new Planilha({ linhas: 5, colunas: 3, celulas: { A1: { entrada: "x" } } });
    const r = p.adicionarRegra({ tipo: "texto", intervalo: "A1:A3", valor: "a".repeat(101), estilo: "vermelho" });
    expect(r).toEqual({ ok: false, mensagem: "O valor da regra pode ter no máximo 100 caracteres." });
    expect(recursosSchema.safeParse(p.recursos()).success).toBe(true);
  });

  it("validação com Fonte longa é recusada; títulos longos são cortados", () => {
    const p = new Planilha(grade());
    expect(p.adicionarValidacao({ intervalo: "C2:C4", permitir: "lista", fonte: "a;".repeat(300) }).ok).toBe(false);
    expect(
      p.adicionarValidacao({ intervalo: "C2:C4", permitir: "lista", fonte: "Sim;Não", erro: { titulo: "t".repeat(80), texto: "x".repeat(400) } }).ok,
    ).toBe(true);
    expect(recursosSchema.safeParse(p.recursos()).success).toBe(true);
  });
});

describe("pior pacote do certificado (seguranca.md P0-1)", () => {
  it("300 formatos A1:ZZ999 e 20 regras de fórmula: rápido e sem estourar a memória", () => {
    const q = exercicios.find((e) => e.teste && e.type === "formula")!;
    const formatos = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`A${i + 1}:ZZ999`, "moeda" as const]));
    const regras: RegraCondicional[] = Array.from({ length: 20 }, () => ({ tipo: "formula", intervalo: "A1:ZZ999", formula: "=$B$2>0", estilo: "vermelho" }));
    const heap = process.memoryUsage().heapUsed;
    const t = performance.now();
    conferirQuestao(q, { conteudos: {}, formatos, recursos: { condicionais: regras } });
    conferirQuestao(q, { conteudos: {}, formatos: { "A1:ZZ999": "moeda" }, recursos: { condicionais: regras } });
    expect(performance.now() - t).toBeLessThan(2000);
    expect(process.memoryUsage().heapUsed - heap).toBeLessThan(150 * 1024 * 1024);
  });
});
