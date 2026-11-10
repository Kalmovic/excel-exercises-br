/** Validadores dos tipos novos, testados com um estado falso (sem planilha). */
import { describe, expect, it } from "vitest";
import { exercicioSchema, type ExercicioDoTipo, type Formato, type TipoExercicio } from "@/content/schema";
import type { ValorCelula } from "@/engine/format";
import type { EstadoCorrecao } from "../tipos";
import { validarClickCell } from "./click-cell";
import { validarFormatCell } from "./format-cell";
import { validarSelectRange } from "./select-range";
import { normalizarResposta, validarTextAnswer } from "./text-answer";
import { validarTypeValue } from "./type-value";

const base = {
  id: "00000000-0000-4000-8000-000000000000",
  slug: "teste",
  trilha: "excel-ptbr",
  modulo: "intro",
  ordem: 1,
  nivel: 1,
  plano: "free",
  versao: 1,
  titulo: "Teste",
  enunciado: ["x"],
  grade: { linhas: 5, colunas: 5, celulas: {} },
  dicas: ["x"],
  explicacao: ["x"],
  tentativasAteExplicacao: 3,
};

function ex<T extends TipoExercicio>(type: T, extra: object) {
  return exercicioSchema.parse({ ...base, type, ...extra }) as ExercicioDoTipo<T>;
}

function estado(p: Partial<EstadoCorrecao> & { valores?: Record<string, ValorCelula>; formatos?: Record<string, Formato> } = {}): EstadoCorrecao {
  const { valores = {}, formatos = {}, ...resto } = p;
  return {
    valor: (e) => valores[e] ?? null,
    formato: (e) => formatos[e],
    temFormula: () => false,
    exibicao: (e) => String(valores[e] ?? ""),
    ativa: "A1",
    selecao: "A1",
    resposta: "",
    mudancasPeloMouse: 0,
    ...resto,
  };
}

describe("text_answer", () => {
  const endereco = ex("text_answer", { rotulo: "?", aceitas: ["E4"], normalizar: "endereco" });
  const formula = ex("text_answer", { rotulo: "?", aceitas: ["=B4+C4"], normalizar: "formula" });

  it.each(["E4", "e4", " E4 ", "E 4", "$E$4"])("aceita %j", (r) => {
    expect(validarTextAnswer(endereco, estado({ resposta: r })).ok).toBe(true);
  });
  it("recusa outro endereço", () => {
    expect(validarTextAnswer(endereco, estado({ resposta: "E5" })).falhas[0].motivo).toBe("resposta");
  });
  it("avisa quando linha e coluna estão invertidas", () => {
    expect(validarTextAnswer(endereco, estado({ resposta: "4E" })).falhas[0].mensagem).toContain("letra da coluna vem primeiro");
  });
  it("resposta vazia", () => {
    expect(validarTextAnswer(endereco, estado({ resposta: "  " })).falhas[0].motivo).toBe("sem-resposta");
  });
  it.each(["=B4+C4", "=b4 + c4", "B4+C4"])("fórmula: aceita %j", (r) => {
    expect(validarTextAnswer(formula, estado({ resposta: r })).ok).toBe(true);
  });
  it("fórmula: recusa o resultado", () => {
    expect(validarTextAnswer(formula, estado({ resposta: "300" })).ok).toBe(false);
  });
  it("texto: ignora acento, caixa e espaços extras", () => {
    expect(normalizarResposta("  Média   Geral ", "texto")).toBe(normalizarResposta("media geral", "texto"));
  });
});

describe("click_cell", () => {
  const qualquer = ex("click_cell", { celula: "C7" });
  const teclado = ex("click_cell", { celula: "C3", inputMethod: "keyboard" });

  it("inputMethod padrão é any", () => expect(qualquer.inputMethod).toBe("any"));
  it("célula certa", () => expect(validarClickCell(qualquer, estado({ ativa: "C7", mudancasPeloMouse: 3 })).ok).toBe(true));
  it("célula errada", () => {
    expect(validarClickCell(qualquer, estado({ ativa: "C6" })).falhas[0].motivo).toBe("celula-errada");
  });
  it("teclado: certo sem mouse", () => expect(validarClickCell(teclado, estado({ ativa: "C3" })).ok).toBe(true));
  it("teclado: recusa se usou o mouse", () => {
    expect(validarClickCell(teclado, estado({ ativa: "C3", mudancasPeloMouse: 1 })).falhas[0].motivo).toBe("usou-mouse");
  });
});

describe("select_range", () => {
  const e = ex("select_range", { intervalo: "B2:D5" });
  it("aceita B2:D5", () => expect(validarSelectRange(e, estado({ selecao: "B2:D5" })).ok).toBe(true));
  it("aceita seleção feita de trás para frente", () => expect(validarSelectRange(e, estado({ selecao: "D5:B2" })).ok).toBe(true));
  it("recusa intervalo diferente", () => {
    expect(validarSelectRange(e, estado({ selecao: "B2:D4" })).falhas[0].mensagem).toContain("B2:D4");
  });
  it("célula única explica como selecionar", () => {
    expect(validarSelectRange(e, estado({ selecao: "B2" })).falhas[0].mensagem).toContain("Shift");
  });
});

describe("type_value", () => {
  const e = ex("type_value", { alvos: [{ celula: "B3", esperado: 150 }] });
  it("aceita 150", () => expect(validarTypeValue(e, estado({ valores: { B3: 150 } })).ok).toBe(true));
  it("aceita =150 (o valor é o que conta)", () =>
    expect(validarTypeValue(e, estado({ valores: { B3: 150 }, temFormula: () => true })).ok).toBe(true));
  it("vazia", () => expect(validarTypeValue(e, estado()).falhas[0].motivo).toBe("vazia"));
  it("texto não é número", () => expect(validarTypeValue(e, estado({ valores: { B3: "150a" } })).ok).toBe(false));
  it("valor errado", () => expect(validarTypeValue(e, estado({ valores: { B3: 15 } })).falhas[0].motivo).toBe("valor"));
});

describe("format_cell", () => {
  const e = ex("format_cell", { alvos: [{ intervalo: "B2:B5", formato: "moeda" }] });
  const todas = { B2: "moeda", B3: "moeda", B4: "moeda", B5: "moeda" } as const;
  it("todas formatadas", () => expect(validarFormatCell(e, estado({ formatos: todas })).ok).toBe(true));
  it("aponta as que faltam", () => {
    const r = validarFormatCell(e, estado({ formatos: { ...todas, B4: "geral", B5: "percentual" } }));
    expect(r.falhas[0].mensagem).toContain("B4, B5");
  });
  it("nenhuma formatada", () => expect(validarFormatCell(e, estado()).ok).toBe(false));
});
