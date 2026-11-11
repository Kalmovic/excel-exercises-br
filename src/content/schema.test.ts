import { describe, expect, it } from "vitest";
import extrasFundamentos from "./extras/fundamentos.json";

// Exercício antigo, escrito antes do campo `type` existir.
const legado = extrasFundamentos[0];
import { exercicioSchema } from "./schema";
import { MODULOS, exercicioPorSlug, exercicios, exerciciosDoModulo, proximoExercicio, proximoModulo, questoesDaLicao, testeDoModulo } from "./index";

describe("retrocompatibilidade do schema", () => {
  it("JSON sem `type` vira formula e nada mais muda", () => {
    expect("type" in legado).toBe(false);
    const parsed = exercicioSchema.parse(legado);
    expect(parsed.type).toBe("formula");
    const { type, ...resto } = parsed;
    expect(type).toBe("formula");
    expect(resto).toEqual(legado);
  });

  it("os 7 exercícios de Fundamentos (fora a prática extra) são de fórmula", () => {
    const f = exerciciosDoModulo("fundamentos");
    expect(f).toHaveLength(7);
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

  it("todo exercício da trilha tem pelo menos uma dica (só o desafio diário é sem dica)", () => {
    expect(exercicios.filter((e) => !e.teste).every((e) => e.dicas.length > 0)).toBe(true);
  });

  it("trilha segue o roteiro: 52 exercícios, o 1º de cada módulo grátis", () => {
    const porModulo = MODULOS.map((m) => exerciciosDoModulo(m.slug).length);
    expect(porModulo).toEqual([10, 7, 5, 6, 5, 7, 5, 3, 4]);
    for (const m of MODULOS.slice(1)) {
      const lista = exerciciosDoModulo(m.slug);
      expect(lista[0].plano, m.slug).toBe("free");
      expect(lista.slice(1).every((e) => e.plano === "pro"), m.slug).toBe(true);
      expect(lista.every((e) => e.intro), m.slug).toBe(true);
    }
  });

  it("Intro vem antes de Fundamentos e tem 10 exercícios grátis", () => {
    expect(exercicios[0].modulo).toBe("intro");
    const intro = exercicios.filter((e) => e.modulo === "intro");
    expect(intro).toHaveLength(10);
    expect(intro.every((e) => e.plano === "free")).toBe(true);
  });
});

describe("lições de 5 questões e teste do módulo", () => {
  const comLicoes = ["fundamentos", "logica", "condicionais"];

  it("cada lição tem as 5 etapas, com o mesmo plano da principal", () => {
    for (const m of comLicoes)
      for (const l of exerciciosDoModulo(m)) {
        const q = questoesDaLicao(l.slug);
        expect(q.map((x) => x.etapa), l.slug).toEqual([1, 2, 3, 4, 5]);
        expect(q.every((x) => x.plano === l.plano), l.slug).toBe(true);
        expect(q[4].type, l.slug).toBe("multiple_choice");
      }
  });

  it("múltipla escolha tem a alternativa correta dentro da lista", () => {
    for (const e of exercicios)
      if (e.type === "multiple_choice") expect(e.correta, e.slug).toBeLessThan(e.opcoes.length);
  });

  it("teste do módulo: 5 questões, sem dica, cada uma apontando para uma lição que existe", () => {
    for (const m of comLicoes) {
      const t = testeDoModulo(m);
      expect(t, m).toHaveLength(5);
      for (const q of t) {
        expect(q.dicas).toEqual([]);
        expect(exercicioPorSlug(q.revisar!)?.etapa, q.slug).toBe(1);
      }
    }
  });

  it("o Intro continua sem lições de 5 questões", () => {
    expect(exercicios.filter((e) => e.modulo === "intro").every((e) => !e.licao)).toBe(true);
  });
});

describe("navegação", () => {
  it("'Próximo' de Fundamentos segue o roteiro", () => {
    expect(proximoExercicio("soma-total-de-vendas")?.slug).toBe("soma-total-de-vendas-variacao-a");
    expect(proximoExercicio("soma-total-de-vendas-conceito")?.slug).toBe("media-mensal-de-vendas");
    expect(proximoExercicio("referencia-mista-precos-quantidades-conceito")).toBeUndefined();
  });

  it("a prática extra tem o próprio 'próximo' e não entra na trilha", () => {
    expect(proximoExercicio("media-minimo-maximo")?.slug).toBe("operadores-lucro");
    expect(exercicios.filter((e) => e.extra).every((e) => e.plano === "pro")).toBe(true);
  });

  it("o fim do Intro não pula para Fundamentos pelo 'Próximo'; isso é o próximo módulo", () => {
    expect(proximoExercicio("formato-porcentagem")).toBeUndefined();
    expect(proximoModulo("intro")?.primeiro.slug).toBe("soma-total-de-vendas");
    expect(proximoModulo("fundamentos")?.primeiro.slug).toBe("se-aprovado");
    expect(proximoModulo("casos")).toBeUndefined();
  });
});

describe("descrição das células do exercício", () => {
  it("agrupa trechos contínuos por coluna", async () => {
    const { agruparEmIntervalos } = await import("./destaque");
    expect(agruparEmIntervalos(["E2", "E3", "E4", "E5", "E6", "F2", "F3", "F4", "F5", "F6", "F8"])).toBe("E2:E6, F2:F6, F8");
    expect(agruparEmIntervalos(["D2", "D3", "D4", "D5", "D6"])).toBe("D2:D6");
  });
});
