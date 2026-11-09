/**
 * Fase 0: matriz de compatibilidade das funções do MVP em pt-BR (`;` e `,`).
 *
 * `ok`: comportamento igual ao Excel pt-BR.
 * `divergente`: diferença conhecida em relação ao Excel. O teste afirma a
 * divergência; se uma atualização do HyperFormula corrigir, ele quebra e
 * avisa para atualizarmos docs/FASE-0.md.
 *
 * Valores esperados: calculados à mão a partir do comportamento documentado do
 * Excel. Pendência: conferir esta tabela num Excel pt-BR real.
 */
import { describe, expect, it } from "vitest";
import { Planilha, type Grade } from "./engine";
import { dataIsoParaSerial, type ValorCelula } from "./format";

const fixture: Grade = {
  linhas: 30,
  colunas: 10,
  celulas: Object.fromEntries(
    Object.entries({
      A1: "Nome", B1: "Valor", C1: "Data", D1: "Texto", E1: "Faixa", F1: "Taxa",
      A2: "Ana", B2: "10", C2: "15/01/2026", D2: "  joão   da silva ", E2: "0", F2: "1%",
      A3: "Bia", B3: "25,5", C3: "10/03/2026", D3: "SP-001-X", E3: "1000", F3: "3%",
      A4: "Ana", B4: "30", C4: "28/02/2026", D4: "R$ 1.234,50", E4: "5000", F4: "5%",
      A5: "Caio", B5: "15", C5: "05/11/2026",
      A6: "Duda", B6: "40", C6: "31/12/2025",
    }).map(([k, v]) => [k, { entrada: v, bloqueada: false }]),
  ),
};

type Caso = {
  modulo: string;
  funcao: string;
  formula: string;
  esperado: ValorCelula | ValorCelula[];
  tolerancia?: number;
  divergente?: string; // motivo
};

const d = dataIsoParaSerial;

export const CASOS: Caso[] = [
  // Módulo 1
  { modulo: "1", funcao: "SOMA", formula: "=SOMA(B2:B6)", esperado: 120.5 },
  { modulo: "1", funcao: "MÉDIA", formula: "=MÉDIA(B2:B6)", esperado: 24.1 },
  { modulo: "1", funcao: "MÍNIMO", formula: "=MÍNIMO(B2:B6)", esperado: 10 },
  { modulo: "1", funcao: "MÁXIMO", formula: "=MÁXIMO(B2:B6)", esperado: 40 },
  { modulo: "1", funcao: "operadores", formula: "=B2*2+B3/2-1", esperado: 31.75 },
  { modulo: "1", funcao: "variação %", formula: "=(B3-B2)/B2", esperado: 1.55 },
  { modulo: "1", funcao: "decimal com vírgula", formula: "=SOMA(1,5;2)", esperado: 3.5 },
  { modulo: "1", funcao: "entrada R$ 1.234,50", formula: "=D4*1", esperado: 1234.5 },
  { modulo: "1", funcao: "entrada 1%", formula: "=F2*100", esperado: 1 },
  // Módulo 2
  { modulo: "2", funcao: "SE", formula: '=SE(B2>20;"alto";"baixo")', esperado: "baixo" },
  { modulo: "2", funcao: "SE aninhado", formula: '=SE(B3>30;"A";SE(B3>20;"B";"C"))', esperado: "B" },
  { modulo: "2", funcao: "E", formula: "=E(B2>5;B3<30)", esperado: true },
  { modulo: "2", funcao: "OU", formula: "=OU(B2>50;B3>20)", esperado: true },
  { modulo: "2", funcao: "SES", formula: '=SES(B5>30;"A";B5>10;"B";VERDADEIRO;"C")', esperado: "B" },
  { modulo: "2", funcao: "SEERRO", formula: '=SEERRO(1/0;"erro")', esperado: "erro" },
  // Módulo 3
  { modulo: "3", funcao: "CONT.VALORES", formula: "=CONT.VALORES(A2:A6)", esperado: 5 },
  { modulo: "3", funcao: "CONT.SE", formula: '=CONT.SE(A2:A6;"Ana")', esperado: 2 },
  { modulo: "3", funcao: "CONT.SES", formula: '=CONT.SES(A2:A6;"Ana";B2:B6;">15")', esperado: 1 },
  { modulo: "3", funcao: "SOMASE", formula: '=SOMASE(A2:A6;"Ana";B2:B6)', esperado: 40 },
  { modulo: "3", funcao: "SOMASES", formula: '=SOMASES(B2:B6;A2:A6;"Ana";B2:B6;">15")', esperado: 30 },
  { modulo: "3", funcao: "MÉDIASE", formula: '=MÉDIASE(A2:A6;"Ana";B2:B6)', esperado: 20 },
  // Módulo 4
  { modulo: "4", funcao: "PROCV exato", formula: '=PROCV("Caio";A2:B6;2;FALSO)', esperado: 15 },
  { modulo: "4", funcao: "PROCV aproximado", formula: "=PROCV(2500;E2:F4;2;VERDADEIRO)", esperado: 0.03 },
  { modulo: "4", funcao: "PROCV não encontrado", formula: '=PROCV("Zé";A2:B6;2;FALSO)', esperado: { erro: "#N/D" } },
  { modulo: "4", funcao: "PROCH", formula: '=PROCH("Valor";A1:B6;3;FALSO)', esperado: 25.5 },
  { modulo: "4", funcao: "ÍNDICE+CORRESP", formula: '=ÍNDICE(B2:B6;CORRESP("Duda";A2:A6;0))', esperado: 40 },
  { modulo: "4", funcao: "PROCX", formula: '=PROCX("Bia";A2:A6;B2:B6)', esperado: 25.5 },
  { modulo: "4", funcao: "PROCX se_não_encontrado", formula: '=PROCX("Zé";A2:A6;B2:B6;"não achou")', esperado: "não achou" },
  // Módulo 5
  { modulo: "5", funcao: "&", formula: '=A2&" "&A3', esperado: "Ana Bia" },
  { modulo: "5", funcao: "CONCAT", formula: '=CONCAT(A2;"-";A3)', esperado: "Ana-Bia" },
  { modulo: "5", funcao: "CONCATENAR", formula: "=CONCATENAR(A2;A3)", esperado: "AnaBia" },
  { modulo: "5", funcao: "ESQUERDA", formula: "=ESQUERDA(D3;2)", esperado: "SP" },
  { modulo: "5", funcao: "DIREITA", formula: "=DIREITA(D3;1)", esperado: "X" },
  { modulo: "5", funcao: "EXT.TEXTO", formula: "=EXT.TEXTO(D3;4;3)", esperado: "001" },
  { modulo: "5", funcao: "ARRUMAR", formula: "=ARRUMAR(D2)", esperado: "joão da silva" },
  { modulo: "5", funcao: "PRI.MAIÚSCULA", formula: "=PRI.MAIÚSCULA(ARRUMAR(D2))", esperado: "João Da Silva" },
  { modulo: "5", funcao: "LOCALIZAR", formula: '=LOCALIZAR("-";D3)', esperado: 3 },
  { modulo: "5", funcao: "SUBSTITUIR", formula: '=SUBSTITUIR(D3;"-";"/")', esperado: "SP/001/X" },
  // Módulo 6
  { modulo: "6", funcao: "HOJE", formula: "=HOJE()>DATA(2025;1;1)", esperado: true },
  { modulo: "6", funcao: "ANO", formula: "=ANO(C2)", esperado: 2026 },
  { modulo: "6", funcao: "MÊS", formula: "=MÊS(C3)", esperado: 3 },
  { modulo: "6", funcao: "DATA (serial)", formula: "=DATA(2026;1;15)", esperado: d("2026-01-15") },
  { modulo: "6", funcao: "DATADIF", formula: '=DATADIF(C2;C5;"M")', esperado: 9 },
  {
    modulo: "6",
    funcao: "DATADIF unidade minúscula",
    formula: '=DATADIF(C2;C5;"m")',
    esperado: 9,
    divergente: 'O Excel aceita "m"; o HyperFormula só aceita "M" (#NÚM!).',
  },
  { modulo: "6", funcao: "DIATRABALHOTOTAL", formula: "=DIATRABALHOTOTAL(DATA(2026;11;2);DATA(2026;11;30))", esperado: 21 },
  { modulo: "6", funcao: "FIMMÊS", formula: "=FIMMÊS(DATA(2026;2;10);0)", esperado: d("2026-02-28") },
  // Módulo 7 (arrays dinâmicos: verificamos o derramamento para baixo)
  { modulo: "7", funcao: "FILTRO", formula: "=FILTRO(A2:A6;B2:B6>20)", esperado: ["Bia", "Ana", "Duda"] },
  { modulo: "7", funcao: "CLASSIFICAR", formula: "=CLASSIFICAR(B2:B6)", esperado: [10, 15, 25.5, 30, 40] },
  { modulo: "7", funcao: "ÚNICO", formula: "=ÚNICO(A2:A6)", esperado: ["Ana", "Bia", "Caio", "Duda"] },
  // Módulo 8
  { modulo: "8", funcao: "PGTO", formula: "=PGTO(1%;12;-1000)", esperado: 88.848788678, tolerancia: 1e-6 },
  {
    modulo: "8",
    funcao: "TEXTO com formato pt-BR",
    formula: '=TEXTO(1,5;"0,00")',
    esperado: "1,50",
    divergente: 'O HyperFormula interpreta o formato com ponto decimal; "0,00" vira "2,00".',
  },
];

function avaliar(formula: string) {
  const p = new Planilha(fixture);
  const r = p.definir("H1", formula);
  if (!r.ok) throw new Error(r.mensagem);
  const n = 8;
  const valores = Array.from({ length: n }, (_, i) => p.valor(`H${i + 1}`));
  p.destruir();
  return valores;
}

function confere(obtido: ValorCelula, esperado: ValorCelula, tol = 1e-9) {
  if (typeof esperado === "number") return typeof obtido === "number" && Math.abs(obtido - esperado) <= tol;
  return JSON.stringify(obtido) === JSON.stringify(esperado);
}

function resultadoOk(c: Caso) {
  const valores = avaliar(c.formula);
  const esperados = Array.isArray(c.esperado) ? c.esperado : [c.esperado];
  return esperados.every((e, i) => confere(valores[i], e, c.tolerancia));
}

describe("Fase 0: funções do MVP em pt-BR", () => {
  for (const c of CASOS) {
    const nome = `M${c.modulo} ${c.funcao}: ${c.formula}`;
    if (c.divergente) {
      it(`[divergente] ${nome}`, () => expect(resultadoOk(c)).toBe(false));
    } else {
      it(nome, () => {
        const valores = avaliar(c.formula);
        const esperados = Array.isArray(c.esperado) ? c.esperado : [c.esperado];
        esperados.forEach((e, i) => {
          if (typeof e === "number") expect(valores[i]).toBeCloseTo(e, 6);
          else expect(valores[i]).toEqual(e);
        });
      });
    }
  }
});

describe("Fase 0: comportamentos do Excel pt-BR", () => {
  it("FALSO/VERDADEIRO sem parênteses funcionam (PROCV exato)", () => {
    expect(avaliar('=PROCV("Ana";A2:B6;2;FALSO)')[0]).toBe(10);
  });

  it("spill bloqueado mostra #DESPEJAR!", () => {
    const p = new Planilha(fixture);
    p.definir("H2", "x");
    p.definir("H1", "=ÚNICO(A2:A6)");
    expect(p.valor("H1")).toEqual({ erro: "#DESPEJAR!" });
    p.destruir();
  });

  it("copiar/colar ajusta referência relativa e mantém a absoluta", () => {
    const p = new Planilha(fixture);
    p.definir("H2", "=B2*$F$2");
    p.copiar({ inicio: { linha: 1, coluna: 7 }, fim: { linha: 1, coluna: 7 } });
    p.colar({ inicio: { linha: 2, coluna: 7 }, fim: { linha: 5, coluna: 7 } });
    expect(p.bruto("H3")).toBe("=B3*$F$2");
    expect(p.bruto("H6")).toBe("=B6*$F$2");
    expect(p.valor("H6")).toBeCloseTo(0.4);
    p.destruir();
  });

  it("barra de fórmulas mostra FALSO sem parênteses", () => {
    const p = new Planilha(fixture);
    p.definir("H1", '=PROCV("Ana";A2:B6;2;FALSO)');
    expect(p.bruto("H1")).toBe('=PROCV("Ana";A2:B6;2;FALSO)');
    p.destruir();
  });

  it("bug do ano 1900 compatível com o Excel: DATA(1900;3;1) = 61", () => {
    expect(avaliar("=DATA(1900;3;1)")[0]).toBe(61);
  });

  it("undo desfaz a última edição", () => {
    const p = new Planilha(fixture);
    p.definir("H1", "=B2*3");
    p.definir("H1", "=B2*4");
    p.desfazer();
    expect(p.valor("H1")).toBe(30);
    p.destruir();
  });
});
