/**
 * Múltipla escolha das lições: quem erra lê por que aquela alternativa está
 * errada (sem entregar a certa), e a dica da questão aponta o conceito.
 * O teste do módulo fica de fora: é sem dica.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo } from "./schema";

const licoes = exercicios.filter(
  (e): e is ExercicioDoTipo<"multiple_choice"> => e.type === "multiple_choice" && !e.teste,
);

describe("múltipla escolha das lições", () => {
  it.each(licoes.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
    ex.opcoes.forEach((o, i) => {
      if (i !== ex.correta) expect(o.dica, `alternativa ${i} ("${o.texto}") sem dica`).toBeTruthy();
    });
    for (const d of ex.dicas) expect(d).not.toMatch(/^Releia a pergunta com calma/);
  });
});
