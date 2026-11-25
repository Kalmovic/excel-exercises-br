/**
 * Lições 6 a 10 de Gráficos e Validação de dados: o erro que cada pegadinha
 * prevê é recusado com uma mensagem que diz o que mudar, e o caminho certo passa.
 */
import { describe, expect, it } from "vitest";
import { exercicios } from "./index";
import type { ExercicioDoTipo, Grafico, ValidacaoDados } from "./schema";
import { Planilha } from "@/engine/engine";
import { deIntervalo } from "@/engine/address";
import { corrigir } from "@/grader/corrigir";

const ex = (slug: string) => exercicios.find((e) => e.slug === slug) as ExercicioDoTipo<"ferramenta">;

const comGrafico = (slug: string, tipo: Grafico["tipo"], dados: string, extra: Partial<Grafico> = {}, celulas: Record<string, string> = {}) => {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  for (const [end, t] of Object.entries(celulas)) expect(p.definir(end, t).ok, end).toBe(true);
  const r = p.inserirGrafico(tipo, deIntervalo(dados));
  expect(r.ok).toBe(true);
  if (Object.keys(extra).length) p.configurarGrafico(r.indice!, { ...p.graficos()[r.indice!], ...extra });
  return corrigir(e, p);
};

const comValidacao = (slug: string, regras: ValidacaoDados[], celulas: Record<string, string> = {}) => {
  const e = ex(slug);
  const p = Planilha.deExercicio(e);
  for (const v of regras) expect(p.adicionarValidacao(v), JSON.stringify(v)).toEqual({ ok: true });
  for (const [end, t] of Object.entries(celulas)) p.definirVarias([{ endereco: end, bruto: t }]);
  return corrigir(e, p);
};

describe("gráficos: lições 6 a 10", () => {
  it("escolher o tipo: pizza de porcentagens é recusada com o motivo; colunas e barras passam", () => {
    expect(comGrafico("grafico-escolher-tipo-pegadinha", "pizza", "A1:B6").falhas[0].mensagem).toContain("não somam um todo");
    expect(comGrafico("grafico-escolher-tipo-pegadinha", "colunas", "A1:B6").ok).toBe(true);
    expect(comGrafico("grafico-escolher-tipo-pegadinha", "barras", "A1:B6").ok).toBe(true);
    expect(comGrafico("grafico-escolher-tipo", "colunas", "A1:B13").ok).toBe(false);
  });

  it("empilhadas: o Total junto é uma série a mais; colunas lado a lado pedem empilhar", () => {
    expect(comGrafico("grafico-empilhadas-pegadinha", "empilhadas", "A1:E7").falhas[0].mensagem).toContain("Total");
    expect(comGrafico("grafico-empilhadas", "colunas", "A1:D7").falhas[0].mensagem).toContain("Colunas Empilhadas");
  });

  it("meta numa célula só: =F2 copiado (sem $) zera a linha; com $ passa", () => {
    const sem: Record<string, string> = {};
    const com: Record<string, string> = {};
    for (let i = 2; i <= 13; i++) {
      sem[`C${i}`] = `=F${i}`;
      com[`C${i}`] = "=$F$2";
    }
    expect(comGrafico("grafico-realizado-meta-pegadinha", "combinado", "A1:C13", {}, sem).falhas[0].mensagem).toContain("$");
    expect(comGrafico("grafico-realizado-meta-pegadinha", "combinado", "A1:C13", {}, com).ok).toBe(true);
    expect(comGrafico("grafico-realizado-meta", "colunas", "A1:C13").falhas[0].mensagem).toContain("Colunas e Linha");
  });

  it("resumo que não fecha: gráfico sem corrigir as fórmulas não passa", () => {
    expect(comGrafico("grafico-resumo-formulas-pegadinha", "colunas", "E1:F5").ok).toBe(false);
    expect(comGrafico("grafico-resumo-formulas", "colunas", "A1:C15", {}, { F2: "6500", F3: "2760", F4: "964,1", F5: "5660" }).ok).toBe(false);
  });

  it("painel: gráfico do colega sem consertar o Total não passa", () => {
    const e = ex("grafico-painel-trimestre-pegadinha");
    const p = Planilha.deExercicio(e);
    p.configurarGrafico(0, { ...p.graficos()[0], tipo: "combinado", titulo: "Realizado x Meta" });
    expect(corrigir(e, p).falhas[0].mensagem).toContain("categoria a mais");
    expect(comGrafico("grafico-painel-trimestre-variacao-a", "empilhadas", "A1:D4").ok).toBe(false);
  });
});

describe("validação: lições 6 a 10", () => {
  it("lista de outra aba: com o cabeçalho não passa; sem o = a mensagem explica", () => {
    expect(comValidacao("validacao-lista-outra-aba", [{ intervalo: "C2:C10", permitir: "lista", fonte: "=Listas!$A$1:$A$6" }]).ok).toBe(false);
    const r = corrigir(ex("validacao-lista-outra-aba-pegadinha"), Planilha.deExercicio(ex("validacao-lista-outra-aba-pegadinha")));
    expect(r.falhas[0].mensagem).toContain("começar com =");
    expect(comValidacao("validacao-lista-outra-aba-variacao-a", [{ intervalo: "C2:C7", permitir: "lista", fonte: "=Equipe!$A$2:$A$6" }]).ok).toBe(false);
  });

  it("alerta: a regra certa com estilo Parar não passa onde o pedido é Aviso", () => {
    const regra: ValidacaoDados = { intervalo: "C2:C10", permitir: "decimal", operador: "entre", valor1: "0", valor2: "500", erro: { titulo: "Valor alto", texto: "x" } };
    expect(comValidacao("validacao-alerta-aviso", [regra]).falhas[0].mensagem).toContain("Aviso");
    expect(comValidacao("validacao-alerta-aviso", [{ ...regra, estilo: "aviso" }]).ok).toBe(true);
  });

  it("alerta: só trocar o estilo, sem apagar o CPF incompleto, não passa", () => {
    const parar: ValidacaoDados = { intervalo: "B2:B10", permitir: "comprimento", operador: "igual", valor1: "11", estilo: "parar" };
    expect(comValidacao("validacao-alerta-aviso-pegadinha", [parar]).falhas[0].mensagem).toContain("Circular");
    expect(comValidacao("validacao-alerta-aviso-pegadinha", [parar], { B5: "" }).ok).toBe(true);
  });

  it("personalizado: limite fixo ou $ no lugar errado não passam", () => {
    const certo: ValidacaoDados = { intervalo: "C2:C10", permitir: "personalizado", formula: "=E(C2>=0;C2<=B2*10%)" };
    expect(comValidacao("validacao-personalizada", [certo]).ok).toBe(true);
    expect(comValidacao("validacao-personalizada", [{ ...certo, formula: "=E(C2>=0;C2<=$B$2*10%)" }]).ok).toBe(false);
    expect(comValidacao("validacao-personalizada", [{ intervalo: "C2:C10", permitir: "decimal", operador: "entre", valor1: "0", valor2: "850" }]).ok).toBe(false);
    expect(corrigir(ex("validacao-personalizada-pegadinha"), Planilha.deExercicio(ex("validacao-personalizada-pegadinha"))).falhas[0].mensagem).toContain("D3");
  });

  it("sem repetir: sem $ deixa a duplicata passar lá embaixo; CONT.SE só do cliente barra o retorno em outro dia", () => {
    const sem = comValidacao("validacao-sem-repetir", [{ intervalo: "A2:A20", permitir: "personalizado", formula: "=CONT.SE(A2:A20;A2)=1" }]);
    expect(sem.falhas[0].mensagem).toContain("$");
    const so = comValidacao("validacao-sem-repetir-pegadinha", [{ intervalo: "B2:B20", permitir: "personalizado", formula: "=CONT.SE($B$2:$B$20;B2)=1" }]);
    expect(so.falhas[0].mensagem).toContain("Ana Souza");
  });

  it("cadastro: só o comprimento no CPF deixa repetir; limite PF/PJ com Decimal não passa", () => {
    const uf: ValidacaoDados = { intervalo: "C2:C13", permitir: "lista", fonte: "=Listas!$A$2:$A$8" };
    expect(comValidacao("validacao-cadastro-clientes", [{ intervalo: "B2:B13", permitir: "comprimento", operador: "igual", valor1: "11" }, uf]).ok).toBe(false);
    expect(comValidacao("validacao-cadastro-clientes-pegadinha", [{ intervalo: "C2:C10", permitir: "decimal", operador: "entre", valor1: "0", valor2: "50000" }]).ok).toBe(false);
    expect(comValidacao("validacao-cadastro-clientes-pegadinha", [{ intervalo: "C2:C10", permitir: "decimal", operador: "entre", valor1: "0", valor2: "200000" }]).ok).toBe(false);
  });
});

describe("etapa 5 das lições novas: questão de concurso", () => {
  const novas = exercicios.filter(
    (e) => (e.modulo === "graficos" || e.modulo === "validacao") && e.etapa === 5 && e.licao && exercicios.find((p) => p.slug === e.licao)!.ordem >= 6,
  );
  it("são 10, com banca, tema e alternativas explicadas", () => {
    expect(novas).toHaveLength(10);
    for (const q of novas) {
      expect(q.banca, q.slug).toBeTruthy();
      expect(q.tema, q.slug).toBeTruthy();
      if (q.type !== "multiple_choice") throw new Error(q.slug);
      expect(q.opcoes.length === 5 || (q.banca === "Cebraspe" && q.opcoes.length === 2), q.slug).toBe(true);
      q.opcoes.forEach((o, i) => i !== q.correta && expect(o.dica, `${q.slug} ${i}`).toBeTruthy());
    }
  });
  for (const q of novas)
    for (const c of q.type === "multiple_choice" ? (q.conferir ?? []) : [])
      it(`${q.slug}: o motor confirma ${c.formula}`, () => {
        const p = Planilha.deExercicio(q);
        const livre = { linha: q.grade.linhas - 1, coluna: q.grade.colunas - 1 };
        expect(p.definir(livre, c.formula)).toEqual({ ok: true });
        expect(p.valor(livre)).toBe(c.esperado);
      });
});
