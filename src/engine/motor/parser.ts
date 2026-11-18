/**
 * Motor de fórmulas próprio: análise de fórmulas em pt-BR, direto (PROCV,
 * ponto e vírgula, vírgula decimal), sem tradução para o inglês.
 */
export type No =
  | { t: "num"; v: number }
  | { t: "txt"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; l: number; c: number; aba?: string }
  /**
   * Intervalo. Coluna inteira (A:A) vai até `ULTIMA_LINHA` e linha inteira
   * (1:1) até `ULTIMA_COLUNA`; o cálculo corta no tamanho da aba.
   */
  | { t: "int"; a: { l: number; c: number }; b: { l: number; c: number }; aba?: string }
  | { t: "un"; op: string; x: No }
  | { t: "pct"; x: No }
  | { t: "bin"; op: string; a: No; b: No }
  | { t: "fn"; nome: string; args: No[] }
  /** Nome declarado num LET (=LET(taxa; 10%; B2*taxa)). */
  | { t: "nome"; v: string }
  | { t: "erro"; v: string }
  /** Argumento omitido (`SE(A1>5;;1)`, `PROCX(…;;0)`): nem texto vazio, nem zero. */
  | { t: "vazio" }
  /** Matriz constante: {1;2;3} (`;` separa linhas, `\` separa colunas). */
  | { t: "matriz"; v: No[][] };

/** Última linha e coluna do Excel (índices a partir de 0): marcam a coluna ou a linha inteira. */
export const ULTIMA_LINHA = 1_048_575;
export const ULTIMA_COLUNA = 16_383;

type Tok = { k: "num" | "txt" | "id" | "ref" | "faixa" | "aba" | "op" | "(" | ")" | ";" | "{" | "}" | "\\" | "fim" | "erro"; v: string };

const REF = /^\$?([A-Z]{1,3})\$?(\d+)/;
const ID = /^[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*/;
/** Coluna inteira (A:A, $A:$C) ou linha inteira (1:1, $2:$5). */
const FAIXA = /^(?:\$?([A-Z]{1,3}):\$?([A-Z]{1,3})|\$?(\d+):\$?(\d+))(?![A-Za-z0-9_.(!])/;

function tokens(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const r = s.slice(i);
    const ch = s[i];
    if (ch === " ") { i++; continue; }
    if (ch === '"') {
      let j = i + 1, v = "";
      while (j < s.length) {
        if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } break; }
        v += s[j++];
      }
      if (j >= s.length) throw new Error("aspas");
      out.push({ k: "txt", v }); i = j + 1; continue;
    }
    let m;
    // Nome de aba antes de uma referência: Vendas!A1 ou 'Base 2024'!A1 (aspas simples quando tem espaço).
    if ((m = /^'((?:[^']|'')+)'!/.exec(r)) || (m = /^([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*)!/.exec(r))) {
      out.push({ k: "aba", v: m[1].replace(/''/g, "'") });
      i += m[0].length;
      continue;
    }
    if ((m = /^#(N\/D|DIV\/0!|VALOR!|REF!|NOME\?|NÚM!|NULO!|CALC!|DESPEJAR!)/.exec(r))) { out.push({ k: "erro", v: m[0] }); i += m[0].length; continue; }
    if ((m = FAIXA.exec(r.toUpperCase()))) { out.push({ k: "faixa", v: m[0].toUpperCase().replace(/\$/g, "") }); i += m[0].length; continue; }
    if ((m = /^(?:\d+(?:,\d+)?|,\d+)(?:[eE][+-]?\d+)?/.exec(r)) && !/^[A-Za-z]/.test(r.slice(m[0].length))) { out.push({ k: "num", v: m[0] }); i += m[0].length; continue; }
    if ((m = REF.exec(r.toUpperCase())) && !/^[A-Za-z0-9_.(]/.test(r.slice(m[0].length))) { out.push({ k: "ref", v: m[0].toUpperCase() }); i += m[0].length; continue; }
    if ((m = ID.exec(r))) { out.push({ k: "id", v: m[0].toUpperCase() }); i += m[0].length; continue; }
    const dois = s.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(dois)) { out.push({ k: "op", v: dois }); i += 2; continue; }
    if ("+-*/^&=<>:%".includes(ch)) { out.push({ k: "op", v: ch }); i++; continue; }
    if ("();{}\\".includes(ch)) { out.push({ k: ch as Tok["k"], v: ch }); i++; continue; }
    throw new Error(`caractere ${ch}`);
  }
  out.push({ k: "fim", v: "" });
  return out;
}

export const colNum = (letras: string) => [...letras].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
const posRef = (r: string) => { const m = REF.exec(r)!; return { l: Number(m[2]) - 1, c: colNum(m[1]) }; };
/** "A:C" ou "2:5" → os cantos do intervalo inteiro. */
function posFaixa(f: string) {
  const [x, y] = f.split(":");
  if (/^\d+$/.test(x)) {
    const l1 = Number(x) - 1, l2 = Number(y) - 1;
    if (l1 < 0 || l2 < 0) throw new Error("linha 0");
    return { a: { l: Math.min(l1, l2), c: 0 }, b: { l: Math.max(l1, l2), c: ULTIMA_COLUNA } };
  }
  const c1 = colNum(x), c2 = colNum(y);
  return { a: { l: 0, c: Math.min(c1, c2) }, b: { l: ULTIMA_LINHA, c: Math.max(c1, c2) } };
}

const BIN: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

/** Lança erro se a fórmula não puder ser lida (o adaptador explica o porquê ao aluno). */
export function analisar(formula: string): No {
  const ts = tokens(formula.replace(/^=/, ""));
  let p = 0;
  const olha = () => ts[p];
  const pega = () => ts[p++];
  const espera = (k: Tok["k"]) => { if (olha().k !== k) throw new Error(`esperava ${k}`); return pega(); };
  const numero = (v: string) => Number(v.replace(",", "."));
  /** Nomes declarados pelos LET em volta da posição atual. */
  const escopos: Set<string>[] = [];
  /** LET(nome1; valor1; [nome2; valor2]…; cálculo): cada nome vale a partir do valor seguinte. */
  function lerLet(): No {
    const args: No[] = [];
    const escopo = new Set<string>();
    escopos.push(escopo);
    for (;;) {
      if (olha().k === "id" && ts[p + 1]?.k === ";") {
        const nome = pega().v;
        pega();
        args.push({ t: "nome", v: nome }, expr(0));
        escopo.add(nome);
        if (olha().k === ";") { pega(); continue; }
        break;
      }
      args.push(expr(0));
      break;
    }
    escopos.pop();
    espera(")");
    return { t: "fn", nome: "LET", args };
  }
  /** {1;2;3} ou {1\2\3}: só constantes (número, texto, lógico, erro). */
  function lerMatriz(): No {
    const linhas: No[][] = [[]];
    for (;;) {
      const t = pega();
      let item: No;
      if (t.k === "num") item = { t: "num", v: numero(t.v) };
      else if (t.k === "op" && t.v === "-" && olha().k === "num") item = { t: "num", v: -numero(pega().v) };
      else if (t.k === "txt") item = { t: "txt", v: t.v };
      else if (t.k === "erro") item = { t: "erro", v: t.v };
      else if (t.k === "id" && (t.v === "VERDADEIRO" || t.v === "FALSO")) item = { t: "bool", v: t.v === "VERDADEIRO" };
      else throw new Error("matriz");
      linhas[linhas.length - 1].push(item);
      const sep = pega();
      if (sep.k === "}") break;
      if (sep.k === ";") linhas.push([]);
      else if (sep.k !== "\\") throw new Error("matriz");
    }
    if (linhas.some((l) => l.length !== linhas[0].length)) throw new Error("matriz irregular");
    return { t: "matriz", v: linhas };
  }
  function prim(): No {
    const t = pega();
    if (t.k === "num") return { t: "num", v: numero(t.v) };
    if (t.k === "txt") return { t: "txt", v: t.v };
    if (t.k === "erro") return { t: "erro", v: t.v };
    if (t.k === "{") return lerMatriz();
    if (t.k === "op" && (t.v === "-" || t.v === "+")) { const x = expr(6); return t.v === "-" ? { t: "un", op: "-", x } : x; }
    if (t.k === "(") { const x = expr(0); espera(")"); return x; }
    if (t.k === "aba" || t.k === "ref" || t.k === "faixa") {
      const aba = t.k === "aba" ? t.v : undefined;
      const r = t.k === "aba" ? pega() : t;
      const comAba = <T extends object>(x: T) => (aba === undefined ? x : { ...x, aba });
      if (r.k === "faixa") return comAba({ t: "int" as const, ...posFaixa(r.v) });
      if (r.k !== "ref") throw new Error("esperava ref");
      const a = posRef(r.v);
      if (olha().k === "op" && olha().v === ":") { pega(); const b = posRef(espera("ref").v); return comAba({ t: "int" as const, a: { l: Math.min(a.l, b.l), c: Math.min(a.c, b.c) }, b: { l: Math.max(a.l, b.l), c: Math.max(a.c, b.c) } }); }
      return comAba({ t: "ref" as const, ...a });
    }
    if (t.k === "id") {
      if (olha().k === "(") {
        pega();
        if (t.v === "LET") return lerLet();
        const args: No[] = [];
        if (olha().k !== ")") {
          for (;;) {
            args.push(olha().k === ";" || olha().k === ")" ? { t: "vazio" } : expr(0));
            if (olha().k === ";") { pega(); continue; }
            break;
          }
        }
        espera(")");
        return { t: "fn", nome: t.v, args };
      }
      if (escopos.some((e) => e.has(t.v))) return { t: "nome", v: t.v };
      if (t.v === "VERDADEIRO") return { t: "bool", v: true };
      if (/^[A-Z]{1,3}\d+$/.test(t.v)) return { t: "erro", v: "#REF!" };
      if (t.v === "FALSO") return { t: "bool", v: false };
      throw new Error(`nome ${t.v}`);
    }
    throw new Error(`inesperado ${t.v}`);
  }
  function expr(min: number): No {
    let a = prim();
    for (;;) {
      const t = olha();
      if (t.k === "op" && t.v === "%") { pega(); a = { t: "pct", x: a }; continue; }
      if (t.k !== "op" || !(t.v in BIN) || BIN[t.v] < min) break;
      const prec = BIN[t.v];
      pega();
      // Todos os operadores associam da esquerda, inclusive o ^ (no Excel, 2^3^2 = 64).
      const b = expr(prec + 1);
      a = { t: "bin", op: t.v, a, b };
    }
    return a;
  }
  const raiz = expr(0);
  if (olha().k !== "fim") throw new Error("sobra");
  return raiz;
}
