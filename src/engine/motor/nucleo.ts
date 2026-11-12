/**
 * Motor de fórmulas próprio: avaliação, dependências, referências circulares,
 * resultados que derramam (FILTRO, ÚNICO…) e as funções do catálogo, em pt-BR.
 * Sem dependências externas.
 */
import { analisar, type No } from "./parser";

export type Erro = { erro: string };
export type V = number | string | boolean | null | Erro;
type M = V[][];
type R = V | M;
const ehM = (x: R): x is M => Array.isArray(x);
const ehErro = (v: unknown): v is Erro => typeof v === "object" && v !== null && "erro" in (v as object);
const E = (e: string): Erro => ({ erro: e });

// --- datas no sistema do Excel (1900, com o 29/02/1900 que não existiu) ---
const BASE = Date.UTC(1899, 11, 30);
export const serial = (a: number, m: number, d: number) => Math.round((Date.UTC(a, m - 1, d) - BASE) / 86400000);
const partes = (s: number) => { const d = new Date(BASE + Math.floor(s) * 86400000); return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), sem: d.getUTCDay() }; };
const fimDoMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

// --- coerções ---
function num(v: V): number | Erro {
  if (ehErro(v)) return v;
  if (v === null || v === "") return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  return textoParaNumero(v) ?? E("#VALOR!");
}

/** Texto que o Excel aceita numa conta: "1.234,5", "5%", "R$ 10", "02/12/2026". */
function textoParaNumero(s: string): number | null {
  const t = s.trim();
  const n = (x: string) => Number(x.replace(/\./g, "").replace(",", "."));
  let m: RegExpExecArray | null;
  if ((m = /^(-?)R\$\s*([\d.]+(?:,\d+)?)$/.exec(t))) return (m[1] ? -1 : 1) * n(m[2]);
  if ((m = /^(-?[\d.]+(?:,\d+)?)\s*%$/.exec(t))) return n(m[1]) / 100;
  if (/^-?[\d.]+(?:,\d+)?$/.test(t)) return n(t);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return serial(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}
const txt = (v: V): string | Erro =>
  ehErro(v) ? v : v === null ? "" : typeof v === "boolean" ? (v ? "VERDADEIRO" : "FALSO") : typeof v === "number" ? String(Math.round(v * 1e10) / 1e10).replace(".", ",") : v;
const bool = (v: V): boolean | Erro => (ehErro(v) ? v : typeof v === "boolean" ? v : typeof v === "string" ? E("#VALOR!") : (num(v) as number) !== 0);
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

/** Ordem do Excel: número < texto < lógico; texto sem diferenciar maiúsculas. */
function comparar(a: V, b: V): number {
  const rank = (v: V) => (typeof v === "number" || v === null ? 0 : typeof v === "string" ? 1 : 2);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return ((a as number) ?? 0) - ((b as number) ?? 0);
  if (ra === 1) { const x = (a as string).toUpperCase(), y = (b as string).toUpperCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return Number(a) - Number(b);
}

// --- critérios de CONT.SE, SOMASE… ---
function criterio(c: V): (v: V) => boolean {
  if (typeof c === "number" || typeof c === "boolean") return (v) => v === c || (typeof v === "string" && (num(v) as number) === c);
  const s = txt(c) as string;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s)!;
  const op = m[1] ?? "=";
  const alvo = m[2];
  const n = /^-?\d+(?:[.,]\d+)?$/.test(alvo.trim()) ? Number(alvo.trim().replace(",", ".")) : null;
  if (n !== null) {
    return (v) => {
      if (typeof v !== "number") return op === "<>" ? true : false;
      return op === "=" ? v === n : op === "<>" ? v !== n : op === "<" ? v < n : op === ">" ? v > n : op === "<=" ? v <= n : v >= n;
    };
  }
  if (op === "=" || op === "<>") {
    const re = new RegExp("^" + alvo.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
    const casa = (v: V) => (alvo === "" ? v === null || v === "" : typeof v === "string" && re.test(v));
    return op === "=" ? casa : (v) => !casa(v);
  }
  return (v) => { if (typeof v !== "string") return false; const r = comparar(v, alvo); return op === "<" ? r < 0 : op === ">" ? r > 0 : op === "<=" ? r <= 0 : r >= 0; };
}

const achatar = (x: R): V[] => (ehM(x) ? x.flat() : [x]);
const comoM = (x: R): M => (ehM(x) ? x : [[x]]);

/** Aplica uma operação item a item, com expansão de linha/coluna/escalar (aritmética de matrizes). */
function elemento(a: R, b: R, f: (x: V, y: V) => V): R {
  if (!ehM(a) && !ehM(b)) return f(a, b);
  const A = comoM(a), B = comoM(b);
  const linhas = Math.max(A.length, B.length), cols = Math.max(A[0].length, B[0].length);
  const at = (X: M, l: number, c: number): V => X[X.length === 1 ? 0 : l]?.[X[0].length === 1 ? 0 : c] ?? E("#N/D");
  return Array.from({ length: linhas }, (_, l) => Array.from({ length: cols }, (_, c) => f(at(A, l, c), at(B, l, c))));
}
const mapa = (a: R, f: (x: V) => V): R => (ehM(a) ? a.map((l) => l.map(f)) : f(a));

type Ctx = { ler: (l: number, c: number) => V; hoje: () => number; agora: () => number };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** TEXTO(valor; formato): os formatos mais comuns do Excel em português. */
function formatarTexto(v: V, f: string): V {
  const n = num(v);
  if (ehErro(n)) return typeof v === "string" ? v : n;
  const fmt = f.toLowerCase();
  if (/[dmay]/.test(fmt) && !/[0#]/.test(fmt)) {
    const p = partes(n);
    return fmt
      .replace(/aaaa|yyyy/g, String(p.a)).replace(/aa|yy/g, String(p.a).slice(-2))
      .replace(/mmmm/g, MESES_LONGOS[p.m - 1]).replace(/mmm/g, MESES[p.m - 1]).replace(/mm/g, String(p.m).padStart(2, "0"))
      .replace(/dd/g, String(p.d).padStart(2, "0"));
  }
  const pct = fmt.includes("%");
  const x = pct ? n * 100 : n;
  const dec = (/,([0#]+)/.exec(fmt)?.[1].length) ?? 0;
  const milhar = /[0#]\.[0#]/.test(fmt);
  const corpo = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: milhar }).format(x);
  return (fmt.startsWith("r$") ? "R$ " : "") + corpo + (pct ? "%" : "");
}

function binop(op: string, x: V, y: V): V {
  if (ehErro(x)) return x;
  if (ehErro(y)) return y;
  if (op === "&") { const a = txt(x), b = txt(y); return ehErro(a) ? a : ehErro(b) ? b : a + b; }
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    const r = comparar(x === null ? (typeof y === "string" ? "" : y === null ? 0 : typeof y === "boolean" ? false : 0) : x, y === null ? (typeof x === "string" ? "" : typeof x === "boolean" ? false : 0) : y);
    return op === "=" ? r === 0 : op === "<>" ? r !== 0 : op === "<" ? r < 0 : op === ">" ? r > 0 : op === "<=" ? r <= 0 : r >= 0;
  }
  const a = num(x), b = num(y);
  if (ehErro(a)) return a;
  if (ehErro(b)) return b;
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? E("#DIV/0!") : a / b;
    case "^": return a ** b;
  }
  return E("#VALOR!");
}

/** Número que não é finito (texto convertido à força, 1/0 em potência…) vira erro, como no Excel. */
const finito = (r: R): R => mapa(r, (v) => (typeof v === "number" && !Number.isFinite(v) ? E(Number.isNaN(v) ? "#VALOR!" : "#NÚM!") : v === undefined ? null : v));

export function avaliar(no: No, ctx: Ctx): R {
  return finito(avaliar0(no, ctx));
}

function avaliar0(no: No, ctx: Ctx): R {
  switch (no.t) {
    case "num": return no.v;
    case "txt": return no.v;
    case "bool": return no.v;
    case "erro": return E(no.v);
    case "ref": return ctx.ler(no.l, no.c);
    case "int": return Array.from({ length: no.b.l - no.a.l + 1 }, (_, i) => Array.from({ length: no.b.c - no.a.c + 1 }, (_, j) => ctx.ler(no.a.l + i, no.a.c + j)));
    case "un": return mapa(avaliar(no.x, ctx), (v) => { const n = num(v); return ehErro(n) ? n : -n; });
    case "pct": return mapa(avaliar(no.x, ctx), (v) => { const n = num(v); return ehErro(n) ? n : n / 100; });
    case "bin": return elemento(avaliar(no.a, ctx), avaliar(no.b, ctx), (x, y) => binop(no.op, x, y));
    case "fn": {
      const f = FUNCOES[no.nome];
      if (!f) return E("#NOME?");
      try { return f(no.args, ctx); } catch { return E("#VALOR!"); }
    }
  }
}

// --- funções ---
type F = (args: No[], ctx: Ctx) => R;
const ev = (n: No, ctx: Ctx) => avaliar(n, ctx);
const esc = (n: No | undefined, ctx: Ctx, padrao: V = null): V => { if (!n) return padrao; const r = ev(n, ctx); return ehM(r) ? r[0][0] : r; };
const numArg = (n: No | undefined, ctx: Ctx, padrao = 0): number => { const v = esc(n, ctx, padrao); const x = num(v); if (ehErro(x)) throw x; return x; };

/** Função de valores únicos que aceita intervalo (Excel 365 aplica item a item). */
const lift = (f: (...v: V[]) => V): F => (args, ctx) => {
  const vals = args.map((a) => ev(a, ctx));
  if (!vals.some(ehM)) { const e = vals.find(ehErro); return e ?? f(...(vals as V[]), null, null, null, null); }
  // aplica sobre a primeira matriz, com os demais como escalares/expandidos
  const m = vals.find(ehM) as M;
  return m.map((linha, l) => linha.map((_, c) => {
    const vs = vals.map((v) => (ehM(v) ? v[v.length === 1 ? 0 : l][v[0].length === 1 ? 0 : c] : v));
    const e = vs.find(ehErro); return e ?? f(...vs, null, null, null, null);
  }));
};
const numericos = (args: No[], ctx: Ctx) => {
  const out: number[] = [];
  for (const a of args) {
    const r = ev(a, ctx);
    if (ehM(r)) { for (const v of r.flat()) { if (ehErro(v)) throw v; if (typeof v === "number") out.push(v); } }
    else { const n = num(r); if (ehErro(n)) throw n; out.push(n); }
  }
  return out;
};
const agregado = (f: (ns: number[]) => V): F => (args, ctx) => { try { return f(numericos(args, ctx)); } catch (e) { return ehErro(e) ? e : E("#VALOR!"); } };
const arred = (x: number, n: number, modo: "perto" | "cima" | "baixo") => {
  const k = 10 ** n, y = Math.abs(x) * k, s = Math.sign(x);
  const r = modo === "perto" ? Math.round(y + 1e-9) : modo === "cima" ? Math.ceil(y - 1e-9) : Math.floor(y + 1e-9);
  return (s * r) / k;
};
const pares = (args: No[], ctx: Ctx, inicio: number) => {
  const conds: { faixa: V[]; ok: (v: V) => boolean }[] = [];
  for (let i = inicio; i < args.length; i += 2) conds.push({ faixa: achatar(ev(args[i], ctx)), ok: criterio(esc(args[i + 1], ctx)) });
  return (idx: number) => conds.every((c) => c.ok(c.faixa[idx] ?? null));
};
const exato = (a: V, b: V) => (typeof a === "string" && typeof b === "string" ? a.toUpperCase() === b.toUpperCase() : a === b);
function busca(chave: V, lista: V[], aproximada: boolean): number {
  if (!aproximada) return lista.findIndex((v) => exato(v, chave));
  let achou = -1;
  for (let i = 0; i < lista.length; i++) { if (lista[i] === null) continue; if (comparar(lista[i], chave) <= 0) achou = i; else break; }
  return achou;
}
const diasUteis = (a: number, b: number, fer: Set<number>) => { let n = 0; const [i, f] = a <= b ? [a, b] : [b, a]; for (let d = i; d <= f; d++) { const s = partes(d).sem; if (s !== 0 && s !== 6 && !fer.has(d)) n++; } return a <= b ? n : -n; };
const feriados = (n: No | undefined, ctx: Ctx) => new Set(n ? achatar(ev(n, ctx)).filter((v): v is number => typeof v === "number") : []);
const somaMeses = (s: number, n: number, fim: boolean) => { const p = partes(s); const t = p.m - 1 + n; const a = p.a + Math.floor(t / 12), m = (((t % 12) + 12) % 12) + 1; return serial(a, m, fim ? fimDoMes(a, m) : Math.min(p.d, fimDoMes(a, m))); };

export const FUNCOES: Record<string, F> = {
  SOMA: agregado((ns) => ns.reduce((a, b) => a + b, 0)),
  "MÉDIA": agregado((ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!"))),
  "MÍNIMO": agregado((ns) => (ns.length ? Math.min(...ns) : 0)),
  "MÁXIMO": agregado((ns) => (ns.length ? Math.max(...ns) : 0)),
  "CONT.NÚM": (args, ctx) => args.flatMap((a) => achatar(ev(a, ctx))).filter((v) => typeof v === "number").length,
  "CONT.VALORES": (args, ctx) => args.flatMap((a) => achatar(ev(a, ctx))).filter((v) => v !== null && v !== "").length,
  "CONTAR.VAZIO": (args, ctx) => achatar(ev(args[0], ctx)).filter((v) => v === null || v === "").length,
  ARRED: lift((x, n) => { const a = num(x), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : arred(a, b, "perto"); }),
  "ARREDONDAR.PARA.CIMA": lift((x, n) => arred(num(x) as number, num(n) as number, "cima")),
  "ARREDONDAR.PARA.BAIXO": lift((x, n) => arred(num(x) as number, num(n) as number, "baixo")),
  INT: lift((x) => Math.floor(num(x) as number)),
  ABS: lift((x) => Math.abs(num(x) as number)),
  MAIOR: (args, ctx) => { const ns = achatar(ev(args[0], ctx)).filter((v): v is number => typeof v === "number").sort((a, b) => b - a); const k = numArg(args[1], ctx); return ns[k - 1] ?? E("#NÚM!"); },
  MENOR: (args, ctx) => { const ns = achatar(ev(args[0], ctx)).filter((v): v is number => typeof v === "number").sort((a, b) => a - b); const k = numArg(args[1], ctx); return ns[k - 1] ?? E("#NÚM!"); },
  SE: (args, ctx) => {
    const t = ev(args[0], ctx);
    const escolhe = (v: V): R => { const b = bool(v); if (ehErro(b)) return b; return b ? (args[1] ? ev(args[1], ctx) : true) : args[2] ? ev(args[2], ctx) : false; };
    if (!ehM(t)) return escolhe(t);
    return t.map((l) => l.map((v) => { const r = escolhe(v); return ehM(r) ? r[0][0] : r; }));
  },
  SES: (args, ctx) => { for (let i = 0; i < args.length; i += 2) { const b = bool(esc(args[i], ctx)); if (ehErro(b)) return b; if (b) return ev(args[i + 1], ctx); } return E("#N/D"); },
  E: (args, ctx) => { for (const v of args.flatMap((a) => achatar(ev(a, ctx)))) { const b = bool(v); if (ehErro(b)) return b; if (!b) return false; } return true; },
  OU: (args, ctx) => { for (const v of args.flatMap((a) => achatar(ev(a, ctx)))) { const b = bool(v); if (ehErro(b)) return b; if (b) return true; } return false; },
  "NÃO": lift((v) => { const b = bool(v); return ehErro(b) ? b : !b; }),
  SEERRO: (args, ctx) => { const r = ev(args[0], ctx); return ehM(r) ? r.map((l) => l.map((v) => (ehErro(v) ? esc(args[1], ctx) : v))) : ehErro(r) ? ev(args[1], ctx) : r; },
  "SENÃODISP": (args, ctx) => { const r = ev(args[0], ctx); return ehErro(r) && r.erro === "#N/D" ? ev(args[1], ctx) : r; },
  "CONT.SE": (args, ctx) => { const ok = criterio(esc(args[1], ctx)); return achatar(ev(args[0], ctx)).filter(ok).length; },
  "CONT.SES": (args, ctx) => { const n = achatar(ev(args[0], ctx)).length; const ok = pares(args, ctx, 0); let k = 0; for (let i = 0; i < n; i++) if (ok(i)) k++; return k; },
  SOMASE: (args, ctx) => { const faixa = achatar(ev(args[0], ctx)); const soma = args[2] ? achatar(ev(args[2], ctx)) : faixa; const ok = criterio(esc(args[1], ctx)); return faixa.reduce<number>((s, v, i) => s + (ok(v) && typeof soma[i] === "number" ? (soma[i] as number) : 0), 0); },
  SOMASES: (args, ctx) => { const soma = achatar(ev(args[0], ctx)); const ok = pares(args, ctx, 1); return soma.reduce<number>((s, v, i) => s + (ok(i) && typeof v === "number" ? v : 0), 0); },
  "MÉDIASE": (args, ctx) => { const faixa = achatar(ev(args[0], ctx)); const val = args[2] ? achatar(ev(args[2], ctx)) : faixa; const ok = criterio(esc(args[1], ctx)); const ns = faixa.flatMap((v, i) => (ok(v) && typeof val[i] === "number" ? [val[i] as number] : [])); return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!"); },
  "MÁXIMOSES": (args, ctx) => { const val = achatar(ev(args[0], ctx)); const ok = pares(args, ctx, 1); const ns = val.filter((v, i): v is number => ok(i) && typeof v === "number"); return ns.length ? Math.max(...ns) : 0; },
  "MÍNIMOSES": (args, ctx) => { const val = achatar(ev(args[0], ctx)); const ok = pares(args, ctx, 1); const ns = val.filter((v, i): v is number => ok(i) && typeof v === "number"); return ns.length ? Math.min(...ns) : 0; },
  SOMARPRODUTO: (args, ctx) => { const ms = args.map((a) => achatar(ev(a, ctx))); let s = 0; for (let i = 0; i < ms[0].length; i++) { let p = 1; for (const m of ms) { const v = m[i]; if (ehErro(v)) return v; p *= typeof v === "number" ? v : typeof v === "boolean" ? Number(v) : 0; } s += p; } return s; },
  PROCV: (args, ctx) => { const chave = esc(args[0], ctx); const t = comoM(ev(args[1], ctx)); const col = numArg(args[2], ctx); const aprox = args[3] ? (bool(esc(args[3], ctx)) as boolean) : true; if (col < 1 || col > t[0].length) return E("#REF!"); const i = busca(chave, t.map((l) => l[0]), aprox); return i < 0 ? E("#N/D") : t[i][col - 1]; },
  PROCH: (args, ctx) => { const chave = esc(args[0], ctx); const t = comoM(ev(args[1], ctx)); const lin = numArg(args[2], ctx); const aprox = args[3] ? (bool(esc(args[3], ctx)) as boolean) : true; if (lin < 1 || lin > t.length) return E("#REF!"); const i = busca(chave, t[0], aprox); return i < 0 ? E("#N/D") : t[lin - 1][i]; },
  PROCX: (args, ctx) => {
    const ch = ev(args[0], ctx); const onde = comoM(ev(args[1], ctx)); const ret = comoM(ev(args[2], ctx));
    const vertical = onde[0].length === 1; const lista = vertical ? onde.map((l) => l[0]) : onde[0];
    if ((vertical ? ret.length : ret[0].length) !== lista.length) return E("#VALOR!");
    const um = (chave: V): R => { const i = lista.findIndex((v) => exato(v, chave)); if (i < 0) return args[3] ? esc(args[3], ctx) : E("#N/D"); return vertical ? (ret[i].length === 1 ? ret[i][0] : [ret[i]]) : ret.length === 1 ? ret[0][i] : ret.map((l) => [l[i]]); };
    return ehM(ch) ? ch.map((l) => l.map((v) => { const r = um(v); return ehM(r) ? r[0][0] : r; })) : um(ch);
  },
  "ÍNDICE": (args, ctx) => { const t = comoM(ev(args[0], ctx)); let l = numArg(args[1], ctx); let c = args[2] ? numArg(args[2], ctx) : 1; if (t.length === 1 && !args[2]) { c = l; l = 1; } return t[l - 1]?.[c - 1] ?? E("#REF!"); },
  CORRESP: (args, ctx) => { const chave = esc(args[0], ctx); const lista = achatar(ev(args[1], ctx)); const tipo = args[2] ? numArg(args[2], ctx) : 1; if (tipo === 0) { const i = lista.findIndex((v) => exato(v, chave)); return i < 0 ? E("#N/D") : i + 1; } if (tipo === 1) { const i = busca(chave, lista, true); return i < 0 ? E("#N/D") : i + 1; } let a = -1; for (let i = 0; i < lista.length; i++) if (comparar(lista[i], chave) >= 0) a = i; else break; return a < 0 ? E("#N/D") : a + 1; },
  CONCAT: (args, ctx) => { let s = ""; for (const v of args.flatMap((a) => achatar(ev(a, ctx)))) { const t = txt(v); if (ehErro(t)) return t; s += t; } return s; },
  CONCATENAR: (args, ctx) => FUNCOES.CONCAT(args, ctx),
  ESQUERDA: lift((t, n) => { const s = txt(t); return ehErro(s) ? s : s.slice(0, n === null ? 1 : (num(n) as number)); }),
  DIREITA: lift((t, n) => { const s = txt(t); const k = n === null ? 1 : (num(n) as number); return ehErro(s) ? s : k === 0 ? "" : s.slice(-k); }),
  "EXT.TEXTO": lift((t, i, n) => { const s = txt(t); return ehErro(s) ? s : s.substr((num(i) as number) - 1, num(n) as number); }),
  "NÚM.CARACT": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.length; }),
  ARRUMAR: lift((t) => { const s = txt(t); return ehErro(s) ? s : s.replace(/ +/g, " ").trim(); }),
  "MAIÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toUpperCase(); }),
  "MINÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toLowerCase(); }),
  "PRI.MAIÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()); }),
  LOCALIZAR: lift((p, t, ini) => { const a = semAcento(txt(p) as string), b = semAcento(txt(t) as string); const i = b.indexOf(a, (ini === null ? 1 : (num(ini) as number)) - 1); return i < 0 ? E("#VALOR!") : i + 1; }),
  SUBSTITUIR: lift((t, de, para, n) => { const s = txt(t) as string, a = txt(de) as string, b = txt(para) as string; if (!a) return s; if (n === null) return s.split(a).join(b); let k = 0; const alvo = num(n) as number; return s.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), (x) => (++k === alvo ? b : x)); }),
  VALOR: lift((t) => num(t)),
  HOJE: (_a, ctx) => ctx.hoje(),
  DATA: lift((a, m, d) => { const A = num(a) as number, Mm = num(m) as number, D = num(d) as number; return Math.round((Date.UTC(A, Mm - 1, D) - BASE) / 86400000); }),
  ANO: lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).a; }),
  "MÊS": lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).m; }),
  DIA: lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).d; }),
  "DIA.DA.SEMANA": lift((s, tipo) => { const n = num(s); if (ehErro(n)) return n; const w = partes(n).sem; const t = tipo === null ? 1 : (num(tipo) as number); return t === 2 ? ((w + 6) % 7) + 1 : t === 3 ? (w + 6) % 7 : w + 1; }),
  DATADIF: (args, ctx) => {
    const a = numArg(args[0], ctx), b = numArg(args[1], ctx), u = String(esc(args[2], ctx)).toUpperCase();
    if (a > b) return E("#NÚM!");
    const p = partes(a), q = partes(b);
    let meses = (q.a - p.a) * 12 + (q.m - p.m); if (q.d < p.d) meses--;
    if (u === "D") return b - a; if (u === "M") return meses; if (u === "Y") return Math.floor(meses / 12); if (u === "YM") return meses % 12;
    if (u === "MD") return q.d >= p.d ? q.d - p.d : b - somaMeses(a, meses, false);
    return E("#NÚM!");
  },
  DIATRABALHOTOTAL: (args, ctx) => diasUteis(numArg(args[0], ctx), numArg(args[1], ctx), feriados(args[2], ctx)),
  DIATRABALHO: (args, ctx) => { let d = numArg(args[0], ctx); let n = numArg(args[1], ctx); const fer = feriados(args[2], ctx); const passo = n >= 0 ? 1 : -1; while (n !== 0) { d += passo; const s = partes(d).sem; if (s !== 0 && s !== 6 && !fer.has(d)) n -= passo; } return d; },
  "FIMMÊS": lift((s, n) => somaMeses(num(s) as number, num(n) as number, true)),
  DATAM: lift((s, n) => somaMeses(num(s) as number, num(n) as number, false)),
  FILTRO: (args, ctx) => {
    const m = comoM(ev(args[0], ctx)); const inc = comoM(ev(args[1], ctx));
    let out: M;
    if (inc[0].length === 1 && inc.length === m.length) out = m.filter((_, i) => bool(inc[i][0]) === true);
    else if (inc.length === 1 && inc[0].length === m[0].length) out = m.map((l) => l.filter((_, j) => bool(inc[0][j]) === true));
    else return E("#VALOR!");
    if (out.length && out[0].length) return out;
    return args[2] ? ev(args[2], ctx) : E("#CALC!");
  },
  CLASSIFICAR: (args, ctx) => { const m = comoM(ev(args[0], ctx)); const i = args[1] ? numArg(args[1], ctx) : 1; const o = args[2] ? numArg(args[2], ctx) : 1; return [...m].map((l, k) => ({ l, k })).sort((a, b) => o * comparar(a.l[i - 1], b.l[i - 1]) || a.k - b.k).map((x) => x.l); },
  "ÚNICO": (args, ctx) => { const m = comoM(ev(args[0], ctx)); const vistos = new Set<string>(); return m.filter((l) => { const k = JSON.stringify(l.map((v) => (typeof v === "string" ? v.toUpperCase() : v))); if (vistos.has(k)) return false; vistos.add(k); return true; }); },
  "SEQUÊNCIA": (args, ctx) => { const l = numArg(args[0], ctx), c = args[1] ? numArg(args[1], ctx, 1) : 1, i = args[2] ? numArg(args[2], ctx, 1) : 1, p = args[3] ? numArg(args[3], ctx, 1) : 1; return Array.from({ length: l }, (_, a) => Array.from({ length: c }, (_, b) => i + (a * c + b) * p)); },
  TRUNCAR: lift((x, n) => { const a = num(x); return ehErro(a) ? a : Math.trunc(a * 10 ** ((n === null ? 0 : (num(n) as number)))) / 10 ** (n === null ? 0 : (num(n) as number)); }),
  MOD: lift((x, d) => { const a = num(x), b = num(d); if (ehErro(a)) return a; if (ehErro(b)) return b; return b === 0 ? E("#DIV/0!") : a - b * Math.floor(a / b); }),
  "POTÊNCIA": lift((x, p) => { const a = num(x), b = num(p); return ehErro(a) ? a : ehErro(b) ? b : a ** b; }),
  RAIZ: lift((x) => { const a = num(x); return ehErro(a) ? a : a < 0 ? E("#NÚM!") : Math.sqrt(a); }),
  MED: agregado((ns) => { if (!ns.length) return E("#NÚM!"); const o = [...ns].sort((a, b) => a - b), m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; }),
  "ÉERROS": (args, ctx) => mapa(ev(args[0], ctx), (v) => ehErro(v)),
  "ÉCÉL.VAZIA": (args, ctx) => mapa(ev(args[0], ctx), (v) => v === null),
  "ÉNÚM": (args, ctx) => mapa(ev(args[0], ctx), (v) => typeof v === "number"),
  "ÉTEXTO": (args, ctx) => mapa(ev(args[0], ctx), (v) => typeof v === "string"),
  ESCOLHER: (args, ctx) => { const i = numArg(args[0], ctx); return i >= 1 && i < args.length ? ev(args[i], ctx) : E("#VALOR!"); },
  DESLOC: (args, ctx) => {
    const base = args[0];
    if (base.t !== "ref" && base.t !== "int") return E("#VALOR!");
    const a = base.t === "ref" ? { l: base.l, c: base.c } : base.a;
    const altura0 = base.t === "int" ? base.b.l - base.a.l + 1 : 1, largura0 = base.t === "int" ? base.b.c - base.a.c + 1 : 1;
    const l = a.l + numArg(args[1], ctx), c = a.c + numArg(args[2], ctx);
    const h = args[3] ? numArg(args[3], ctx) : altura0, w = args[4] ? numArg(args[4], ctx) : largura0;
    if (l < 0 || c < 0 || h < 1 || w < 1) return E("#REF!");
    const m = Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => ctx.ler(l + i, c + j)));
    return h === 1 && w === 1 ? m[0][0] : m;
  },
  PROCURAR: lift((p, t, ini) => { const a = txt(p) as string, b = txt(t) as string; const i = b.indexOf(a, (ini === null ? 1 : (num(ini) as number)) - 1); return i < 0 ? E("#VALOR!") : i + 1; }),
  TEXTO: lift((v, f) => formatarTexto(v, txt(f) as string)),
  REPT: lift((t, n) => { const s = txt(t), k = num(n); return ehErro(s) ? s : ehErro(k) ? k : s.repeat(Math.max(0, Math.floor(k))); }),
  AGORA: (_a, ctx) => ctx.agora(),
  VERDADEIRO: () => true,
  FALSO: () => false,
  PGTO: (args, ctx) => { const i = numArg(args[0], ctx), n = numArg(args[1], ctx), vp = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0; if (i === 0) return -(vp + vf) / n; const f = (1 + i) ** n; return (-(vp * f + vf) * i) / ((1 + i * t) * (f - 1)); },
};

export type Tipo = "NUMBER_RAW" | "NUMBER_DATE" | "NUMBER_TIME" | "NUMBER_DATETIME" | "NUMBER_CURRENCY" | "NUMBER_PERCENT" | "STRING" | "BOOLEAN" | "ERROR" | "EMPTY";
/** Conteúdo de uma célula: fórmula já analisada ou valor digitado (com o tipo que a digitação indicou). */
export type Conteudo = { formula: No } | { valor: V; tipo: Tipo };

const DATAS = new Set(["DATA", "HOJE", "FIMMÊS", "DATAM", "DIATRABALHO"]);

/**
 * Uma planilha calculada sob demanda: cada leitura calcula o que falta e
 * guarda em cache até a próxima mudança. As planilhas dos exercícios são
 * pequenas (até 50 × 26), então recalcular tudo a cada mudança é instantâneo.
 */
export class Calculo {
  private conteudos = new Map<string, Conteudo>();
  private cache = new Map<string, V>();
  private tipos = new Map<string, Tipo>();
  private derramado = new Map<string, V>();
  private pilha = new Set<string>();
  constructor(
    private hoje: () => number = () => { const d = new Date(); return serial(d.getFullYear(), d.getMonth() + 1, d.getDate()); },
  ) {}

  definir(l: number, c: number, conteudo: Conteudo | null) {
    const k = `${l},${c}`;
    if (conteudo === null) this.conteudos.delete(k);
    else this.conteudos.set(k, conteudo);
    this.cache.clear();
    this.tipos.clear();
    this.derramado.clear();
  }

  temFormula(l: number, c: number) {
    const x = this.conteudos.get(`${l},${c}`);
    return !!x && "formula" in x;
  }

  /** Preenchida pelo resultado de uma fórmula que derramou (FILTRO, ÚNICO…). */
  derramada(l: number, c: number) {
    const k = `${l},${c}`;
    if (this.conteudos.has(k)) return false;
    this.ler(l, c);
    return this.derramado.has(k);
  }

  private calcular(k: string): V {
    if (this.cache.has(k)) return this.cache.get(k)!;
    if (this.pilha.has(k)) return E("#CIRC!");
    const no = (this.conteudos.get(k) as { formula: No }).formula;
    this.pilha.add(k);
    const [l, c] = k.split(",").map(Number);
    const agora = () => { const d = new Date(); return this.hoje() + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; };
    const r = avaliar(no, { ler: (a, b) => this.ler(a, b), hoje: this.hoje, agora });
    this.pilha.delete(k);
    let v: V;
    if (Array.isArray(r)) {
      const ocupado = r.some((linha, i) => linha.some((_, j) => (i || j) && (this.conteudos.has(`${l + i},${c + j}`) || this.derramado.has(`${l + i},${c + j}`))));
      if (ocupado) v = E("#DESPEJAR!");
      else {
        r.forEach((linha, i) => linha.forEach((x, j) => { if (i || j) this.derramado.set(`${l + i},${c + j}`, x ?? null); }));
        v = r[0][0] ?? null;
      }
    } else v = r;
    this.cache.set(k, v);
    return v;
  }

  ler(l: number, c: number): V {
    const k = `${l},${c}`;
    const x = this.conteudos.get(k);
    if (x && "formula" in x) return this.calcular(k);
    if (x) return x.valor;
    // Vazia: pode ser parte do resultado de uma fórmula que derrama. Calcula as pendentes.
    if (!this.derramado.has(k))
      for (const [kk, y] of this.conteudos) if ("formula" in y && !this.cache.has(kk) && !this.pilha.has(kk)) this.calcular(kk);
    return this.derramado.get(k) ?? null;
  }

  /** Tipo do valor, para a exibição (data, moeda, porcentagem…), como o Excel infere. */
  tipo(l: number, c: number): Tipo {
    const v = this.ler(l, c);
    if (v === null) return "EMPTY";
    if (typeof v === "string") return "STRING";
    if (typeof v === "boolean") return "BOOLEAN";
    if (typeof v === "object") return "ERROR";
    const k = `${l},${c}`;
    const x = this.conteudos.get(k);
    if (!x) return "NUMBER_RAW";
    if ("valor" in x) return x.tipo;
    if (!this.tipos.has(k)) { this.tipos.set(k, "NUMBER_RAW"); this.tipos.set(k, this.tipoDe(x.formula)); }
    return this.tipos.get(k)!;
  }

  private tipoDe(no: No): Tipo {
    switch (no.t) {
      case "ref": { const t = this.tipo(no.l, no.c); return t.startsWith("NUMBER") ? t : "NUMBER_RAW"; }
      case "pct": return "NUMBER_PERCENT";
      case "fn":
        if (DATAS.has(no.nome)) return "NUMBER_DATE";
        if (no.nome === "AGORA") return "NUMBER_DATETIME";
        if (["SE", "SEERRO", "MÍNIMO", "MÁXIMO", "SOMA", "ARRED"].includes(no.nome) && no.args.length) {
          const ts = no.args.map((a) => this.tipoDe(a)).filter((t) => t !== "NUMBER_RAW");
          return ts.length && ts.every((t) => t === ts[0]) && ts[0] !== "NUMBER_PERCENT" ? ts[0] : "NUMBER_RAW";
        }
        return "NUMBER_RAW";
      case "int": { const t = this.tipo(no.a.l, no.a.c); return t.startsWith("NUMBER") ? t : "NUMBER_RAW"; }
      case "bin": {
        const a = this.tipoDe(no.a), b = this.tipoDe(no.b);
        if (no.op === "-" && a === "NUMBER_DATE" && b === "NUMBER_DATE") return "NUMBER_RAW";
        if ((no.op === "+" || no.op === "-") && (a === "NUMBER_DATE" || b === "NUMBER_DATE")) return "NUMBER_DATE";
        if ((no.op === "+" || no.op === "-") && a === b) return a;
        if ((no.op === "*" || no.op === "/") && a === "NUMBER_CURRENCY" && b !== "NUMBER_CURRENCY") return "NUMBER_CURRENCY";
        if (no.op === "*" && b === "NUMBER_CURRENCY" && a !== "NUMBER_CURRENCY") return "NUMBER_CURRENCY";
        return "NUMBER_RAW";
      }
      default: return "NUMBER_RAW";
    }
  }
}
