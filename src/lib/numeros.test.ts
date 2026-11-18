import { expect, test } from "vitest";
import { MODULOS, testeDoModulo } from "@/content";
import { modulosDoEspecialista } from "./especialista";
import { numerosDoConteudo } from "./numeros";

test("os números das páginas fecham entre si", () => {
  const n = numerosDoConteudo();
  expect(n.modulos).toBe(MODULOS.length);
  expect(n.modulosAlemDoIntro).toBe(n.modulos - 1);
  expect(n.ultimoModulo).toBe(n.modulos - 1); // numerados de 0 a N-1, sem buracos
  expect(n.questoesLicaoGratis + n.questoesLicaoPro).toBe(n.questoesLicao);
  // Todo módulo tem teste, e o certificado de Especialista pede todos eles.
  expect(n.testes).toBe(n.modulos);
  expect(modulosDoEspecialista().length).toBe(n.testes);
  expect(n.testesPro).toBe(testeDoModulo("intro").some((q) => q.plano === "pro") ? n.testes : n.testes - 1);
  expect(n.simulados).toBeGreaterThan(0);
});
