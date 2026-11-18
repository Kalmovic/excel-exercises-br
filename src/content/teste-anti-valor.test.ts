/**
 * Questões do teste do módulo (as que valem o certificado): o valor esperado
 * digitado como fórmula constante (`=30`, `="OK"`) tem que ser recusado. O
 * `exigeFormula` não pega isso, só a perturbação (`grade.variaveis` e
 * `grade.alternativas`) pega. Sem ela, dá para passar no teste sem saber a função.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo, Valor } from "./schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "@/grader/corrigir";
import { deEndereco, paraEndereco } from "@/engine/address";

/** O valor como fórmula constante, do jeito que o aluno digitaria. */
function comoConstante(v: Valor): string {
  if (typeof v === "number") return "=" + String(v).replace(".", ",");
  if (typeof v === "boolean") return v ? "=VERDADEIRO" : "=FALSO";
  if (v === null) return '=""';
  if (typeof v === "object") {
    const [a, m, d] = v.data.split("-").map(Number);
    return `=DATA(${a};${m};${d})`;
  }
  return `="${v.replace(/"/g, '""')}"`;
}

const testes = exercicios.filter((e): e is ExercicioDoTipo<"formula"> => e.type === "formula" && e.teste === true);

describe("teste do módulo: valor esperado digitado como fórmula constante é recusado", () => {
  it("há questões de fórmula nos testes", () => expect(testes.length).toBeGreaterThan(30));

  it.each(testes.map((e) => [e.slug, e] as const))("%s", (_, ex) => {
    const p = Planilha.deExercicio(ex);
    for (const a of ex.alvos) {
      const base = deEndereco(a.celula);
      const matriz = Array.isArray(a.esperado) ? a.esperado : [[a.esperado]];
      matriz.forEach((linha, dl) =>
        linha.forEach((v, dc) => {
          const end = paraEndereco({ linha: base.linha + dl, coluna: base.coluna + dc });
          expect(p.definir(end, comoConstante(v))).toEqual({ ok: true });
        }),
      );
    }
    // Sanidade: o valor bate (senão a recusa viria do valor, não da perturbação).
    const r = corrigir(ex, p);
    expect(r.ok, JSON.stringify(r.falhas)).toBe(false);
    expect(r.falhas.map((f) => f.motivo)).toContain("valor-fixo");
  });
});
