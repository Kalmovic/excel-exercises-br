/**
 * Propriedades (adversarial.md, `propriedades.adversarial.test.ts`), com um
 * gerador pseudoaleatório com semente em vez do fast-check: sequências
 * aleatórias de ações na tela.
 * P1: desfazer tudo volta ao início; refazer tudo volta ao fim.
 * P2: salvar e restaurar (o ponto único) reproduz a tela, inclusive
 *     classificando por colunas editáveis, com R$ e células pré-preenchidas.
 */
import { describe, expect, it } from "vitest";
import { Planilha, type Grade } from "./engine";
import { recursosSchema } from "@/content/schema";

function base(): Grade {
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
  celulas.D3 = { entrada: "pré", bloqueada: false };
  return { linhas: 12, colunas: 9, celulas };
}

/** Mulberry32: pseudoaleatório reprodutível. */
function gerador(semente: number) {
  let a = semente;
  const prox = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const um = <T,>(xs: readonly T[]) => xs[Math.floor(prox() * xs.length)];
  return { prox, um };
}

const ENDS = ["D2", "D3", "D4", "D7", "E2", "E3", "F1", "F5", "H9"] as const;
const VALS = ["R$ 3,00", "1", "x", "=C2*2", "=SOMA(C2:C7)", "=SUBTOTAL(9;C2:C7)", "", '=D2&"!"', "08:30:15", "'123"] as const;

function acao(p: Planilha, r: ReturnType<typeof gerador>) {
  switch (Math.floor(r.prox() * 9)) {
    case 0:
      p.definir(r.um(ENDS), r.um(VALS));
      break;
    case 1:
      // Classifica também pela coluna D, que o aluno edita.
      p.classificar({ intervalo: "A1:D7", chaves: [{ coluna: r.um(["A", "B", "C", "D"] as const), ordem: r.prox() < 0.5 ? "asc" : "desc" }], cabecalho: true });
      break;
    case 2:
      if (p.filtroAtual()) p.desligarFiltro();
      else p.ligarFiltro({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 6, coluna: 3 } });
      break;
    case 3:
      p.filtrarColuna(1, ["Sul", "Norte", "Leste"].filter(() => r.prox() < 0.5));
      break;
    case 4:
      p.adicionarRegra({ tipo: "maior", intervalo: "C2:C7", valor: String(100 + Math.floor(r.prox() * 600)), estilo: "vermelho" });
      break;
    case 5:
      p.formatar({ inicio: { linha: Math.floor(r.prox() * 7), coluna: 3 }, fim: { linha: 7, coluna: 4 } }, r.um(["percentual", "moeda"] as const));
      break;
    case 6:
      p.limpar({ inicio: { linha: 1, coluna: 3 }, fim: { linha: 3, coluna: 4 } });
      break;
    case 7: {
      if (p.tabelasDinamicas().length) {
        p.removerDinamica(0);
        break;
      }
      const ok = p.inserirDinamica({ inicio: { linha: 0, coluna: 0 }, fim: { linha: 6, coluna: 2 } }, { linha: 0, coluna: 6 });
      if (ok.ok) p.configurarDinamica(0, { ...p.tabelasDinamicas()[0].config, linhas: ["B"], valores: [{ campo: "C", funcao: "soma" }] });
      break;
    }
    default:
      p.adicionarValidacao({ intervalo: "E2:E7", permitir: "inteiro", operador: "entre", valor1: "1", valor2: "10" });
  }
}

const estado = (p: Planilha) => {
  const tela: string[] = [];
  for (let l = 0; l < p.linhas; l++)
    for (let c = 0; c < p.colunas; c++) {
      const pos = { linha: l, coluna: c };
      tela.push(`${p.exibicao(pos)}|${p.bruto(pos)}|${p.tipo(pos)}|${p.linhaOculta(l)}|${JSON.stringify(p.estiloCondicional(pos) ?? null)}|${p.bloqueada(pos)}`);
    }
  return { tela, recursos: JSON.stringify(p.recursos()), fmt: JSON.stringify(p.formatosDoAluno()) };
};

const RODADAS = 120;

describe("propriedades", { timeout: 60_000 }, () => {
  it("P1: desfazer tudo volta ao início; refazer tudo volta ao fim", () => {
    for (let s = 1; s <= RODADAS; s++) {
      const r = gerador(s);
      const p = new Planilha(base());
      const s0 = estado(p);
      const n = Math.floor(r.prox() * 15);
      for (let i = 0; i < n; i++) acao(p, r);
      const sn = estado(p);
      for (let i = 0; i < 60; i++) p.desfazer();
      expect(estado(p), `semente ${s}`).toEqual(s0);
      for (let i = 0; i < 60; i++) p.refazer();
      expect(estado(p), `semente ${s}`).toEqual(sn);
    }
  });

  it("P2: salvar e restaurar reproduz a tela e os recursos", () => {
    for (let s = 1; s <= RODADAS; s++) {
      const r = gerador(1000 + s);
      const p = new Planilha(base());
      const n = Math.floor(r.prox() * 15);
      for (let i = 0; i < n; i++) acao(p, r);
      const salvo = JSON.parse(JSON.stringify({ recursos: p.recursos(), conteudos: p.conteudosDoAluno(), formatos: p.formatosDoAluno() }));
      expect(recursosSchema.safeParse(salvo.recursos).success, `semente ${1000 + s}`).toBe(true);
      const q = new Planilha(base());
      q.restaurarProgresso(salvo);
      expect(estado(q), `semente ${1000 + s}`).toEqual(estado(p));
    }
  });
});
