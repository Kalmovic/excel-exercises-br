import { describe, expect, it } from "vitest";
import legado from "./free/01-soma-total-de-vendas.json";
import { exercicioSchema } from "./schema";
import { MODULOS, exercicios, proximoExercicio, proximoModulo } from "./index";

describe("retrocompatibilidade do schema", () => {
  it("JSON sem `type` vira formula e nada mais muda", () => {
    expect("type" in legado).toBe(false);
    const parsed = exercicioSchema.parse(legado);
    expect(parsed.type).toBe("formula");
    const { type, ...resto } = parsed;
    expect(type).toBe("formula");
    expect(resto).toEqual(legado);
  });

  it("os 5 exercícios de Fundamentos continuam sendo de fórmula", () => {
    const f = exercicios.filter((e) => e.modulo === "fundamentos");
    expect(f).toHaveLength(5);
    expect(f.every((e) => e.type === "formula")).toBe(true);
  });

  it("tipo desconhecido é recusado", () => {
    expect(() => exercicioSchema.parse({ ...legado, type: "arrastar_e_soltar" })).toThrow();
  });
});

describe("conteúdo", () => {
  it("slugs e ids únicos", () => {
    expect(new Set(exercicios.map((e) => e.slug)).size).toBe(exercicios.length);
    expect(new Set(exercicios.map((e) => e.id)).size).toBe(exercicios.length);
  });

  it("todo exercício pertence a um módulo conhecido e a ordem não se repete no módulo", () => {
    for (const m of MODULOS) {
      const ordens = exercicios.filter((e) => e.modulo === m.slug).map((e) => e.ordem);
      expect(new Set(ordens).size).toBe(ordens.length);
    }
    expect(exercicios.every((e) => MODULOS.some((m) => m.slug === e.modulo))).toBe(true);
  });

  it("Intro vem antes de Fundamentos e tem 10 exercícios grátis", () => {
    expect(exercicios[0].modulo).toBe("intro");
    const intro = exercicios.filter((e) => e.modulo === "intro");
    expect(intro).toHaveLength(10);
    expect(intro.every((e) => e.plano === "free")).toBe(true);
  });
});

describe("navegação", () => {
  it("'Próximo' de Fundamentos continua igual", () => {
    expect(proximoExercicio("soma-total-de-vendas")?.slug).toBe("media-minimo-maximo");
    expect(proximoExercicio("media-minimo-maximo")?.slug).toBe("operadores-lucro");
    expect(proximoExercicio("operadores-lucro")?.slug).toBe("variacao-percentual");
    expect(proximoExercicio("variacao-percentual")?.slug).toBe("referencia-absoluta-comissao");
    expect(proximoExercicio("referencia-absoluta-comissao")).toBeUndefined();
  });

  it("o fim do Intro não pula para Fundamentos pelo 'Próximo'; isso é o próximo módulo", () => {
    expect(proximoExercicio("formato-porcentagem")).toBeUndefined();
    expect(proximoModulo("intro")?.primeiro.slug).toBe("soma-total-de-vendas");
    expect(proximoModulo("fundamentos")).toBeUndefined();
  });
});
