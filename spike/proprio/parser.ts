// Motor próprio (protótipo): análise de fórmulas em pt-BR, direto, sem tradução.
export type No =
  | { t: "num"; v: number }
  | { t: "txt"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; l: number; c: number }
  | { t: "int"; a: { l: number; c: number }; b: { l: number; c: number } }
  | { t: "un"; op: string; x: No }
  | { t: "pct"; x: No }
  | { t: "bin"; op: string; a: No; b: No }
  | { t: "fn"; nome: string; args: No[] };

type Tok = { k: "num" | "txt" | "id" | "ref" | "op" | "(" | ")" | ";" | "fim"; v: string };

const REF = /^\$?([A-Z]{1,3})\$?(\d+)/;
const ID = /^[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*/;

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
    if ((m = /^\d+(,\d+)?/.exec(r)) && !/^[A-Za-z]/.test(r.slice(m[0].length))) { out.push({ k: "num", v: m[0] }); i += m[0].length; continue; }
    if ((m = REF.exec(r.toUpperCase())) && !/^[A-Za-z0-9_.(]/.test(r.slice(m[0].length))) { out.push({ k: "ref", v: m[0].toUpperCase() }); i += m[0].length; continue; }
    if ((m = ID.exec(r))) { out.push({ k: "id", v: m[0].toUpperCase() }); i += m[0].length; continue; }
    const dois = s.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(dois)) { out.push({ k: "op", v: dois }); i += 2; continue; }
    if ("+-*/^&=<>:%".includes(ch)) { out.push({ k: "op", v: ch }); i++; continue; }
    if (ch === "(" || ch === ")" || ch === ";") { out.push({ k: ch, v: ch }); i++; continue; }
    throw new Error(`caractere ${ch}`);
  }
  out.push({ k: "fim", v: "" });
  return out;
}

export const colNum = (letras: string) => [...letras].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
const posRef = (r: string) => { const m = REF.exec(r)!; return { l: Number(m[2]) - 1, c: colNum(m[1]) }; };

const BIN: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

export function analisar(formula: string): No {
  const ts = tokens(formula.replace(/^=/, ""));
  let p = 0;
  const olha = () => ts[p];
  const pega = () => ts[p++];
  const espera = (k: Tok["k"]) => { if (olha().k !== k) throw new Error(`esperava ${k}`); return pega(); };
  function prim(): No {
    const t = pega();
    if (t.k === "num") return { t: "num", v: Number(t.v.replace(",", ".")) };
    if (t.k === "txt") return { t: "txt", v: t.v };
    if (t.k === "op" && (t.v === "-" || t.v === "+")) { const x = expr(6); return t.v === "-" ? { t: "un", op: "-", x } : x; }
    if (t.k === "(") { const x = expr(0); espera(")"); return x; }
    if (t.k === "ref") {
      const a = posRef(t.v);
      if (olha().k === "op" && olha().v === ":") { pega(); const b = posRef(espera("ref").v); return { t: "int", a: { l: Math.min(a.l, b.l), c: Math.min(a.c, b.c) }, b: { l: Math.max(a.l, b.l), c: Math.max(a.c, b.c) } }; }
      return { t: "ref", ...a };
    }
    if (t.k === "id") {
      if (olha().k === "(") {
        pega();
        const args: No[] = [];
        if (olha().k !== ")") {
          for (;;) {
            args.push(olha().k === ";" || olha().k === ")" ? { t: "txt", v: "" } : expr(0));
            if (olha().k === ";") { pega(); continue; }
            break;
          }
        }
        espera(")");
        return { t: "fn", nome: t.v, args };
      }
      if (t.v === "VERDADEIRO") return { t: "bool", v: true };
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
      if (t.k !== "op" || !(t.v in BIN) || BIN[t.v] < min || (BIN[t.v] === min && t.v !== "^" && min > 0 && false)) break;
      const prec = BIN[t.v];
      if (prec < min) break;
      pega();
      const b = expr(t.v === "^" ? prec : prec + 1);
      a = { t: "bin", op: t.v, a, b };
    }
    return a;
  }
  const raiz = expr(0);
  if (olha().k !== "fim") throw new Error("sobra");
  return raiz;
}
