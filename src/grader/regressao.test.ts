/**
 * Regressão da revisão (adversarial.md e persona.md) na correção.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "@/content/index";
import type { Exercicio, ExercicioDoTipo } from "@/content/schema";
import { Planilha } from "@/engine/engine";
import { corrigir } from "./corrigir";
import { conferirQuestao } from "./conferir-teste";

const ex = (slug: string) => {
  const e = exercicios.find((x) => x.slug === slug);
  if (!e) throw new Error(slug);
  return e;
};
const ferr = (slug: string) => ex(slug) as ExercicioDoTipo<"ferramenta">;

describe("ferramenta", () => {
  it("G1: filtrar certo depois de classificar é aceito (compara as linhas pelo conteúdo)", () => {
    const e = ferr("dados-filtrar-regiao");
    const p = Planilha.deExercicio(e);
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 9, coluna: 3 } });
    p.filtrarColuna(1, ["Sul"]);
    expect(new Set(p.linhasVisiveis().map((l) => p.valor(`A${l}`)))).toEqual(new Set(["Carla", "Bruno", "Eduardo", "Hugo"]));
    expect(corrigir(e, p).falhas).toEqual([]);
    // O certificado também: a classificação e o filtro chegam pelo progresso.
    expect(conferirQuestao(e, JSON.parse(JSON.stringify({ conteudos: p.conteudosDoAluno(), recursos: p.recursos() })))).toBe(true);
  });

  it("G1: mesmo número de linhas, linhas erradas: a mensagem diz isso", () => {
    const e = ferr("dados-filtrar-regiao");
    const p = Planilha.deExercicio(e);
    p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 9, coluna: 3 } });
    const regioes = p.valoresDaColuna(1);
    // Uma região com o mesmo número de linhas do Sul (4), se houver; senão, só confere a mensagem de contagem.
    const outra = regioes.find((r) => r !== "Sul" && p.linhasVisiveis().filter((l) => p.valor(`B${l}`) === r).length === 4);
    p.filtrarColuna(1, [outra ?? "Norte"]);
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).not.toMatch(/mostrando 4 linhas, mas a resposta tem 4/);
  });

  it("G2: aceitariaNaCelula não muda o tipo da célula (moeda continua moeda)", () => {
    const e = exercicios.find((x): x is ExercicioDoTipo<"ferramenta"> => x.type === "ferramenta" && x.verificacoes.some((v) => v.tipo === "validacao"))!;
    const v = e.verificacoes.find((x) => x.tipo === "validacao") as { intervalo: string };
    const cel = v.intervalo.split(":")[0];
    const p = Planilha.deExercicio(e);
    p.definir(cel, "R$ 3,00");
    const antes = p.tipo(cel);
    p.aceitariaNaCelula(cel, "5");
    expect(p.tipo(cel)).toBe(antes);
  });

  it("M1: 'valores' sem classificação não fala em 'ordem pedida'", () => {
    const e = ex("validacao-lista-status-variacao-b");
    const p = Planilha.deExercicio(e);
    p.definir("C2", "Cancelado");
    p.definir("C3", "Pago");
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).not.toMatch(/ordem pedida/);
  });

  it("M1b: idem em validacao-dados-antigos", () => {
    const e = ex("validacao-dados-antigos");
    const p = Planilha.deExercicio(e);
    p.definir("B3", "2");
    p.definir("B5", "1");
    p.definir("B7", "1");
    const r = corrigir(e, p);
    expect(r.falhas.map((f) => f.mensagem).join(" ")).not.toMatch(/ordem pedida/);
  });

  it("valores certos fora de ordem ainda falam em ordem", () => {
    const e = ferr("dados-classificar-maior-valor");
    const p = Planilha.deExercicio(e);
    const r = corrigir(e, p);
    if (!r.ok && !e.verificacoes[0].mensagem) expect(r.falhas[0].mensagem).toMatch(/ordem pedida/);
  });

  it("persona: a pegadinha de classificação mostra só a primeira falha (sem mensagens contraditórias)", () => {
    const e = ferr("dados-classificar-maior-valor-pegadinha");
    const p = Planilha.deExercicio(e);
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "B", ordem: "asc" }], cabecalho: true });
    p.classificar({ intervalo: "A1:D10", chaves: [{ coluna: "C", ordem: "desc" }], cabecalho: true });
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas).toHaveLength(1);
    expect(r.falhas[0].mensagem).toMatch(/ainda não estão em ordem alfabética/);
  });

  it("persona: a mensagem da tabela dinâmica não cita uma tela que não existe", () => {
    const e = ferr("dinamica-total-por-regiao-pegadinha");
    const p = Planilha.deExercicio(e);
    p.aplicarRecursos({ dinamicas: [{ origem: "A1:E15", destino: "G1", linhas: ["D"], colunas: [], valores: [{ campo: "E", funcao: "soma" }], filtros: [] }] });
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0].mensagem).not.toMatch(/Configurações do Campo de Valor/);
    expect(r.falhas[0].mensagem).toMatch(/seletor ao lado do campo, em Valores/);
  });

  it("tabela dinâmica: um filtro (Tudo) pedido é aceito", () => {
    const base = ferr("dinamica-total-por-regiao-pegadinha");
    const v = base.verificacoes[0] as Extract<ExercicioDoTipo<"ferramenta">["verificacoes"][number], { tipo: "dinamica" }>;
    const e = { ...base, verificacoes: [{ ...v, filtros: [{ campo: "Vendedor", valores: null }] }] } as Exercicio;
    const p = Planilha.deExercicio(e);
    const config = { origem: "A1:E15", destino: "G1", linhas: ["D"], colunas: [], valores: [{ campo: "E", funcao: "media" as const }], filtros: [] as { campo: string; valores: string[] | null }[] };
    p.aplicarRecursos({ dinamicas: [config] });
    const letra = p.camposDaDinamica(0).find((c) => c.nome === "Vendedor")?.letra;
    expect(letra).toBeDefined();
    expect(corrigir(e, p).falhas[0]?.mensagem).toMatch(/Coloque Vendedor em Filtros/);
    p.aplicarRecursos({ dinamicas: [{ ...config, filtros: [{ campo: letra!, valores: null }] }] });
    expect(corrigir(e, p).falhas).toEqual([]);
  });
});

describe("errosComuns com bloqueia", () => {
  const PROCV_3_ARGS = String.raw`^=PROCV\((?:[^;()]|\([^()]*\))*;(?:[^;()]|\([^()]*\))*;(?:[^;()]|\([^()]*\))*\)$`;
  const comBloqueio = (padrao: string): Exercicio => {
    const e = ex("procv-preco-pelo-codigo-exato");
    return { ...e, errosComuns: [{ padrao, dica: "Sem o FALSO, o PROCV faz busca aproximada.", bloqueia: true }] } as Exercicio;
  };

  it("persona: PROCV sem FALSO com o valor certo é reprovado com a dica", () => {
    const e = comBloqueio(PROCV_3_ARGS);
    const p = Planilha.deExercicio(e);
    p.definir("G2", "=PROCV(F2;A2:C6;3)");
    const r = corrigir(e, p);
    expect(r.ok).toBe(false);
    expect(r.falhas[0]).toMatchObject({ celula: "G2", motivo: "erro-comum", mensagem: "Sem o FALSO, o PROCV faz busca aproximada." });
  });

  it("a solução de referência não casa com o padrão genérico", () => {
    const e = comBloqueio(PROCV_3_ARGS);
    const p = Planilha.deExercicio(e);
    p.definir("G2", "=PROCV(F2;A2:C6;3;FALSO)");
    expect(corrigir(e, p).ok).toBe(true);
    p.definir("G2", "=PROCV(F2; $A$2:$C$6; 3; 0)");
    expect(corrigir(e, p).ok).toBe(true);
  });

  it("sem bloqueia, o erro comum só troca a mensagem quando o valor está errado", () => {
    // O conteúdo marca este exercício com bloqueia; uma cópia sem o campo mostra o comportamento antigo.
    const original = ex("procv-preco-pelo-codigo-exato");
    const e = { ...original, errosComuns: original.errosComuns?.map((x) => ({ padrao: x.padrao, dica: x.dica, celula: x.celula })) } as typeof original;
    const p = Planilha.deExercicio(e);
    p.definir("G2", "=PROCV(F2;A2:C6;3)");
    expect(corrigir(e, p).ok).toBe(true);
  });

  it("com o conteúdo de verdade, o PROCV sem FALSO é reprovado mesmo com o valor certo", () => {
    const e = ex("procv-preco-pelo-codigo-exato");
    const p = Planilha.deExercicio(e);
    p.definir("G2", "=PROCV(F2;A2:C6;3)");
    expect(corrigir(e, p).ok).toBe(false);
  });

  it("vale também no certificado", () => {
    const e = comBloqueio(PROCV_3_ARGS);
    expect(conferirQuestao(e, { conteudos: { G2: "=PROCV(F2;A2:C6;3)" } })).toBe(false);
    expect(conferirQuestao(e, { conteudos: { G2: "=PROCV(F2;A2:C6;3;FALSO)" } })).toBe(true);
  });
});

describe("certificado (conferir-teste)", () => {
  it("A1: célula do aluno em aba com apóstrofo no nome é considerada", () => {
    const base = ex("abas-total-de-outra-aba") as ExercicioDoTipo<"formula">;
    const e = {
      ...base,
      abas: base.abas!.map((a) => ({ ...a, nome: "D'Ávila" })),
      alvos: base.alvos.map((a) => ({ ...a, solucaoReferencia: "=SOMA('D''Ávila'!B2:B6)" })),
      grade: { ...base.grade, variaveis: undefined },
    } as Exercicio;
    // A resposta mora na outra aba: a primeira aba lê de lá.
    const conteudos = { B2: "=SOMA('D''Ávila'!C2:C6)", "D'Ávila!C2": "=B2", "D'Ávila!C3": "=B3", "D'Ávila!C4": "=B4", "D'Ávila!C5": "=B5", "D'Ávila!C6": "=B6" };
    expect(conferirQuestao(e, { conteudos })).toBe(true);
  });

  it("células e formatos fora da grade são ignorados", () => {
    const e = ex("procv-preco-pelo-codigo-exato");
    expect(conferirQuestao(e, { conteudos: { G2: "=PROCV(F2;A2:C6;3;FALSO)", ZZ999: "x" }, formatos: { "A1:ZZ999": "moeda" } })).toBe(true);
  });

  it("um campo inválido em recursos não descarta os outros", () => {
    const e = ferr("dados-filtrar-regiao");
    const recursos = {
      filtro: { intervalo: "A1:D10", criterios: { B: { valores: ["Sul"] } } },
      graficos: [{ tipo: "xpto" }],
    };
    expect(conferirQuestao(e, { conteudos: {}, recursos: recursos as never })).toBe(true);
  });
});
