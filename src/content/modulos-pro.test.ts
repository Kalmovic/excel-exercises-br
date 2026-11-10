import { describe, expect, it } from "vitest";
import { desafios } from "./desafios";
import { MODULOS_PLANEJADOS, upsellDoExercicio } from "./modulos-pro";

describe("upsell do desafio", () => {
  it("todo desafio tem um gancho para um módulo Pro", () => {
    for (const d of desafios) expect(upsellDoExercicio(d.exercicio), d.data).not.toBeNull();
  });

  it("escolhe o módulo mais avançado entre as funções usadas", () => {
    const filtro = desafios.find((d) => d.data === "2026-11-12")!; // CONT.SE + FILTRO
    expect(upsellDoExercicio(filtro.exercicio)).toEqual({
      usadas: ["CONT.SE", "FILTRO"],
      modulo: { titulo: "Arrays dinâmicos", funcoes: ["FILTRO", "CLASSIFICAR", "ÚNICO", "SEQUÊNCIA"] },
    });
    const procx = desafios.find((d) => d.data === "2026-11-11")!;
    expect(upsellDoExercicio(procx.exercicio)?.modulo.titulo).toBe("Busca");
  });

  it("nenhuma função aparece em dois módulos", () => {
    const todas = MODULOS_PLANEJADOS.flatMap((m) => [...m.funcoes]);
    expect(new Set(todas).size).toBe(todas.length);
  });
});
