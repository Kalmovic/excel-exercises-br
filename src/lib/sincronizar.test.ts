import { describe, expect, it } from "vitest";
import type { ProgressoExercicio } from "./progresso";
import { chavesAlteradas, juntarEstado, juntarProgresso, juntarTestes, melhorProgresso } from "./sincronizar";

const p = (status: ProgressoExercicio["status"], versao = 1, atualizadoEm = "2026-11-01T10:00:00Z"): ProgressoExercicio => ({
  versao,
  status,
  tentativas: 1,
  conteudos: {},
  atualizadoEm,
});

describe("juntar progresso do navegador com o da conta", () => {
  it("concluído não volta a em andamento, mesmo que o outro seja mais recente", () => {
    const feito = p("concluido", 1, "2026-11-01T10:00:00Z");
    const depois = p("em-andamento", 1, "2026-11-05T10:00:00Z");
    expect(melhorProgresso(feito, depois)).toBe(feito);
    expect(melhorProgresso(depois, feito)).toBe(feito);
  });

  it("versão nova do exercício ganha (a antiga era de outro enunciado)", () => {
    const antigo = p("concluido", 1);
    const novo = p("em-andamento", 2);
    expect(melhorProgresso(antigo, novo)).toBe(novo);
  });

  it("empate: fica o gravado por último", () => {
    const a = { ...p("em-andamento", 1, "2026-11-01T10:00:00Z"), conteudos: { B2: "=1" } };
    const b = { ...p("em-andamento", 1, "2026-11-02T10:00:00Z"), conteudos: { B2: "=2" } };
    expect(melhorProgresso(a, b)).toBe(b);
  });

  it("une as questões dos dois lados", () => {
    const junto = juntarProgresso({ x: p("concluido") }, { y: p("pulado") });
    expect(Object.keys(junto).sort()).toEqual(["x", "y"]);
  });
});

describe("juntar o resto do estado", () => {
  it("troféus e ofensiva somam; preferência do navegador vale", () => {
    const junto = juntarEstado(
      { trofeus: { intro: "2026-11-03" }, preferencias: { pularIntro: false }, ofensiva: ["2026-11-03"], testes: {} },
      { trofeus: { intro: "2026-11-01", logica: "2026-11-02" }, preferencias: { pularIntro: true }, ofensiva: ["2026-11-01", "2026-11-03"], testes: {} },
    );
    expect(junto.trofeus).toEqual({ intro: "2026-11-01", logica: "2026-11-02" });
    expect(junto.ofensiva).toEqual(["2026-11-01", "2026-11-03"]);
    expect(junto.preferencias.pularIntro).toBe(false);
  });

  it("teste: aprovação não se perde e fica a melhor nota", () => {
    const junto = juntarTestes(
      { logica: { acertos: 4, total: 5, aprovado: true, em: "2026-11-01", tentativas: 1 } },
      { logica: { acertos: 3, total: 5, aprovado: false, em: "2026-11-05", tentativas: 3 } },
    );
    expect(junto.logica).toEqual({ acertos: 4, total: 5, aprovado: true, em: "2026-11-01", tentativas: 3 });
  });
});

it("só sobe o que mudou", () => {
  const atual = { x: p("concluido"), y: p("em-andamento") };
  const enviado = { x: JSON.stringify(atual.x) };
  expect(chavesAlteradas(atual, enviado)).toEqual(["y"]);
});
