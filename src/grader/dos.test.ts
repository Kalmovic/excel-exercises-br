/**
 * Regressão de negação de serviço na correção do servidor (docs/revisao/relatorios/seguranca.md
 * e a segunda revisão adversarial): cada carga tem que terminar rápido e ser recusada.
 * O pior caso (curinga longo contra a grade cheia de textos de 32.767 caracteres) levava 16 s;
 * agora o prazo da correção (1,5 s) o interrompe.
 */
import { describe, expect, it } from "vitest";
import { testeDoModulo } from "@/content";
import { conferirQuestao, type RespostaQuestao } from "@/grader/conferir-teste";
import { paraEndereco } from "@/engine/address";

const q = (modulo: string, i: number) => testeDoModulo(modulo)[i];
const medir = (nome: string, modulo: string, i: number, r: RespostaQuestao) => {
  const h0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const ok = conferirQuestao(q(modulo, i), r);
  const ms = performance.now() - t0;
  const mb = (process.memoryUsage().heapUsed - h0) / 1e6;
  expect(ok, nome).toBe(false); // nenhuma dessas cargas é uma resposta certa
  expect(mb, `${nome}: memória`).toBeLessThan(400);
  return ms;
};
const celulas = (modulo: string, i: number, max = 300) => {
  const g = q(modulo, i).grade;
  const out: string[] = [];
  for (let l = 0; l < g.linhas; l++) for (let c = 0; c < g.colunas; c++) out.push(paraEndereco({ linha: l, coluna: c }));
  return out.slice(0, max);
};
const absoluto = (end: string) => end.replace(/^([A-Z]+)(\d+)$/, (_m, c: string, l: string) => "$" + c + "$" + l);

describe("DoS contra conferirQuestao", () => {
  it("P0-1: 300 formatos A1:ZZ999", () => {
    const formatos = Object.fromEntries(Array.from({ length: 300 }, (_, k) => [`A${k + 1}:ZZ999`, "moeda" as const]));
    expect(medir("formatos", "intro", 2, { conteudos: {}, formatos })).toBeLessThan(2000);
  });
  it("P0-2: curinga *a*a…b contra 500 'a' e REPT 32767", () => {
    const g = q("intro", 2);
    const alvo = g.type === "formula" ? g.alvos[0].celula : "D2";
    const conteudos = { F9: "a".repeat(500), [alvo]: `=CONT.SE(F9;"${"*a".repeat(14)}*b")+CONT.SE(REPT("a";32767);REPT("*a";120)&"b")` };
    expect(medir("curinga", "intro", 2, { conteudos })).toBeLessThan(2000);
  });
  it("P0-3: SEQUÊNCIA(3000;3000) e SEQUÊNCIA(20000;20000)", () => {
    const conteudos = { D2: "=SOMA(SEQUÊNCIA(3000;3000))+SOMA(SEQUÊNCIA(20000;20000))+SOMA(DESLOC(A1;0;0;3000;700))" };
    expect(medir("sequencia", "intro", 2, { conteudos })).toBeLessThan(2000);
  });
  it("novo: grade cheia de REPT(32767) + CONT.SE com curinga longo na grade toda", () => {
    const cels = celulas("dinamica", 0);
    const conteudos: Record<string, string> = {};
    for (const c of cels.slice(0, -1)) conteudos[c] = '=REPT("a";32767)';
    conteudos[cels.at(-1)!] = `=CONT.SE(A1:${cels.at(-2)};REPT("*a";120)&"b")`;
    expect(medir("rept+contse", "dinamica", 0, { conteudos })).toBeLessThan(5000);
  });
  it("novo: 20 regras de fórmula com CONT.SE de curinga sobre a grade", () => {
    const cels = celulas("dinamica", 0);
    const fim = cels.at(-1)!;
    const conteudos: Record<string, string> = { [fim]: '=REPT("a";32767)' };
    const condicionais = Array.from({ length: 20 }, () => ({
      tipo: "formula",
      intervalo: `A1:${fim}`,
      formula: `=CONT.SE($A$1:${absoluto(fim)};REPT("*a";100)&"b")>0`,
      estilo: { fundo: "#ff0000" },
    }));
    expect(medir("regras", "dinamica", 0, { conteudos, recursos: { condicionais } as RespostaQuestao["recursos"] })).toBeLessThan(5000);
  });
});

describe("DoS com o alvo lendo tudo (questão de fórmula com a maior grade)", () => {
  const todas = testeDoModulo;
  const candidatos = ["intro", "fundamentos", "logica", "condicionais", "busca", "texto", "datas", "arrays", "casos"].flatMap((m) =>
    todas(m).map((x, i) => ({ m, i, x })).filter(({ x }) => x.type === "formula" && !x.abas),
  );
  const maior = candidatos.sort((a, b) => b.x.grade.linhas * b.x.grade.colunas - a.x.grade.linhas * a.x.grade.colunas)[0];
  it(`curinga O(n·m) em todas as células livres (${maior.x.slug})`, () => {
    const g = maior.x.grade;
    const alvo = maior.x.type === "formula" ? maior.x.alvos[0].celula : "A1";
    const ocupadas = new Set(Object.keys(g.celulas ?? {}));
    const conteudos: Record<string, string> = {};
    for (let l = 0; l < g.linhas; l++) for (let c = 0; c < g.colunas; c++) {
      const e = paraEndereco({ linha: l, coluna: c });
      if (!ocupadas.has(e) && e !== alvo) conteudos[e] = '=REPT("a";32767)';
    }
    const fim = paraEndereco({ linha: g.linhas - 1, coluna: g.colunas - 1 });
    conteudos[alvo] = `=CONT.SE(A1:${fim};"*"&REPT("a";250)&"b")+CONT.SE(A1:${fim};"*"&REPT("a";250)&"c")+CONT.SE(A1:${fim};"*"&REPT("a";250)&"d")`;
    expect(medir("contse-n*m", maior.m, maior.i, { conteudos })).toBeLessThan(2500);
  });
});
