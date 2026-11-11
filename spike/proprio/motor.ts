// Motor próprio (protótipo): avaliação, dependências, derramamento e funções em pt-BR.
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
  const t = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return t !== "" && !Number.isNaN(n) ? n : E("#VALOR!");
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
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(s)!;
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

type Ctx = { ler: (l: number, c: number) => V; hoje: () => number };

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

export function avaliar(no: No, ctx: Ctx): R {
  switch (no.t) {
    case "num": return no.v;
    case "txt": return no.v;
    case "bool": return no.v;
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
  let acc: R = vals[0];
  // aplica sobre a primeira matriz, com os demais como escalares/expandidos
  const m = vals.find(ehM) as M;
  return m.map((linha, l) => linha.map((_, c) => {
    const vs = vals.map((v) => (ehM(v) ? v[v.length === 1 ? 0 : l][v[0].length === 1 ? 0 : c] : v));
    const e = vs.find(ehErro); return e ?? f(...vs, null, null, null, null);
  })) as R ?? acc;
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
  PGTO: (args, ctx) => { const i = numArg(args[0], ctx), n = numArg(args[1], ctx), vp = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0; if (i === 0) return -(vp + vf) / n; const f = (1 + i) ** n; return (-(vp * f + vf) * i) / ((1 + i * t) * (f - 1)); },
};

/** Uma planilha: entradas brutas, cálculo sob demanda, ciclos e derramamento. */
export class PlanilhaPropria {
  private entradas = new Map<string, V | No>();
  private cache = new Map<string, V>();
  private derramado = new Map<string, V>();
  private pilha = new Set<string>();
  constructor(private hoje = () => Math.floor((Date.now() - BASE) / 86400000)) {}
  definir(l: number, c: number, valor: V | { formula: string }) {
    const k = `${l},${c}`;
    if (valor && typeof valor === "object" && "formula" in valor) {
      try { this.entradas.set(k, analisar(valor.formula)); } catch { this.entradas.set(k, E("#NOME?")); }
    } else this.entradas.set(k, valor);
    this.cache.clear(); this.derramado.clear();
  }
  private ehFormula = (x: V | No | undefined): x is No => !!x && typeof x === "object" && "t" in x;
  private calcular(k: string): V {
    if (this.cache.has(k)) return this.cache.get(k)!;
    const no = this.entradas.get(k) as No;
    if (this.pilha.has(k)) return E("#CIRC!");
    this.pilha.add(k);
    const [l, c] = k.split(",").map(Number);
    const r = avaliar(no, { ler: (a, b) => this.ler(a, b), hoje: this.hoje });
    this.pilha.delete(k);
    let v: V;
    if (Array.isArray(r)) {
      const bloqueado = r.some((linha, i) => linha.some((_, j) => (i || j) && (this.entradas.has(`${l + i},${c + j}`) || this.derramado.has(`${l + i},${c + j}`))));
      if (bloqueado) v = E("#DESPEJAR!");
      else { r.forEach((linha, i) => linha.forEach((x, j) => { if (i || j) this.derramado.set(`${l + i},${c + j}`, x ?? null); })); v = r[0][0] ?? null; }
    } else v = r;
    this.cache.set(k, v);
    return v;
  }
  ler(l: number, c: number): V {
    const k = `${l},${c}`;
    const e = this.entradas.get(k);
    if (this.ehFormula(e)) return this.calcular(k);
    if (e !== undefined) return e as V;
    if (!this.derramado.has(k)) for (const [kk, x] of this.entradas) if (this.ehFormula(x) && !this.cache.has(kk) && !this.pilha.has(kk)) this.calcular(kk);
    return this.derramado.get(k) ?? null;
  }
}
