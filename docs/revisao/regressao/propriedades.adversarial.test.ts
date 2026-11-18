import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Planilha, type Grade } from "@/engine/engine";
import { deIntervalo } from "@/engine/address";

function base(pre = true): Grade {
  const nomes = ["Carla", "Ana", "Bruno", "Dani", "Edu", "Fábio"];
  const reg = ["Sul", "Norte", "Sul", "Leste", "Sul", "Norte"];
  const val = ["300", "500", "200", "700", "100", "400"];
  const celulas: Grade["celulas"] = {
    A1: { entrada: "Nome", negrito: true },
    B1: { entrada: "Região", negrito: true },
    C1: { entrada: "Valor", negrito: true },
    D1: { entrada: "Obs", negrito: true },
  };
  nomes.forEach((n, i) => {
    celulas[`A${i + 2}`] = { entrada: n };
    celulas[`B${i + 2}`] = { entrada: reg[i] };
    celulas[`C${i + 2}`] = { entrada: val[i], formato: "moeda" };
  });
  if (pre) celulas.D3 = { entrada: "pré", bloqueada: false };
  return { linhas: 12, colunas: 9, celulas };
}

type Op =
  | { k: "def"; end: string; v: string }
  | { k: "sort"; col: "A" | "B" | "C"; desc: boolean }
  | { k: "filtro" }
  | { k: "filtrar"; vals: string[] }
  | { k: "regra"; v: number }
  | { k: "fmt"; end: string }
  | { k: "limpar"; end: string }
  | { k: "piv" }
  | { k: "valid" };

const ends = fc.constantFrom("D2", "D3", "D4", "D7", "E2", "E3", "F1", "F5", "H9");
const vals = fc.constantFrom("R$ 3,00", "1", "x", "=C2*2", "=SOMA(C2:C7)", "=SUBTOTAL(9;C2:C7)", "", "=D2&\"!\"", "=LIN()");
const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ k: fc.constant("def" as const), end: ends, v: vals }),
  fc.record({ k: fc.constant("sort" as const), col: fc.constantFrom("A" as const, "B" as const, "C" as const), desc: fc.boolean() }),
  fc.constant({ k: "filtro" as const }),
  fc.record({ k: fc.constant("filtrar" as const), vals: fc.subarray(["Sul", "Norte", "Leste"]) }),
  fc.record({ k: fc.constant("regra" as const), v: fc.integer({ min: 100, max: 700 }) }),
  fc.record({ k: fc.constant("fmt" as const), end: ends }),
  fc.record({ k: fc.constant("limpar" as const), end: ends }),
  fc.constant({ k: "piv" as const }),
  fc.constant({ k: "valid" as const }),
);

function rodar(p: Planilha, o: Op) {
  switch (o.k) {
    case "def": p.definir(o.end, o.v); break;
    case "sort": p.classificar({ intervalo: "A1:D7", chaves: [{ coluna: o.col, ordem: o.desc ? "desc" : "asc" }], cabecalho: true }); break;
    case "filtro": if (p.filtroAtual()) p.desligarFiltro(); else p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 6, coluna: 3 } }); break;
    case "filtrar": p.filtrarColuna(1, o.vals); break;
    case "regra": p.adicionarRegra({ tipo: "maior", intervalo: "C2:C7", valor: String(o.v), estilo: "vermelho" } as never); break;
    case "fmt": p.formatar({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 0, coluna: 0 } }, "percentual"); break;
    case "limpar": p.limpar({ inicio: { linha: 1, coluna: 3 }, fim: { linha: 3, coluna: 4 } }); break;
    case "piv": {
      if (p.tabelasDinamicas().length) { p.removerDinamica(0); break; }
      const r = p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 6, coluna: 2 } }, { linha: 0, coluna: 6 });
      if (r.ok) { const d = p.tabelasDinamicas()[0].config; p.configurarDinamica(0, { ...d, linhas: ["B"], valores: [{ campo: "C", funcao: "soma" }] }); }
      break;
    }
    case "valid": p.adicionarValidacao({ intervalo: "E2:E7", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10" } as never); break;
  }
}

const estado = (p: Planilha) => {
  const tela: string[] = [];
  for (let l = 0; l < p.linhas; l++) for (let c = 0; c < p.colunas; c++) {
    const pos = { linha: l, coluna: c };
    tela.push(`${p.exibicao(pos)}|${p.bruto(pos)}|${p.linhaOculta(l)}|${JSON.stringify(p.estiloCondicional(pos) ?? null)}|${p.bloqueada(pos)}`);
  }
  return { tela, recursos: JSON.stringify(p.recursos()), fmt: JSON.stringify(p.formatosDoAluno()) };
};

describe("propriedades", () => {
  it("P1: desfazer tudo volta ao início; refazer tudo volta ao fim", () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 14 }), (ops) => {
        const p = new Planilha(base());
        const s0 = estado(p);
        for (const o of ops) rodar(p, o);
        const sn = estado(p);
        for (let i = 0; i < 60; i++) p.desfazer();
        expect(estado(p)).toEqual(s0);
        for (let i = 0; i < 60; i++) p.refazer();
        expect(estado(p)).toEqual(sn);
      }),
      { numRuns: 400 },
    );
  });

  it("P2: restaurar (recursos, conteúdos, formatos) reproduz a tela — classificando só por colunas bloqueadas", () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 14 }), (ops) => {
        const p = new Planilha(base());
        for (const o of ops) rodar(p, o);
        const salvo = JSON.parse(JSON.stringify({ r: p.recursos(), c: p.conteudosDoAluno(), f: p.formatosDoAluno() }));
        const q = new Planilha(base());
        q.aplicarRecursos(salvo.r);
        q.definirVarias(Object.entries(salvo.c as Record<string, string>).map(([endereco, bruto]) => ({ endereco, bruto })));
        for (const [end, f] of Object.entries(salvo.f)) q.formatar(deIntervalo(end), f as never);
        expect(estado(q).tela).toEqual(estado(p).tela);
      }),
      { numRuns: 400 },
    );
  });
});
