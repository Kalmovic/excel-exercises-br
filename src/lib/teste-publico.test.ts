import { describe, expect, it } from "vitest";
import { MODULOS, testeDoModulo } from "@/content";
import { exercicioSchema, type Exercicio } from "@/content/schema";
import { EXPLICACAO_DO_TESTE, exercicioParaTeste } from "./teste-publico";

const questoes = MODULOS.flatMap((m) => testeDoModulo(m.slug));

/** Os segredos de cada questão: nada disto pode chegar ao navegador. */
function segredos(q: Exercicio): string[] {
  const s = [...q.explicacao, ...q.dicas, ...(q.errosComuns ?? []).flatMap((e) => [e.padrao, e.dica]), ...(q.toque?.dicas ?? [])];
  if (q.video) s.push(q.video);
  switch (q.type) {
    case "formula":
      for (const a of q.alvos) s.push(a.solucaoReferencia, ...(typeof a.esperado === "string" ? [a.esperado] : []));
      break;
    case "text_answer":
      s.push(...q.aceitas.map((a) => `"${a}"`).filter((a) => !q.enunciado.join(" ").includes(a)));
      break;
    case "multiple_choice":
      s.push(...q.opcoes.flatMap((o) => (o.dica ? [o.dica] : [])));
      for (const c of q.conferir ?? []) s.push(c.formula);
      break;
    case "ferramenta":
      s.push(JSON.stringify(q.solucao), ...q.verificacoes.flatMap((v) => (v.mensagem ? [v.mensagem] : [])));
      break;
  }
  // O que a própria questão já mostra (enunciado, dados) não é segredo: "Ana Lima" pode
  // estar no enunciado como exemplo. Textos curtos ("Sim") aparecem por acaso nos dados.
  const visivel = JSON.stringify([q.titulo, q.intro, q.enunciado, q.toque?.enunciado, q.grade.celulas, q.abas?.map((a) => a.grade.celulas)]);
  return s.filter((x) => x.length >= 6 && !visivel.includes(JSON.stringify(x).slice(1, -1)));
}

describe("teste do módulo sem gabarito no navegador", () => {
  it("há questões de teste em todos os tipos usados", () => {
    expect(questoes.length).toBeGreaterThan(50);
    expect(new Set(questoes.map((q) => q.type)).size).toBeGreaterThanOrEqual(5);
  });

  it.each(questoes.map((q) => [q.slug, q] as const))("%s: o JSON enviado não contém nenhum segredo", (_, q) => {
    const publico = exercicioParaTeste(q);
    // É isto que vai no payload do React (.rsc e HTML): as props serializadas.
    const json = JSON.stringify(publico);
    for (const s of segredos(q)) expect(json, `vazou: ${s}`).not.toContain(JSON.stringify(s).slice(1, -1));
    expect(json).not.toMatch(/"errosComuns"|"variaveis"|"alternativas"|"solucao":\{"|"conferir"|"dica"/);
    expect(publico.dicas).toEqual([]);
    expect(publico.explicacao).toEqual([EXPLICACAO_DO_TESTE]);
    switch (publico.type) {
      case "formula":
        for (const a of publico.alvos) expect(a).toMatchObject({ esperado: 0, solucaoReferencia: "=0" });
        expect(publico.funcoesExigidas).toBeUndefined();
        break;
      case "type_value":
        for (const a of publico.alvos) expect(a.esperado).toBe(0);
        break;
      case "multiple_choice":
        expect(publico.correta).toBe(0);
        break;
      case "text_answer":
        expect(publico.aceitas).toEqual(["?"]);
        break;
      case "ferramenta":
        expect(publico.solucao).toEqual({});
        for (const v of publico.verificacoes) expect(v.tipo === "celula" ? v.esperado : 0).toBe(0);
        break;
    }
  });

  it.each(questoes.map((q) => [q.slug, q] as const))("%s: continua um exercício válido, com a mesma grade e os mesmos alvos na tela", (_, q) => {
    const publico = exercicioParaTeste(q);
    expect(exercicioSchema.safeParse(publico).success).toBe(true);
    expect(publico.grade.celulas).toEqual(q.grade.celulas);
    expect(publico.enunciado).toEqual(q.enunciado);
    if (publico.type === "formula" && q.type === "formula") expect(publico.alvos.map((a) => a.celula)).toEqual(q.alvos.map((a) => a.celula));
    if (publico.type === "multiple_choice" && q.type === "multiple_choice") expect(publico.opcoes.map((o) => o.texto)).toEqual(q.opcoes.map((o) => o.texto));
  });

  it("o exercício original não é alterado", () => {
    const q = questoes.find((x) => x.type === "formula")!;
    const antes = JSON.stringify(q);
    exercicioParaTeste(q);
    expect(JSON.stringify(q)).toBe(antes);
  });
});
