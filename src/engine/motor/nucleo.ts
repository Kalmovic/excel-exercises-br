/**
 * Motor de fórmulas próprio: avaliação, dependências, referências circulares,
 * resultados que derramam (FILTRO, ÚNICO…) e as funções do catálogo, em pt-BR.
 * Sem dependências externas.
 *
 * Limites de trabalho (para nenhuma fórmula travar a página ou o servidor):
 * matriz com mais de `LIMITE_CELULAS` células dá #NÚM!; texto com mais de
 * `LIMITE_TEXTO` caracteres dá #VALOR!, como o Excel.
 */
import { analisar, ULTIMA_COLUNA, ULTIMA_LINHA, type No } from "./parser";
import { casaCuringa, localizarCuringa, temCuringa } from "./curinga";
import { formatarComCodigo } from "./texto";

export type Erro = { erro: string };
export type V = number | string | boolean | null | Erro;
type M = V[][];
type R = V | M;
const ehM = (x: R): x is M => Array.isArray(x);
const ehErro = (v: unknown): v is Erro => typeof v === "object" && v !== null && "erro" in (v as object);
const E = (e: string): Erro => ({ erro: e });

/** Maior matriz que uma fórmula pode produzir (acima disso, #NÚM!). */
export const LIMITE_CELULAS = 10_000;
/** Maior texto numa célula, como no Excel (acima disso, #VALOR!). */
export const LIMITE_TEXTO = 32_767;
const grande = (linhas: number, colunas: number) => linhas * colunas > LIMITE_CELULAS;

// --- datas no sistema do Excel (1900, com o 29/02/1900 que não existiu) ---
const BASE = Date.UTC(1899, 11, 30);
export const serial = (a: number, m: number, d: number) => Math.round((Date.UTC(a, m - 1, d) - BASE) / 86400000);
const partes = (s: number) => { const d = new Date(BASE + Math.floor(s) * 86400000); return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), sem: d.getUTCDay() }; };
const fimDoMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

// --- coerções ---
/** Valor numa conta: vazio é 0, lógico é 0/1, texto só se parecer número ("" dá #VALOR!, como no Excel). */
function num(v: V): number | Erro {
  if (ehErro(v)) return v;
  if (v === null) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  return textoParaNumero(v) ?? E("#VALOR!");
}

/** Texto que o Excel aceita numa conta: "1.234,5", "5%", "R$ 10", "02/12/2026", "10:30", "1e3", "(5)". */
function textoParaNumero(s: string): number | null {
  const t = s.trim();
  const n = (x: string) => Number(x.replace(/\./g, "").replace(",", "."));
  let m: RegExpExecArray | null;
  if ((m = /^\((.*)\)$/.exec(t))) { const x = textoParaNumero(m[1]); return x === null || /^[-(]/.test(m[1].trim()) ? null : -x; }
  if ((m = /^(-?)R\$\s*([\d.]+(?:,\d+)?)$/.exec(t))) return (m[1] ? -1 : 1) * n(m[2]);
  if ((m = /^(-?[\d.]+(?:,\d+)?)\s*%$/.exec(t))) return n(m[1]) / 100;
  if (/^[-+]?[\d.]+(?:,\d+)?$/.test(t) && /\d/.test(t)) return n(t);
  if ((m = /^([-+]?\d+(?:,\d+)?)[eE]([-+]?\d+)$/.exec(t))) return Number(m[1].replace(",", ".") + "e" + m[2]);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return serial(Number(m[3]), Number(m[2]), Number(m[1]));
  if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t)) && Number(m[2]) < 60 && Number(m[3] ?? 0) < 60)
    return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0)) / 86400;
  return null;
}

/** Número em texto como o Excel: até 15 algarismos significativos, vírgula decimal. */
function numeroTexto(v: number): string {
  if (v === 0) return "0";
  const x = Number(v.toPrecision(15));
  let s = Math.abs(x) >= 1e15 ? x.toExponential() : String(x);
  const e = /^(.*)e([-+])(\d+)$/.exec(s);
  if (e) s = `${e[1]}E${e[2]}${e[3].padStart(2, "0")}`;
  return s.replace(".", ",");
}
const txt = (v: V): string | Erro =>
  ehErro(v) ? v : v === null ? "" : typeof v === "boolean" ? (v ? "VERDADEIRO" : "FALSO") : typeof v === "number" ? numeroTexto(v) : v;
/** Valor lógico: número ≠ 0, os textos "VERDADEIRO"/"FALSO"; outro texto dá #VALOR!. */
const bool = (v: V): boolean | Erro => {
  if (ehErro(v) || typeof v === "boolean") return v;
  if (typeof v === "string") { const u = v.toUpperCase(); return u === "VERDADEIRO" ? true : u === "FALSO" ? false : E("#VALOR!"); }
  return (v ?? 0) !== 0;
};
/** Texto longo demais para uma célula vira #VALOR!. */
const limitarTexto = (s: string): string | Erro => (s.length > LIMITE_TEXTO ? E("#VALOR!") : s);

/** Ordem dos textos do Excel em português: sem diferenciar maiúsculas, acento junto da letra. */
const COLACAO = new Intl.Collator("pt-BR", { sensitivity: "accent" });

/** Ordem do Excel: número < texto < lógico; texto sem diferenciar maiúsculas. */
function comparar(a: V, b: V): number {
  const rank = (v: V) => (typeof v === "number" || v === null ? 0 : typeof v === "string" ? 1 : 2);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return ((a as number) ?? 0) - ((b as number) ?? 0);
  if (ra === 1) return COLACAO.compare(a as string, b as string);
  return Number(a) - Number(b);
}

// --- critérios de CONT.SE, SOMASE… ---
const ERROS = new Set(["#N/D", "#DIV/0!", "#VALOR!", "#REF!", "#NOME?", "#NÚM!", "#NULO!", "#CALC!", "#DESPEJAR!"]);
function criterio(c: V): (v: V) => boolean {
  if (ehErro(c)) return (v) => ehErro(v) && v.erro === c.erro;
  if (typeof c === "number") return (v) => v === c || (typeof v === "string" && textoParaNumero(v) === c);
  if (typeof c === "boolean") return (v) => v === c;
  const s = txt(c) as string;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s)!;
  const op = m[1] ?? "=";
  const alvo = m[2];
  const compara = (r: number) => (op === "=" ? r === 0 : op === "<>" ? r !== 0 : op === "<" ? r < 0 : op === ">" ? r > 0 : op === "<=" ? r <= 0 : r >= 0);
  const n = /^-?\d+(?:[.,]\d+)?$/.test(alvo.trim()) ? Number(alvo.trim().replace(",", ".")) : alvo.trim() === "" ? null : textoParaNumero(alvo);
  if (n !== null) return (v) => (typeof v === "number" ? compara(v - n) : op === "<>");
  const u = alvo.toUpperCase();
  if (u === "VERDADEIRO" || u === "FALSO") { const b = u === "VERDADEIRO"; return (v) => (typeof v === "boolean" ? compara(Number(v) - Number(b)) : op === "<>"); }
  if (ERROS.has(u)) return (v) => (op === "=" ? ehErro(v) && v.erro === u : op === "<>" ? !(ehErro(v) && v.erro === u) : false);
  if (op === "=" || op === "<>") {
    const curinga = temCuringa(alvo);
    const casa = (v: V) => (alvo === "" ? v === null || v === "" : typeof v === "string" && (curinga ? casaCuringa(alvo, v) : v.toUpperCase() === u));
    return op === "=" ? casa : (v) => !casa(v);
  }
  return (v) => typeof v === "string" && compara(comparar(v, alvo));
}

const achatar = (x: R): V[] => (ehM(x) ? x.flat() : [x]);
const comoM = (x: R): M => (ehM(x) ? x : [[x]]);
const transpor = (m: M): M => (m.length ? m[0].map((_, j) => m.map((l) => l[j])) : m);

/** Aplica uma operação item a item, com expansão de linha/coluna/escalar (aritmética de matrizes). */
function elemento(a: R, b: R, f: (x: V, y: V) => V): R {
  if (!ehM(a) && !ehM(b)) return f(a, b);
  const A = comoM(a), B = comoM(b);
  const linhas = Math.max(A.length, B.length), cols = Math.max(A[0].length, B[0].length);
  if (grande(linhas, cols)) return E("#NÚM!");
  const at = (X: M, l: number, c: number): V => X[X.length === 1 ? 0 : l]?.[X[0].length === 1 ? 0 : c] ?? E("#N/D");
  return Array.from({ length: linhas }, (_, l) => Array.from({ length: cols }, (_, c) => f(at(A, l, c), at(B, l, c))));
}
const mapa = (a: R, f: (x: V) => V): R => (ehM(a) ? a.map((l) => l.map(f)) : f(a));

type Ctx = {
  /** `aba` ausente: a aba da própria fórmula. Aba que não existe: #REF!. */
  ler: (l: number, c: number, aba?: string) => V;
  hoje: () => number;
  agora: () => number;
  /** Linha escondida pelo filtro (SUBTOTAL a ignora). */
  oculta?: (l: number, aba?: string) => boolean;
  /** Célula com fórmula de SUBTOTAL (SUBTOTAL ignora, para não somar duas vezes). */
  ehSubtotal?: (l: number, c: number, aba?: string) => boolean;
  /** Tamanho da aba: até onde vão a coluna inteira (A:A) e a linha inteira (1:1). */
  limites?: (aba?: string) => { linhas: number; colunas: number };
  /** Valores dos nomes declarados por LET. */
  nomes?: Map<string, R>;
  /** Nomes do LET ligados a uma referência (A1:A3), para as funções que pedem referência. */
  refs?: Map<string, No>;
  /** Nomes das abas de `ini` até `fim`, na ordem das abas (null: alguma não existe). Para a referência 3D. */
  abasEntre?: (ini: string, fim: string) => string[] | null;
  /** Argumento direto de uma função que aceita referência 3D (SOMA, MÉDIA…). Fora delas, 3D dá #VALOR!. */
  em3d?: boolean;
  /** Tamanho do resultado que a fórmula da célula derramou (para `D2#`); null se ela não derrama. */
  derrame?: (l: number, c: number, aba?: string) => { linhas: number; colunas: number } | null;
};

/** Funções que aceitam referência 3D (Jan:Mar!B2), como no Excel. */
const ACEITAM_3D = new Set(["SOMA", "MÉDIA", "MÍNIMO", "MÁXIMO", "CONT.NÚM", "CONT.VALORES"]);

/** Potência como o Excel: 0^0 e base negativa com expoente fracionado dão #NÚM!. */
function potencia(a: number, b: number): V {
  if (a === 0 && b === 0) return E("#NÚM!");
  if (a === 0 && b < 0) return E("#DIV/0!");
  const r = a ** b;
  return Number.isFinite(r) ? r : E("#NÚM!");
}

function binop(op: string, x: V, y: V): V {
  if (ehErro(x)) return x;
  if (ehErro(y)) return y;
  if (op === "&") { const a = txt(x), b = txt(y); return ehErro(a) ? a : ehErro(b) ? b : limitarTexto(a + b); }
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
    case "^": return potencia(a, b);
  }
  return E("#VALOR!");
}

/** Número que não é finito vira erro; texto longo demais e matriz grande demais também, como no Excel. */
const finito = (r: R): R => {
  if (ehM(r) && grande(r.length, r[0]?.length ?? 0)) return E("#NÚM!");
  return mapa(r, (v) => (typeof v === "number" && !Number.isFinite(v) ? E(Number.isNaN(v) ? "#VALOR!" : "#NÚM!") : v === undefined ? null : typeof v === "string" ? limitarTexto(v) : v));
};

/** Nome do LET ligado a uma referência: devolve o nó da referência. */
function resolver(no: No | undefined, ctx: Ctx): No | undefined {
  let n = no;
  for (let k = 0; n && n.t === "nome" && ctx.refs?.has(n.v) && k < 100; k++) n = ctx.refs.get(n.v);
  // INDIRETO("Fev!B2") é a referência que o texto descreve (SOMASE, DESLOC… a recebem como referência).
  if (n && n.t === "fn" && n.nome === "INDIRETO") { const r = refIndireta(n.args, ctx); if (!ehErro(r)) return r; }
  // D2#: as funções que pedem referência recebem o intervalo que a fórmula de D2 derramou.
  if (n && n.t === "derrame") { const i = intervaloDerramado(n, ctx); if (i) return i; }
  return n;
}
/**
 * A referência descrita pelo texto de INDIRETO ("B2", "Fev!B2:B6", "'Jan 2026'!B2").
 * Só o estilo A1; o texto que não é uma referência (ou é 3D) dá #REF!, como no Excel.
 */
function refIndireta(args: (No | undefined)[], ctx: Ctx): No | Erro {
  const v = esc(args[0], ctx);
  if (ehErro(v)) return v;
  const a1 = esc(args[1], ctx, true);
  if (ehErro(a1)) return a1;
  if (bool(a1) === false || typeof v !== "string" || v.trim() === "") return E("#REF!");
  try {
    const r = analisar("=" + v.trim());
    return r.t === "ref" || r.t === "int" ? r : E("#REF!");
  } catch {
    return E("#REF!");
  }
}
/** O intervalo que `D2#` descreve, ou null se D2 não tem uma fórmula que derrama (#REF!, como no Excel). */
function intervaloDerramado(no: Extract<No, { t: "derrame" }>, ctx: Ctx): Extract<No, { t: "int" }> | null {
  const t = ctx.derrame?.(no.l, no.c, no.aba);
  if (!t) return null;
  return { t: "int", a: { l: no.l, c: no.c }, b: { l: no.l + t.linhas - 1, c: no.c + t.colunas - 1 }, ...(no.aba === undefined ? {} : { aba: no.aba }) };
}
/** O argumento chega como referência (célula, intervalo, DESLOC, ÍNDICE), e não como valor digitado? */
function ehReferencia(no: No | undefined, ctx: Ctx): boolean {
  const n = resolver(no, ctx);
  return !!n && (n.t === "ref" || n.t === "int" || n.t === "ref3d" || n.t === "derrame" || (n.t === "fn" && (n.nome === "DESLOC" || n.nome === "ÍNDICE" || n.nome === "INDIRETO")));
}
/** Cantos de um intervalo, com a coluna/linha inteira (ou um intervalo enorme) cortada no tamanho da aba. */
function faixa(no: Extract<No, { t: "int" }>, ctx: Ctx) {
  const { a } = no;
  let { b } = no;
  const inteira = b.l >= ULTIMA_LINHA || b.c >= ULTIMA_COLUNA;
  if (inteira || grande(b.l - a.l + 1, b.c - a.c + 1)) {
    const lim = ctx.limites?.(no.aba) ?? { linhas: 50, colunas: 26 };
    b = { l: Math.min(b.l, Math.max(a.l, lim.linhas - 1)), c: Math.min(b.c, Math.max(a.c, lim.colunas - 1)) };
  }
  return { a, b };
}
/** Lê um bloco de células a partir de (l, c). */
const bloco = (ctx: Ctx, l: number, c: number, h: number, w: number, aba?: string): R =>
  grande(h, w) ? E("#NÚM!") : Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => ctx.ler(l + i, c + j, aba)));

/** Contas e funções dentro de SOMA(…) não recebem mais a referência 3D. */
const sem3d = (ctx: Ctx): Ctx => (ctx.em3d ? { ...ctx, em3d: false } : ctx);

export function avaliar(no: No, ctx: Ctx): R {
  return finito(avaliar0(no, ctx));
}

function avaliar0(no: No, ctx: Ctx): R {
  switch (no.t) {
    case "num": return no.v;
    case "txt": return no.v;
    case "bool": return no.v;
    case "erro": return E(no.v);
    case "vazio": return null;
    case "matriz": return no.v.map((l) => l.map((x) => { const r = avaliar(x, ctx); return ehM(r) ? r[0][0] : r; }));
    case "nome": return ctx.nomes?.get(no.v) ?? E("#NOME?");
    case "ref": return ctx.ler(no.l, no.c, no.aba);
    case "derrame": { const i = intervaloDerramado(no, ctx); return i ? avaliar(i, ctx) : E("#REF!"); }
    case "int": { const { a, b } = faixa(no, ctx); return bloco(ctx, a.l, a.c, b.l - a.l + 1, b.c - a.c + 1, no.aba); }
    case "ref3d": {
      // Os valores de cada aba numa coluna só: SOMA, MÉDIA… só olham os valores.
      if (!ctx.em3d) return E("#VALOR!");
      const nomes = ctx.abasEntre?.(no.ini, no.fim);
      if (!nomes) return E("#REF!");
      const linhas: M = [];
      for (const aba of nomes) {
        const { a, b } = faixa({ t: "int", a: no.a, b: no.b, aba }, ctx);
        const m = bloco(ctx, a.l, a.c, b.l - a.l + 1, b.c - a.c + 1, aba);
        if (!ehM(m)) return m;
        for (const v of m.flat()) linhas.push([v]);
        if (grande(linhas.length, 1)) return E("#NÚM!");
      }
      return linhas;
    }
    case "un": return mapa(avaliar(no.x, sem3d(ctx)), (v) => { const n = num(v); return ehErro(n) ? n : -n; });
    case "pct": return mapa(avaliar(no.x, sem3d(ctx)), (v) => { const n = num(v); return ehErro(n) ? n : n / 100; });
    case "bin": { const c = sem3d(ctx); return elemento(avaliar(no.a, c), avaliar(no.b, c), (x, y) => binop(no.op, x, y)); }
    case "fn": {
      const f = FUNCOES[no.nome];
      if (!f) return E("#NOME?");
      // Argumento omitido chega como ausente (undefined): cada função usa o seu padrão.
      const args = no.args.map((a) => (a.t === "vazio" ? undefined : a)) as No[];
      const aceita3d = ACEITAM_3D.has(no.nome);
      // Referência 3D só entra nas funções que a aceitam (SOMASE(Jan:Mar!B2:B5;…) dá #VALOR!, como no Excel).
      if (!aceita3d && no.args.some((a) => a.t === "ref3d")) return E("#VALOR!");
      const c = aceita3d ? (ctx.em3d ? ctx : { ...ctx, em3d: true }) : sem3d(ctx);
      try { return f(args, c); } catch (e) { return ehErro(e) ? e : E("#VALOR!"); }
    }
  }
}

// --- funções ---
type F = (args: No[], ctx: Ctx) => R;
const ev = (n: No | undefined, ctx: Ctx): R => (n ? avaliar(n, ctx) : null);
const esc = (n: No | undefined, ctx: Ctx, padrao: V = null): V => { if (!n) return padrao; const r = ev(n, ctx); return ehM(r) ? r[0][0] : r; };
const numArg = (n: No | undefined, ctx: Ctx, padrao = 0): number => { const v = esc(n, ctx, padrao); const x = num(v); if (ehErro(x)) throw x; return x; };
/** Índice, quantidade, casas: o Excel trunca a parte fracionária. */
const intArg = (n: No | undefined, ctx: Ctx, padrao = 0): number => Math.trunc(numArg(n, ctx, padrao));

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
/**
 * Números de SOMA, MÉDIA, MÍNIMO…: o que vem de referência ou matriz conta só
 * se for número (texto, lógico e vazio são ignorados); o que foi digitado como
 * argumento é convertido (VERDADEIRO = 1, "3" = 3, "abc" = #VALOR!).
 */
const numericos = (args: No[], ctx: Ctx) => {
  const out: number[] = [];
  for (const a of args) {
    const r = ev(a, ctx);
    if (ehM(r) || ehReferencia(a, ctx)) { for (const v of achatar(r)) { if (ehErro(v)) throw v; if (typeof v === "number") out.push(v); } }
    else { const n = num(r); if (ehErro(n)) throw n; out.push(n); }
  }
  return out;
};
const agregado = (f: (ns: number[]) => V): F => (args, ctx) => { try { return f(numericos(args, ctx)); } catch (e) { return ehErro(e) ? e : E("#VALOR!"); } };
/** Valores lógicos de E/OU: texto e vazio de referência ou matriz são ignorados; todos os erros aparecem. */
const logicos = (args: No[], ctx: Ctx): boolean[] | Erro => {
  const out: boolean[] = [];
  let erro: Erro | null = null;
  for (const a of args) {
    const r = ev(a, ctx);
    const deRef = ehM(r) || ehReferencia(a, ctx);
    for (const v of achatar(r)) {
      if (deRef && (v === null || typeof v === "string")) continue;
      // Texto digitado direto no E/OU dá #VALOR! (o SE aceita "VERDADEIRO", o E não).
      const b = typeof v === "string" ? E("#VALOR!") : bool(v);
      if (ehErro(b)) erro ??= b;
      else out.push(b);
    }
  }
  if (erro) return erro;
  return out.length ? out : E("#VALOR!");
};
const arred = (x: number, n: number, modo: "perto" | "cima" | "baixo") => {
  const k = 10 ** n, y = Math.abs(x) * k, s = Math.sign(x);
  const r = modo === "perto" ? Math.round(y + 1e-9) : modo === "cima" ? Math.ceil(y - 1e-9) : Math.floor(y + 1e-9);
  return (s * r) / k;
};
/** Pares (intervalo; critério) de CONT.SES, SOMASES…: todos do mesmo tamanho, senão #VALOR!. */
const pares = (args: No[], ctx: Ctx, inicio: number, forma?: [number, number]): ((idx: number) => boolean) | Erro => {
  const conds: { faixa: V[]; ok: (v: V) => boolean }[] = [];
  for (let i = inicio; i < args.length; i += 2) {
    const m = comoM(ev(args[i], ctx));
    if (forma && (m.length !== forma[0] || m[0].length !== forma[1])) return E("#VALOR!");
    forma ??= [m.length, m[0].length];
    conds.push({ faixa: m.flat(), ok: criterio(esc(args[i + 1], ctx)) });
  }
  return (idx: number) => conds.every((c) => c.ok(c.faixa[idx] ?? null));
};
/** Intervalo de soma/média de SOMASE/MÉDIASE: se for referência, vale o canto e o tamanho do intervalo dos critérios (como o Excel). */
const faixaDeSoma = (n: No | undefined, ctx: Ctx, forma: M): V[] => {
  const r = resolver(n, ctx);
  if (!r) return forma.flat();
  if (r.t === "ref" || r.t === "int") {
    const a = r.t === "ref" ? r : r.a;
    return achatar(bloco(ctx, a.l, a.c, forma.length, forma[0].length, r.aba));
  }
  return achatar(ev(r, ctx));
};
const forma = (m: M): [number, number] => [m.length, m[0].length];
const exato = (a: V, b: V) => (typeof a === "string" && typeof b === "string" ? a.toUpperCase() === b.toUpperCase() : a === b);
/** Busca exata (com curingas quando a chave é texto, como PROCV/CORRESP) ou aproximada (só entre valores do mesmo tipo). */
function busca(chave: V, lista: V[], aproximada: boolean): number {
  if (!aproximada) {
    if (chave === null) return -1;
    const k = chave;
    if (typeof k === "string" && temCuringa(k)) return lista.findIndex((v) => typeof v === "string" && casaCuringa(k, v));
    return lista.findIndex((v) => exato(v, k));
  }
  const k = chave ?? 0;
  let achou = -1;
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    if (v === null || ehErro(v) || typeof v !== typeof k) continue;
    if (comparar(v, k) <= 0) achou = i; else break;
  }
  return achou;
}
/**
 * Busca do PROCX/CORRESPX. Correspondência: 0 exata, -1 exata ou próximo menor,
 * 1 exata ou próximo maior, 2 curinga. Pesquisa: 1/2 do começo, -1/-2 do fim.
 */
function procurarX(chave: V, lista: V[], modo: number, sentido: number): number | Erro {
  if (![0, -1, 1, 2].includes(modo) || ![1, -1, 2, -2].includes(sentido)) return E("#VALOR!");
  const ordem = sentido < 0 ? [...lista.keys()].reverse() : [...lista.keys()];
  if (modo === 2) {
    const p = typeof chave === "string" ? chave : null;
    const i = ordem.find((k) => (p !== null ? typeof lista[k] === "string" && casaCuringa(p, lista[k] as string) : exato(lista[k], chave)));
    return i ?? -1;
  }
  const igual = ordem.find((k) => exato(lista[k], chave));
  if (igual !== undefined) return igual;
  if (modo === 0) return -1;
  // Próximo menor (-1) ou maior (1): o mais perto entre os do mesmo tipo.
  let melhor = -1;
  for (const k of ordem) {
    if (lista[k] === null || typeof lista[k] !== typeof chave) continue;
    const r = comparar(lista[k], chave);
    if ((modo === -1 && r < 0) || (modo === 1 && r > 0))
      if (melhor < 0 || (modo === -1 ? comparar(lista[k], lista[melhor]) > 0 : comparar(lista[k], lista[melhor]) < 0)) melhor = k;
  }
  return melhor;
}
const diasUteis = (a: number, b: number, fer: Set<number>) => { let n = 0; const [i, f] = a <= b ? [a, b] : [b, a]; for (let d = i; d <= f; d++) { const s = partes(d).sem; if (s !== 0 && s !== 6 && !fer.has(d)) n++; } return a <= b ? n : -n; };
const feriados = (n: No | undefined, ctx: Ctx) => new Set(n ? achatar(ev(n, ctx)).filter((v): v is number => typeof v === "number") : []);
const somaMeses = (s: number, n: number, fim: boolean) => { const p = partes(s); const t = p.m - 1 + n; const a = p.a + Math.floor(t / 12), m = (((t % 12) + 12) % 12) + 1; return serial(a, m, fim ? fimDoMes(a, m) : Math.min(p.d, fimDoMes(a, m))); };

const soNumeros = (vs: V[]) => vs.filter((v): v is number => typeof v === "number");
const media = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!"));
const variancia = (ns: number[], amostra: boolean): V => {
  if (ns.length < (amostra ? 2 : 1)) return E("#DIV/0!");
  const m = ns.reduce((a, b) => a + b, 0) / ns.length;
  return ns.reduce((s, x) => s + (x - m) ** 2, 0) / (ns.length - (amostra ? 1 : 0));
};
/** PERCENTIL.INC / PERCENTIL.EXC sobre números já em ordem crescente. */
function percentil(ns: number[], k: number, exclusivo: boolean): V {
  const n = ns.length;
  if (!n) return E("#NÚM!");
  if (exclusivo) {
    const pos = k * (n + 1);
    if (k <= 0 || k >= 1 || pos < 1 || pos > n) return E("#NÚM!");
    const i = Math.floor(pos);
    return i >= n ? ns[n - 1] : ns[i - 1] + (pos - i) * (ns[i] - ns[i - 1]);
  }
  if (k < 0 || k > 1) return E("#NÚM!");
  const pos = k * (n - 1), i = Math.floor(pos);
  return i + 1 >= n ? ns[n - 1] : ns[i] + (pos - i) * (ns[i + 1] - ns[i]);
}
/** As 11 funções do SUBTOTAL, pelo número. */
const SUBTOTAIS: Record<number, (vs: V[]) => V> = {
  1: (vs) => media(soNumeros(vs)),
  2: (vs) => soNumeros(vs).length,
  3: (vs) => vs.filter((v) => v !== null && v !== "").length,
  4: (vs) => { const ns = soNumeros(vs); return ns.length ? Math.max(...ns) : 0; },
  5: (vs) => { const ns = soNumeros(vs); return ns.length ? Math.min(...ns) : 0; },
  6: (vs) => soNumeros(vs).reduce((a, b) => a * b, 1),
  7: (vs) => { const v = variancia(soNumeros(vs), true); return typeof v === "number" ? Math.sqrt(v) : v; },
  8: (vs) => { const v = variancia(soNumeros(vs), false); return typeof v === "number" ? Math.sqrt(v) : v; },
  9: (vs) => soNumeros(vs).reduce((a, b) => a + b, 0),
  10: (vs) => variancia(soNumeros(vs), true),
  11: (vs) => variancia(soNumeros(vs), false),
};
/** Células de uma referência (ou nome do LET ligado a ela), pulando linhas ocultas e SUBTOTAL aninhado quando pedido. */
function celulasDaRef(no: No | undefined, ctx: Ctx, pularOcultas: boolean, pularSubtotal: boolean): V[] | null {
  const a = resolver(no, ctx);
  if (!a || (a.t !== "ref" && a.t !== "int")) return null;
  const { a: ini, b: fim } = a.t === "int" ? faixa(a, ctx) : { a, b: a };
  if (grande(fim.l - ini.l + 1, fim.c - ini.c + 1)) throw E("#NÚM!");
  const vals: V[] = [];
  for (let l = ini.l; l <= fim.l; l++) {
    if (pularOcultas && ctx.oculta?.(l, a.aba)) continue;
    for (let c = ini.c; c <= fim.c; c++) if (!(pularSubtotal && ctx.ehSubtotal?.(l, c, a.aba))) vals.push(ctx.ler(l, c, a.aba));
  }
  return vals;
}
const textoArg = (v: V): string => { const t = txt(v); if (ehErro(t)) throw t; return t; };

export const FUNCOES: Record<string, F> = {
  SOMA: agregado((ns) => ns.reduce((a, b) => a + b, 0)),
  "MÉDIA": agregado((ns) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!"))),
  "MÍNIMO": agregado((ns) => (ns.length ? Math.min(...ns) : 0)),
  "MÁXIMO": agregado((ns) => (ns.length ? Math.max(...ns) : 0)),
  /** Conta números; digitados como argumento, também lógicos e textos numéricos. */
  "CONT.NÚM": (args, ctx) => {
    let n = 0;
    for (const a of args) {
      if (!a) continue;
      const r = ev(a, ctx);
      if (ehM(r) || ehReferencia(a, ctx)) n += achatar(r).filter((v) => typeof v === "number").length;
      else if (typeof r === "number" || typeof r === "boolean" || (typeof r === "string" && textoParaNumero(r) !== null)) n++;
    }
    return n;
  },
  /** Conta o que não é vazio (inclusive o "" de uma fórmula ou digitado). */
  "CONT.VALORES": (args, ctx) => args.flatMap((a) => (a ? achatar(ev(a, ctx)) : [])).filter((v) => v !== null).length,
  "CONTAR.VAZIO": (args, ctx) => achatar(ev(args[0], ctx)).filter((v) => v === null || v === "").length,
  ARRED: lift((x, n) => { const a = num(x), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : arred(a, Math.trunc(b), "perto"); }),
  "ARREDONDAR.PARA.CIMA": lift((x, n) => { const a = num(x), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : arred(a, Math.trunc(b), "cima"); }),
  "ARREDONDAR.PARA.BAIXO": lift((x, n) => { const a = num(x), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : arred(a, Math.trunc(b), "baixo"); }),
  INT: lift((x) => { const a = num(x); return ehErro(a) ? a : Math.floor(a); }),
  ABS: lift((x) => { const a = num(x); return ehErro(a) ? a : Math.abs(a); }),
  MAIOR: (args, ctx) => { const vs = achatar(ev(args[0], ctx)); const e = vs.find(ehErro); if (e) return e; const ns = soNumeros(vs).sort((a, b) => b - a); const k = numArg(args[1], ctx); return ns[k - 1] ?? E("#NÚM!"); },
  MENOR: (args, ctx) => { const vs = achatar(ev(args[0], ctx)); const e = vs.find(ehErro); if (e) return e; const ns = soNumeros(vs).sort((a, b) => a - b); const k = numArg(args[1], ctx); return ns[k - 1] ?? E("#NÚM!"); },
  SE: (args, ctx) => {
    const t = ev(args[0], ctx);
    // SE(c;;1): o valor omitido é vazio (0 na célula); SE(c;1) sem o terceiro é FALSO.
    const escolhe = (v: V): R => { const b = bool(v); if (ehErro(b)) return b; return b ? (args.length > 1 ? ev(args[1], ctx) : true) : args.length > 2 ? ev(args[2], ctx) : false; };
    if (!ehM(t)) return escolhe(t);
    return t.map((l) => l.map((v) => { const r = escolhe(v); return ehM(r) ? r[0][0] : r; }));
  },
  SES: (args, ctx) => { for (let i = 0; i < args.length; i += 2) { const b = bool(esc(args[i], ctx)); if (ehErro(b)) return b; if (b) return ev(args[i + 1], ctx); } return E("#N/D"); },
  E: (args, ctx) => { const bs = logicos(args, ctx); return ehErro(bs) ? bs : bs.every(Boolean); },
  OU: (args, ctx) => { const bs = logicos(args, ctx); return ehErro(bs) ? bs : bs.some(Boolean); },
  "NÃO": lift((v) => { const b = bool(v); return ehErro(b) ? b : !b; }),
  SEERRO: (args, ctx) => { const r = ev(args[0], ctx); return ehM(r) ? r.map((l) => l.map((v) => (ehErro(v) ? esc(args[1], ctx) : v))) : ehErro(r) ? ev(args[1], ctx) : r; },
  "SENÃODISP": (args, ctx) => { const r = ev(args[0], ctx); return ehErro(r) && r.erro === "#N/D" ? ev(args[1], ctx) : r; },
  "CONT.SE": (args, ctx) => { const ok = criterio(esc(args[1], ctx)); return achatar(ev(args[0], ctx)).filter(ok).length; },
  "CONT.SES": (args, ctx) => { const n = achatar(ev(args[0], ctx)).length; const ok = pares(args, ctx, 0); if (ehErro(ok)) return ok; let k = 0; for (let i = 0; i < n; i++) if (ok(i)) k++; return k; },
  SOMASE: (args, ctx) => {
    const fm = comoM(ev(args[0], ctx)); const faixaV = fm.flat(); const soma = faixaDeSoma(args[2], ctx, fm); const ok = criterio(esc(args[1], ctx));
    let s = 0;
    for (let i = 0; i < faixaV.length; i++) { if (!ok(faixaV[i])) continue; const v = soma[i]; if (ehErro(v)) return v; if (typeof v === "number") s += v; }
    return s;
  },
  SOMASES: (args, ctx) => {
    const m = comoM(ev(args[0], ctx)); const ok = pares(args, ctx, 1, forma(m)); if (ehErro(ok)) return ok;
    let s = 0;
    for (const [i, v] of m.flat().entries()) { if (!ok(i)) continue; if (ehErro(v)) return v; if (typeof v === "number") s += v; }
    return s;
  },
  "MÉDIASE": (args, ctx) => {
    const fm = comoM(ev(args[0], ctx)); const faixaV = fm.flat(); const val = faixaDeSoma(args[2], ctx, fm); const ok = criterio(esc(args[1], ctx));
    const ns: number[] = [];
    for (let i = 0; i < faixaV.length; i++) { if (!ok(faixaV[i])) continue; const v = val[i]; if (ehErro(v)) return v; if (typeof v === "number") ns.push(v); }
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : E("#DIV/0!");
  },
  "MÁXIMOSES": (args, ctx) => { const m = comoM(ev(args[0], ctx)); const ok = pares(args, ctx, 1, forma(m)); if (ehErro(ok)) return ok; const val = m.flat(); const e = val.find((v, i) => ok(i) && ehErro(v)); if (e) return e; const ns = val.filter((v, i): v is number => ok(i) && typeof v === "number"); return ns.length ? Math.max(...ns) : 0; },
  "MÍNIMOSES": (args, ctx) => { const m = comoM(ev(args[0], ctx)); const ok = pares(args, ctx, 1, forma(m)); if (ehErro(ok)) return ok; const val = m.flat(); const e = val.find((v, i) => ok(i) && ehErro(v)); if (e) return e; const ns = val.filter((v, i): v is number => ok(i) && typeof v === "number"); return ns.length ? Math.min(...ns) : 0; },
  /** Matrizes do mesmo tamanho; o que não é número (inclusive VERDADEIRO) conta 0, como no Excel. */
  SOMARPRODUTO: (args, ctx) => {
    const ms = args.map((a) => comoM(ev(a, ctx)));
    if (!ms.length) return E("#VALOR!");
    const [h, w] = forma(ms[0]);
    if (ms.some((m) => m.length !== h || m[0].length !== w)) return E("#VALOR!");
    let s = 0;
    for (let i = 0; i < h; i++)
      for (let j = 0; j < w; j++) {
        let p = 1;
        for (const m of ms) { const v = m[i][j]; if (ehErro(v)) return v; p *= typeof v === "number" ? v : 0; }
        s += p;
      }
    return s;
  },
  /**
   * SUBTOTAL(função; ref1; ...): como o Excel, ignora as linhas escondidas pelo
   * filtro e as células que já são SUBTOTAL. 1–11 e 101–111 (no simulador, as
   * linhas só se escondem pelo filtro, então as duas famílias dão o mesmo).
   */
  SUBTOTAL: (args, ctx) => {
    const n = intArg(args[0], ctx);
    const op = SUBTOTAIS[n > 100 ? n - 100 : n];
    if (!op || args.length < 2) return E("#VALOR!");
    const vals: V[] = [];
    for (const a of args.slice(1)) {
      const vs = celulasDaRef(a, ctx, true, true);
      if (!vs) return E("#VALOR!");
      vals.push(...vs);
    }
    const erro = vals.find(ehErro);
    if (erro && n % 100 !== 2 && n % 100 !== 3) return erro;
    return op(vals);
  },
  PROCV: (args, ctx) => { const chave = esc(args[0], ctx); if (ehErro(chave)) return chave; const t = comoM(ev(args[1], ctx)); const col = intArg(args[2], ctx); const aprox = args[3] ? (bool(esc(args[3], ctx)) as boolean) : true; if (col < 1 || col > t[0].length) return E("#REF!"); const i = busca(chave, t.map((l) => l[0]), aprox); return i < 0 ? E("#N/D") : t[i][col - 1]; },
  PROCH: (args, ctx) => { const chave = esc(args[0], ctx); if (ehErro(chave)) return chave; const t = comoM(ev(args[1], ctx)); const lin = intArg(args[2], ctx); const aprox = args[3] ? (bool(esc(args[3], ctx)) as boolean) : true; if (lin < 1 || lin > t.length) return E("#REF!"); const i = busca(chave, t[0], aprox); return i < 0 ? E("#N/D") : t[lin - 1][i]; },
  /** PROCX(chave; procura; retorno; [se_não_encontrado]; [correspondência]; [pesquisa]). */
  PROCX: (args, ctx) => {
    const ch = ev(args[0], ctx); const onde = comoM(ev(args[1], ctx)); const ret = comoM(ev(args[2], ctx));
    const modo = args[4] ? intArg(args[4], ctx) : 0, sentido = args[5] ? intArg(args[5], ctx) : 1;
    const vertical = onde[0].length === 1; const lista = vertical ? onde.map((l) => l[0]) : onde[0];
    if ((vertical ? ret.length : ret[0].length) !== lista.length) return E("#VALOR!");
    const um = (chave: V): R => {
      if (ehErro(chave)) return chave;
      const i = procurarX(chave, lista, modo, sentido);
      if (ehErro(i)) return i;
      if (i < 0) return args[3] ? esc(args[3], ctx) : E("#N/D");
      return vertical ? (ret[i].length === 1 ? ret[i][0] : [ret[i]]) : ret.length === 1 ? ret[0][i] : ret.map((l) => [l[i]]);
    };
    return ehM(ch) ? ch.map((l) => l.map((v) => { const r = um(v); return ehM(r) ? r[0][0] : r; })) : um(ch);
  },
  /** ÍNDICE(matriz; linha; [coluna]): 0 pega a linha/coluna inteira; índice fracionado é truncado. */
  "ÍNDICE": (args, ctx) => {
    const t = comoM(ev(args[0], ctx));
    let l = intArg(args[1], ctx);
    let c = args[2] ? intArg(args[2], ctx) : t[0].length === 1 ? 1 : 0;
    if (t.length === 1 && !args[2]) { c = l; l = 1; }
    if (l < 0 || c < 0) return E("#VALOR!");
    if (l > t.length || c > t[0].length) return E("#REF!");
    const linhas = l === 0 ? t : [t[l - 1]];
    const r = linhas.map((x) => (c === 0 ? x : [x[c - 1]]));
    return r.length === 1 && r[0].length === 1 ? r[0][0] : r;
  },
  CORRESP: (args, ctx) => {
    const chave = esc(args[0], ctx); if (ehErro(chave)) return chave;
    const lista = achatar(ev(args[1], ctx));
    const tipo = Math.sign(args[2] ? numArg(args[2], ctx) : 1);
    if (tipo === 0) { const i = busca(chave, lista, false); return i < 0 ? E("#N/D") : i + 1; }
    if (tipo === 1) { const i = busca(chave, lista, true); return i < 0 ? E("#N/D") : i + 1; }
    let a = -1;
    for (let i = 0; i < lista.length; i++) if (comparar(lista[i], chave) >= 0) a = i; else break;
    return a < 0 ? E("#N/D") : a + 1;
  },
  CONCAT: (args, ctx) => {
    let s = "";
    for (const v of args.flatMap((a) => achatar(ev(a, ctx)))) { const t = txt(v); if (ehErro(t)) return t; s += t; if (s.length > LIMITE_TEXTO) return E("#VALOR!"); }
    return s;
  },
  CONCATENAR: (args, ctx) => FUNCOES.CONCAT(args, ctx),
  ESQUERDA: lift((t, n) => { const s = txt(t); if (ehErro(s)) return s; const k = n === null ? 1 : num(n); if (ehErro(k)) return k; return k < 0 ? E("#VALOR!") : s.slice(0, Math.trunc(k)); }),
  DIREITA: lift((t, n) => { const s = txt(t); if (ehErro(s)) return s; const x = n === null ? 1 : num(n); if (ehErro(x)) return x; const k = Math.trunc(x); return k < 0 ? E("#VALOR!") : k === 0 ? "" : s.slice(-k); }),
  "EXT.TEXTO": lift((t, i, n) => { const s = txt(t), a = num(i), b = num(n); if (ehErro(s)) return s; if (ehErro(a)) return a; if (ehErro(b)) return b; return a < 1 || b < 0 ? E("#VALOR!") : s.substr(Math.trunc(a) - 1, Math.trunc(b)); }),
  "NÚM.CARACT": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.length; }),
  ARRUMAR: lift((t) => { const s = txt(t); return ehErro(s) ? s : s.replace(/ +/g, " ").trim(); }),
  "MAIÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toUpperCase(); }),
  "MINÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toLowerCase(); }),
  "PRI.MAIÚSCULA": lift((t) => { const s = txt(t); return ehErro(s) ? s : s.toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()); }),
  /** LOCALIZAR: sem diferenciar maiúsculas (mas acento conta), com curingas. */
  LOCALIZAR: lift((p, t, ini) => {
    const a = textoArg(p), b = textoArg(t);
    const x = ini === null ? 1 : num(ini); if (ehErro(x)) return x;
    const k = Math.trunc(x);
    if (k < 1 || k > b.length + 1) return E("#VALOR!");
    const i = temCuringa(a) ? localizarCuringa(a, b, k - 1) : b.toLowerCase().indexOf(a.toLowerCase(), k - 1);
    return i < 0 ? E("#VALOR!") : i + 1;
  }),
  SUBSTITUIR: lift((t, de, para, n) => {
    const s = textoArg(t), a = textoArg(de), b = textoArg(para);
    if (!a) return s;
    if (n === null) {
      const vezes = s.split(a).length - 1;
      if (s.length + vezes * (b.length - a.length) > LIMITE_TEXTO) return E("#VALOR!");
      return s.split(a).join(b);
    }
    const x = num(n); if (ehErro(x)) return x;
    const alvo = Math.trunc(x);
    if (alvo < 1) return E("#VALOR!");
    let k = 0;
    return s.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), (y) => (++k === alvo ? b : y));
  }),
  VALOR: lift((t) => (t === "" ? E("#VALOR!") : num(t))),
  HOJE: (_a, ctx) => ctx.hoje(),
  DATA: lift((a, m, d) => { const A = num(a), Mm = num(m), D = num(d); if (ehErro(A)) return A; if (ehErro(Mm)) return Mm; if (ehErro(D)) return D; const ano = Math.trunc(A); return Math.round((Date.UTC(ano < 1900 ? ano + 1900 : ano, Math.trunc(Mm) - 1, Math.trunc(D)) - BASE) / 86400000); }),
  ANO: lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).a; }),
  "MÊS": lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).m; }),
  DIA: lift((s) => { const n = num(s); return ehErro(n) ? n : partes(n).d; }),
  /** Tipos 1, 2, 3 e 11–17 (11 = segunda a domingo, …, 17 = domingo a sábado). */
  "DIA.DA.SEMANA": lift((s, tipo) => {
    const n = num(s); if (ehErro(n)) return n;
    const w = partes(n).sem;
    const x = tipo === null ? 1 : num(tipo); if (ehErro(x)) return x;
    const t = Math.trunc(x);
    if (t === 1) return w + 1;
    if (t === 2) return ((w + 6) % 7) + 1;
    if (t === 3) return (w + 6) % 7;
    if (t >= 11 && t <= 17) { const inicio = (t - 10) % 7; return ((w - inicio + 7) % 7) + 1; }
    return E("#NÚM!");
  }),
  /** DIAS(data_final; data_inicial): dias entre as datas (a final vem primeiro, ao contrário do DATADIF). */
  DIAS: (args, ctx) => Math.floor(numArg(args[0], ctx)) - Math.floor(numArg(args[1], ctx)),
  DATADIF: (args, ctx) => {
    const a = Math.floor(numArg(args[0], ctx)), b = Math.floor(numArg(args[1], ctx)), u = String(esc(args[2], ctx)).toUpperCase();
    if (a > b) return E("#NÚM!");
    const p = partes(a), q = partes(b);
    let meses = (q.a - p.a) * 12 + (q.m - p.m); if (q.d < p.d) meses--;
    if (u === "D") return b - a; if (u === "M") return meses; if (u === "Y") return Math.floor(meses / 12); if (u === "YM") return meses % 12;
    if (u === "MD") return q.d >= p.d ? q.d - p.d : b - somaMeses(a, meses, false);
    if (u === "YD") {
      // Dias entre as duas datas como se fossem do mesmo ano.
      const no = (ano: number) => serial(ano, q.m, Math.min(q.d, fimDoMes(ano, q.m)));
      const d = no(p.a) >= a ? no(p.a) : no(p.a + 1);
      return d - a;
    }
    return E("#NÚM!");
  },
  DIATRABALHOTOTAL: (args, ctx) => diasUteis(Math.floor(numArg(args[0], ctx)), Math.floor(numArg(args[1], ctx)), feriados(args[2], ctx)),
  /** DIATRABALHO(início; dias; [feriados]): os dias fracionados são truncados, como no Excel. */
  DIATRABALHO: (args, ctx) => {
    let d = Math.floor(numArg(args[0], ctx));
    let n = intArg(args[1], ctx);
    if (Math.abs(n) > 1_000_000) return E("#NÚM!");
    const fer = feriados(args[2], ctx);
    const passo = n >= 0 ? 1 : -1;
    while (n !== 0) { d += passo; const s = partes(d).sem; if (s !== 0 && s !== 6 && !fer.has(d)) n -= passo; }
    return d;
  },
  "FIMMÊS": lift((s, n) => { const a = num(s), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : somaMeses(a, Math.trunc(b), true); }),
  DATAM: lift((s, n) => { const a = num(s), b = num(n); return ehErro(a) ? a : ehErro(b) ? b : somaMeses(a, Math.trunc(b), false); }),
  FILTRO: (args, ctx) => {
    const m = comoM(ev(args[0], ctx)); const inc = comoM(ev(args[1], ctx));
    let out: M;
    if (inc[0].length === 1 && inc.length === m.length) out = m.filter((_, i) => bool(inc[i][0]) === true);
    else if (inc.length === 1 && inc[0].length === m[0].length) out = m.map((l) => l.filter((_, j) => bool(inc[0][j]) === true));
    else return E("#VALOR!");
    if (out.length && out[0].length) return out;
    return args[2] ? ev(args[2], ctx) : E("#CALC!");
  },
  /** CLASSIFICAR(matriz; [índice]; [ordem]; [por_col]). */
  CLASSIFICAR: (args, ctx) => {
    const m0 = comoM(ev(args[0], ctx));
    const porCol = args[3] ? bool(esc(args[3], ctx)) === true : false;
    const m = porCol ? transpor(m0) : m0;
    const i = args[1] ? intArg(args[1], ctx) : 1, o = args[2] ? intArg(args[2], ctx) : 1;
    if (i < 1 || i > m[0].length || (o !== 1 && o !== -1)) return E("#VALOR!");
    const r = [...m].map((l, k) => ({ l, k })).sort((a, b) => o * comparar(a.l[i - 1], b.l[i - 1]) || a.k - b.k).map((x) => x.l);
    return porCol ? transpor(r) : r;
  },
  /**
   * CLASSIFICARPOR(matriz; por_matriz1; [ordem1]; [por_matriz2; ordem2]…): ordena
   * pelas listas dadas (que não precisam aparecer no resultado). Coluna do mesmo
   * número de linhas ordena as linhas; linha do mesmo número de colunas, as colunas.
   */
  CLASSIFICARPOR: (args, ctx) => {
    const m0 = comoM(ev(args[0], ctx));
    if (args.length < 2) return E("#VALOR!");
    const chaves: { vs: V[]; o: number }[] = [];
    let porCol: boolean | null = null;
    for (let k = 1; k < args.length; k += 2) {
      const pm = comoM(ev(args[k], ctx));
      const o = args[k + 1] ? intArg(args[k + 1], ctx) : 1;
      if (o !== 1 && o !== -1) return E("#VALOR!");
      const coluna = pm[0].length === 1 && pm.length === m0.length;
      const linha = pm.length === 1 && pm[0].length === m0[0].length;
      const col = coluna ? false : linha ? true : null;
      if (col === null || (porCol !== null && porCol !== col)) return E("#VALOR!");
      porCol = col;
      chaves.push({ vs: col ? pm[0] : pm.map((l) => l[0]), o });
    }
    const m = porCol ? transpor(m0) : m0;
    const erro = chaves.flatMap((c) => c.vs).find(ehErro);
    if (erro) return erro;
    const r = m
      .map((l, i) => ({ l, i }))
      .sort((a, b) => {
        for (const c of chaves) {
          const x = c.o * comparar(c.vs[a.i], c.vs[b.i]);
          if (x) return x;
        }
        return a.i - b.i;
      })
      .map((x) => x.l);
    return porCol ? transpor(r) : r;
  },
  /** ÚNICO(matriz; [por_col]; [exatamente_uma_vez]). */
  "ÚNICO": (args, ctx) => {
    const m0 = comoM(ev(args[0], ctx));
    const porCol = args[1] ? bool(esc(args[1], ctx)) === true : false;
    const umaVez = args[2] ? bool(esc(args[2], ctx)) === true : false;
    const m = porCol ? transpor(m0) : m0;
    const chave = (l: V[]) => JSON.stringify(l.map((v) => (typeof v === "string" ? v.toUpperCase() : v)));
    const conta = new Map<string, number>();
    for (const l of m) conta.set(chave(l), (conta.get(chave(l)) ?? 0) + 1);
    const vistos = new Set<string>();
    const r = m.filter((l) => { const k = chave(l); if (umaVez) return conta.get(k) === 1; if (vistos.has(k)) return false; vistos.add(k); return true; });
    if (!r.length) return E("#CALC!");
    return porCol ? transpor(r) : r;
  },
  "SEQUÊNCIA": (args, ctx) => {
    const l = intArg(args[0], ctx), c = args[1] ? intArg(args[1], ctx) : 1, i = args[2] ? numArg(args[2], ctx) : 1, p = args[3] ? numArg(args[3], ctx) : 1;
    if (l < 0 || c < 0) return E("#VALOR!");
    if (l === 0 || c === 0) return E("#CALC!");
    if (grande(l, c)) return E("#NÚM!");
    return Array.from({ length: l }, (_, a) => Array.from({ length: c }, (_, b) => i + (a * c + b) * p));
  },
  TRUNCAR: lift((x, n) => { const a = num(x), b = n === null ? 0 : num(n); if (ehErro(a)) return a; if (ehErro(b)) return b; const k = 10 ** Math.trunc(b); return Math.trunc(a * k) / k; }),
  MOD: lift((x, d) => { const a = num(x), b = num(d); if (ehErro(a)) return a; if (ehErro(b)) return b; return b === 0 ? E("#DIV/0!") : a - b * Math.floor(a / b); }),
  "POTÊNCIA": lift((x, p) => { const a = num(x), b = num(p); return ehErro(a) ? a : ehErro(b) ? b : potencia(a, b); }),
  RAIZ: lift((x) => { const a = num(x); return ehErro(a) ? a : a < 0 ? E("#NÚM!") : Math.sqrt(a); }),
  MED: agregado((ns) => { if (!ns.length) return E("#NÚM!"); const o = [...ns].sort((a, b) => a - b), m = Math.floor(o.length / 2); return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; }),
  "ÉERROS": (args, ctx) => mapa(ev(args[0], ctx), (v) => ehErro(v)),
  "ÉCÉL.VAZIA": (args, ctx) => mapa(ev(args[0], ctx), (v) => v === null),
  "ÉNÚM": (args, ctx) => mapa(ev(args[0], ctx), (v) => typeof v === "number"),
  "ÉTEXTO": (args, ctx) => mapa(ev(args[0], ctx), (v) => typeof v === "string"),
  ESCOLHER: (args, ctx) => { const i = intArg(args[0], ctx); return i >= 1 && i < args.length ? ev(args[i], ctx) : E("#VALOR!"); },
  DESLOC: (args, ctx) => {
    const base = resolver(args[0], ctx);
    if (!base || (base.t !== "ref" && base.t !== "int")) return E("#VALOR!");
    const { a, b } = base.t === "int" ? faixa(base, ctx) : { a: base, b: base };
    const l = a.l + intArg(args[1], ctx), c = a.c + intArg(args[2], ctx);
    const h = args[3] ? intArg(args[3], ctx) : b.l - a.l + 1, w = args[4] ? intArg(args[4], ctx) : b.c - a.c + 1;
    if (l < 0 || c < 0 || h < 1 || w < 1) return E("#REF!");
    if (grande(h, w)) return E("#NÚM!");
    const m = bloco(ctx, l, c, h, w, base.aba);
    return ehM(m) && h === 1 && w === 1 ? m[0][0] : m;
  },
  PROCURAR: lift((p, t, ini) => {
    const a = textoArg(p), b = textoArg(t);
    const x = ini === null ? 1 : num(ini); if (ehErro(x)) return x;
    const k = Math.trunc(x);
    if (k < 1 || k > b.length + 1) return E("#VALOR!");
    const i = b.indexOf(a, k - 1);
    return i < 0 ? E("#VALOR!") : i + 1;
  }),
  TEXTO: lift((v, f) => {
    if (typeof v === "boolean") return txt(v);
    const n = num(v);
    if (ehErro(n)) return typeof v === "string" ? v : n;
    const fmt = txt(f);
    return ehErro(fmt) ? fmt : formatarComCodigo(n, fmt);
  }),
  REPT: lift((t, n) => { const s = txt(t), k = num(n); if (ehErro(s)) return s; if (ehErro(k)) return k; const vezes = Math.trunc(k); if (vezes < 0 || s.length * vezes > LIMITE_TEXTO) return E("#VALOR!"); return s.repeat(vezes); }),
  AGORA: (_a, ctx) => ctx.agora(),
  VERDADEIRO: () => true,
  FALSO: () => false,
  // --- funções do Excel 365 e financeiras -----------------------------------
  /** LET(nome; valor; …; cálculo): dá nome a um valor e o usa no cálculo. */
  LET: (args, ctx) => {
    const nomes = new Map(ctx.nomes);
    const refs = new Map(ctx.refs);
    const dentro = { ...ctx, nomes, refs };
    let i = 0;
    for (; i + 1 < args.length; i += 2) {
      const n = args[i];
      if (!n || n.t !== "nome") return E("#VALOR!");
      // Nome ligado a uma referência continua sendo referência (SUBTOTAL, DESLOC…).
      const alvo = resolver(args[i + 1], dentro);
      const valor = ev(args[i + 1], dentro);
      if (alvo && (alvo.t === "ref" || alvo.t === "int")) refs.set(n.v, alvo);
      else refs.delete(n.v);
      nomes.set(n.v, valor);
    }
    return i < args.length ? ev(args[i], dentro) : E("#VALOR!");
  },
  /**
   * CORRESPX(valor; matriz; [modo_correspondência]; [modo_pesquisa]).
   * Correspondência: 0 exata (padrão), -1 exata ou próximo menor, 1 exata ou
   * próximo maior, 2 curinga. Pesquisa: 1 do primeiro ao último, -1 do último.
   */
  CORRESPX: (args, ctx) => {
    const chave = esc(args[0], ctx);
    if (ehErro(chave)) return chave;
    const lista = achatar(ev(args[1], ctx));
    const modo = args[2] ? intArg(args[2], ctx) : 0;
    const sentido = args[3] ? intArg(args[3], ctx) : 1;
    const i = procurarX(chave, lista, modo, sentido);
    return ehErro(i) ? i : i < 0 ? E("#N/D") : i + 1;
  },
  /** UNIRTEXTO(delimitador; ignorar_vazio; texto1; …). */
  UNIRTEXTO: (args, ctx) => {
    const d = txt(esc(args[0], ctx));
    if (ehErro(d)) return d;
    const ignorar = bool(esc(args[1], ctx, true));
    if (ehErro(ignorar)) return ignorar;
    const pedacos: string[] = [];
    let tamanho = 0;
    for (const v of args.slice(2).flatMap((a) => achatar(ev(a, ctx)))) {
      const t = txt(v);
      if (ehErro(t)) return t;
      if (ignorar && t === "") continue;
      tamanho += t.length + (pedacos.length ? d.length : 0);
      if (tamanho > LIMITE_TEXTO) return E("#VALOR!");
      pedacos.push(t);
    }
    return pedacos.join(d);
  },
  /** DIVIDIRTEXTO(texto; delimitador_col; [delimitador_lin]; [ignorar_vazio]): o inverso de UNIRTEXTO, derramando. */
  DIVIDIRTEXTO: (args, ctx) => {
    const t = txt(esc(args[0], ctx));
    if (ehErro(t)) return t;
    const lista = (n: No | undefined) => (n ? achatar(ev(n, ctx)).map((v) => txt(v)).filter((x): x is string => typeof x === "string" && x !== "") : []);
    const dc = lista(args[1]), dl = lista(args[2]);
    const ignorar = args[3] ? bool(esc(args[3], ctx)) === true : false;
    const quebrar = (s: string, ds: string[]) => {
      if (!ds.length) return [s];
      const re = new RegExp(ds.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
      const r = s.split(re);
      return ignorar ? r.filter((x) => x !== "") : r;
    };
    const linhas = quebrar(t, dl).map((l) => quebrar(l, dc));
    if (!linhas.length || !linhas[0].length) return E("#CALC!");
    const largura = Math.max(...linhas.map((l) => l.length));
    if (grande(linhas.length, largura)) return E("#NÚM!");
    return linhas.map((l) => Array.from({ length: largura }, (_, j) => (j < l.length ? l[j] : E("#N/D"))));
  },
  /** PEGAR(matriz; linhas; [colunas]): as primeiras (ou, com negativo, as últimas) linhas e colunas. */
  PEGAR: (args, ctx) => {
    const m = comoM(ev(args[0], ctx));
    const nl = args[1] ? intArg(args[1], ctx) : m.length;
    const nc = args[2] ? intArg(args[2], ctx) : m[0].length;
    if (nl === 0 || nc === 0) return E("#CALC!");
    const corta = <T,>(xs: T[], n: number) => (n > 0 ? xs.slice(0, n) : xs.slice(n));
    return corta(m, nl).map((l) => corta(l, nc));
  },
  /** DESCARTAR(matriz; linhas; [colunas]): tira as primeiras (ou últimas) linhas e colunas. */
  DESCARTAR: (args, ctx) => {
    const m = comoM(ev(args[0], ctx));
    const nl = args[1] ? intArg(args[1], ctx) : 0;
    const nc = args[2] ? intArg(args[2], ctx) : 0;
    const corta = <T,>(xs: T[], n: number) => (n >= 0 ? xs.slice(n) : xs.slice(0, n));
    const r = corta(m, nl).map((l) => corta(l, nc));
    return r.length && r[0].length ? r : E("#CALC!");
  },
  /** ESCOLHERCOLS(matriz; col1; …): as colunas pedidas, na ordem pedida (negativo conta do fim). */
  ESCOLHERCOLS: (args, ctx) => {
    const m = comoM(ev(args[0], ctx));
    const w = m[0].length;
    const cols = args.slice(1).flatMap((a) => achatar(ev(a, ctx))).map((v) => num(v)).map((c) => (ehErro(c) ? c : Math.trunc(c)));
    if (!cols.length || cols.some((c) => ehErro(c) || c === 0 || Math.abs(c as number) > w)) return E("#VALOR!");
    if (grande(m.length, cols.length)) return E("#NÚM!");
    const idx = cols.map((c) => ((c as number) > 0 ? (c as number) - 1 : w + (c as number)));
    return m.map((l) => idx.map((j) => l[j]));
  },
  /**
   * AGREGAR(função; opções; ref1; [k]): como SUBTOTAL, mas pode ignorar erros.
   * Funções 1–13 (as do SUBTOTAL, MED, MODO), 14/15 (MAIOR/MENOR com k) e
   * 16–19 (PERCENTIL.INC, QUARTIL.INC, PERCENTIL.EXC, QUARTIL.EXC).
   * Opções: 0–3 ignoram SUBTOTAL/AGREGAR aninhados; 1, 3, 5, 7 ignoram linhas
   * ocultas (filtro); 2, 3, 6, 7 ignoram erros.
   */
  AGREGAR: (args, ctx) => {
    const f = intArg(args[0], ctx), op = intArg(args[1], ctx);
    if (op < 0 || op > 7) return E("#VALOR!");
    const ocultas = [1, 3, 5, 7].includes(op), erros = [2, 3, 6, 7].includes(op), aninhados = op <= 3;
    const fontes = f >= 14 ? [args[2]] : args.slice(2);
    const vals: V[] = [];
    for (const a of fontes) {
      if (!a) return E("#VALOR!");
      const vs = celulasDaRef(a, ctx, ocultas, aninhados);
      vals.push(...(vs ?? achatar(ev(a, ctx))));
    }
    const limpos = erros ? vals.filter((v) => !ehErro(v)) : vals;
    const erro = limpos.find(ehErro);
    if (erro) return erro;
    if (f >= 14 && f <= 19) {
      const k = numArg(args[3], ctx);
      const ns = soNumeros(limpos).sort((a, b) => (f === 14 ? b - a : a - b));
      if (f === 14 || f === 15) return ns[Math.trunc(k) - 1] ?? E("#NÚM!");
      if (f === 16) return percentil(ns, k, false);
      if (f === 18) return percentil(ns, k, true);
      const q = Math.trunc(k);
      if (f === 17) return q < 0 || q > 4 ? E("#NÚM!") : percentil(ns, q / 4, false);
      return q < 1 || q > 3 ? E("#NÚM!") : percentil(ns, q / 4, true);
    }
    if (f === 12) { const ns = soNumeros(limpos).sort((a, b) => a - b); if (!ns.length) return E("#NÚM!"); const m = Math.floor(ns.length / 2); return ns.length % 2 ? ns[m] : (ns[m - 1] + ns[m]) / 2; }
    if (f === 13) {
      const conta = new Map<number, number>();
      for (const n of soNumeros(limpos)) conta.set(n, (conta.get(n) ?? 0) + 1);
      let melhor: number | null = null;
      for (const [n, k] of conta) if (k > 1 && (melhor === null || k > conta.get(melhor)!)) melhor = n;
      return melhor ?? E("#N/D");
    }
    const sub = SUBTOTAIS[f];
    return sub ? sub(limpos) : E("#VALOR!");
  },
  /** VP(taxa; nper; pgto; [vf]; [tipo]): valor presente (quanto vale hoje uma série de pagamentos). */
  VP: (args, ctx) => {
    const i = numArg(args[0], ctx), n = numArg(args[1], ctx), p = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0;
    if (i === 0) return -(vf + p * n);
    const f = (1 + i) ** n;
    return -(vf + p * (1 + i * t) * ((f - 1) / i)) / f;
  },
  /** VF(taxa; nper; pgto; [vp]; [tipo]): valor futuro (quanto se acumula). */
  VF: (args, ctx) => {
    const i = numArg(args[0], ctx), n = numArg(args[1], ctx), p = numArg(args[2], ctx), vp = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0;
    if (i === 0) return -(vp + p * n);
    const f = (1 + i) ** n;
    return -(vp * f + p * (1 + i * t) * ((f - 1) / i));
  },
  /** NPER(taxa; pgto; vp; [vf]; [tipo]): quantos períodos. */
  NPER: (args, ctx) => {
    const i = numArg(args[0], ctx), p = numArg(args[1], ctx), vp = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0;
    if (i === 0) return p === 0 ? E("#NÚM!") : -(vp + vf) / p;
    const a = p * (1 + i * t) - vf * i, b = vp * i + p * (1 + i * t);
    if (a / b <= 0) return E("#NÚM!");
    return Math.log(a / b) / Math.log(1 + i);
  },
  /** TAXA(nper; pgto; vp; [vf]; [tipo]; [estimativa]): a taxa por período (Newton, como o Excel). */
  TAXA: (args, ctx) => {
    const n = numArg(args[0], ctx), p = numArg(args[1], ctx), vp = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0;
    let i = args[5] ? numArg(args[5], ctx) : 0.1;
    const escala = Math.max(1, Math.abs(vp), Math.abs(p * n), Math.abs(vf));
    // ((1+x)^n − 1)/x, com a série perto de 0 (onde a conta direta perde a precisão).
    const fator = (x: number) => (Math.abs(x) < 1e-6 ? n + (n * (n - 1) * x) / 2 + (n * (n - 1) * (n - 2) * x * x) / 6 : ((1 + x) ** n - 1) / x);
    const g = (x: number) => vp * (1 + x) ** n + p * (1 + x * t) * fator(x) + vf;
    if (Math.abs(g(0)) <= 1e-10 * escala) return 0;
    for (let k = 0; k < 100; k++) {
      const y = g(i);
      if (Math.abs(y) <= 1e-12 * escala) return i;
      const h = 1e-7 * Math.max(1, Math.abs(i)), d = (g(i + h) - g(i - h)) / (2 * h);
      if (!Number.isFinite(d) || d === 0) break;
      const novo = i - y / d;
      if (!Number.isFinite(novo) || novo <= -1) break;
      if (Math.abs(novo - i) < 1e-10) return novo;
      i = novo;
    }
    return E("#NÚM!");
  },
  /** NÚMSEMANA(data; [tipo_retorno]): a semana do ano. 1 = começa no domingo; 2 = segunda; 21 = ISO. */
  "NÚMSEMANA": lift((d, tipo) => {
    const s = num(d), t = tipo === null ? 1 : num(tipo);
    if (ehErro(s)) return s;
    if (ehErro(t)) return t;
    const x = partes(s);
    if (t === 21) {
      // ISO 8601: a semana da quinta-feira.
      const quinta = Math.floor(s) - ((x.sem + 6) % 7) + 3;
      const ano = partes(quinta).a;
      return Math.floor((quinta - serial(ano, 1, 1)) / 7) + 1;
    }
    const inicioSemana: Record<number, number> = { 1: 0, 17: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6 };
    const ini = inicioSemana[t as number];
    if (ini === undefined) return E("#NÚM!");
    const primeiro = serial(x.a, 1, 1);
    const desloc = (partes(primeiro).sem - ini + 7) % 7;
    return Math.floor((Math.floor(s) - primeiro + desloc) / 7) + 1;
  }),
  /** MARRED(núm; múltiplo): arredonda para o múltiplo mais próximo (sinais diferentes = #NÚM!). */
  MARRED: lift((x, m) => {
    const a = num(x), b = num(m);
    if (ehErro(a)) return a;
    if (ehErro(b)) return b;
    if (b === 0) return 0;
    if (a * b < 0) return E("#NÚM!");
    return Math.sign(a) * Math.round(Math.abs(a) / Math.abs(b) + 1e-9) * Math.abs(b);
  }),
  INDIRETO: (args, ctx) => { const r = refIndireta(args, ctx); return ehErro(r) ? r : avaliar(r, ctx); },
  PGTO: (args, ctx) => { const i = numArg(args[0], ctx), n = numArg(args[1], ctx), vp = numArg(args[2], ctx), vf = args[3] ? numArg(args[3], ctx) : 0, t = args[4] ? numArg(args[4], ctx) : 0; if (i === 0) return -(vp + vf) / n; const f = (1 + i) ** n; return (-(vp * f + vf) * i) / ((1 + i * t) * (f - 1)); },
};

export type Tipo = "NUMBER_RAW" | "NUMBER_DATE" | "NUMBER_TIME" | "NUMBER_DATETIME" | "NUMBER_CURRENCY" | "NUMBER_PERCENT" | "STRING" | "BOOLEAN" | "ERROR" | "EMPTY";
/** Conteúdo de uma célula: fórmula já analisada ou valor digitado (com o tipo que a digitação indicou). */
export type Conteudo = { formula: No } | { valor: V; tipo: Tipo };

const DATAS = new Set(["DATA", "HOJE", "FIMMÊS", "DATAM", "DIATRABALHO"]);

const usaSubtotal = (no: No): boolean =>
  no.t === "fn" ? no.nome === "SUBTOTAL" || no.args.some(usaSubtotal) : no.t === "un" || no.t === "pct" ? usaSubtotal(no.x) : no.t === "bin" ? usaSubtotal(no.a) || usaSubtotal(no.b) : false;

/**
 * Uma planilha calculada sob demanda: cada leitura calcula o que falta e
 * guarda em cache até a próxima mudança. As planilhas dos exercícios são
 * pequenas (até 50 × 26), então recalcular tudo a cada mudança é instantâneo.
 */
export class Calculo {
  /** Chaves "aba:linha,coluna" (aba é o índice). Cada aba é uma Planilha; o cálculo é um só. */
  private conteudos = new Map<string, Conteudo>();
  private cache = new Map<string, V>();
  private tipos = new Map<string, Tipo>();
  private derramado = new Map<string, V>();
  /** Tamanho de cada resultado que derramou, pela célula da fórmula (para `D2#`). */
  private tamanhos = new Map<string, { linhas: number; colunas: number }>();
  private pilha = new Set<string>();
  /** Fórmulas ainda não calculadas desde a última mudança (null: ainda não levantadas). */
  private pendentes: Set<string> | null = null;
  /**
   * Cálculo antecipado (procurando quem derrama numa célula vazia): ele pode
   * tropeçar numa fórmula que ainda está na pilha, sem haver ciclo de verdade
   * (ex.: F2 =SOMA(C2:C15) lê uma vazia e antecipa F7 =SOMA(F2:F5)). Esse
   * #CIRC! falso não fica no cache: a fórmula é calculada de novo quando lida.
   */
  private antecipando = 0;
  private circFalso = false;
  /** Última linha e coluna preenchidas de cada aba (para cortar A:A e 1:1). */
  private extensao = new Map<number, { linhas: number; colunas: number }>();
  /** Nomes das abas, na ordem (o índice é a aba). */
  abas: string[] = ["Planilha1"];
  /**
   * Tamanho da grade: até onde vão a coluna inteira (A:A) e a linha inteira
   * (1:1). Se houver célula preenchida além, vale a última preenchida.
   */
  limites = { linhas: 50, colunas: 26 };
  /** Linhas escondidas pelo filtro de cada aba (quem decide é a Planilha da aba). */
  linhaOculta: (l: number, aba: number) => boolean = () => false;
  constructor(
    private hoje: () => number = () => { const d = new Date(); return serial(d.getFullYear(), d.getMonth() + 1, d.getDate()); },
  ) {}

  /** Índice da aba pelo nome, sem diferenciar maiúsculas (-1 se não existe). */
  indiceDaAba(nome: string): number {
    const n = nome.toUpperCase();
    return this.abas.findIndex((a) => a.toUpperCase() === n);
  }

  definir(l: number, c: number, conteudo: Conteudo | null, s = 0) {
    const k = `${s}:${l},${c}`;
    if (conteudo === null) this.conteudos.delete(k);
    else this.conteudos.set(k, conteudo);
    this.invalidar();
  }

  /** Recalcula tudo na próxima leitura (ex.: o filtro mudou e o SUBTOTAL depende dele). */
  invalidar() {
    this.cache.clear();
    this.tipos.clear();
    this.derramado.clear();
    this.tamanhos.clear();
    this.pendentes = null;
    this.extensao.clear();
  }

  temFormula(l: number, c: number, s = 0) {
    const x = this.conteudos.get(`${s}:${l},${c}`);
    return !!x && "formula" in x;
  }

  /** Preenchida pelo resultado de uma fórmula que derramou (FILTRO, ÚNICO…). */
  derramada(l: number, c: number, s = 0) {
    const k = `${s}:${l},${c}`;
    if (this.conteudos.has(k)) return false;
    this.ler(l, c, s);
    return this.derramado.has(k);
  }

  /** Tamanho útil da aba: `limites`, ampliado até a última célula preenchida. */
  private limitesDa(s: number) {
    let e = this.extensao.get(s);
    if (!e) {
      e = { ...this.limites };
      const prefixo = `${s}:`;
      for (const k of this.conteudos.keys()) {
        if (!k.startsWith(prefixo)) continue;
        const [l, c] = k.slice(prefixo.length).split(",").map(Number);
        if (l + 1 > e.linhas) e.linhas = l + 1;
        if (c + 1 > e.colunas) e.colunas = c + 1;
      }
      this.extensao.set(s, e);
    }
    return e;
  }

  /** Contexto de avaliação de uma fórmula que mora na aba `s`. */
  private contexto(s: number): Ctx {
    const agora = () => { const d = new Date(); return this.hoje() + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; };
    const aba = (nome?: string) => (nome === undefined ? s : this.indiceDaAba(nome));
    return {
      ler: (a, b, nome) => { const t = aba(nome); return t < 0 ? E("#REF!") : this.ler(a, b, t); },
      derrame: (a, b, nome) => {
        const t = aba(nome);
        if (t < 0) return null;
        const k = `${t}:${a},${b}`;
        const x = this.conteudos.get(k);
        if (!x || !("formula" in x)) return null;
        this.calcular(k);
        return this.tamanhos.get(k) ?? null;
      },
      hoje: this.hoje,
      agora,
      oculta: (x, nome) => { const t = aba(nome); return t >= 0 && this.linhaOculta(x, t); },
      ehSubtotal: (a, b, nome) => { const y = this.conteudos.get(`${aba(nome)}:${a},${b}`); return !!y && "formula" in y && usaSubtotal(y.formula); },
      limites: (nome) => { const t = aba(nome); return this.limitesDa(t < 0 ? s : t); },
      abasEntre: (ini, fim) => {
        const i = this.indiceDaAba(ini), j = this.indiceDaAba(fim);
        return i < 0 || j < 0 ? null : this.abas.slice(Math.min(i, j), Math.max(i, j) + 1);
      },
    };
  }

  /** Avalia uma fórmula que não está em célula nenhuma (regra de formatação condicional). */
  avaliarAvulsa(no: No, s = 0): V {
    const r = avaliar(no, this.contexto(s));
    return Array.isArray(r) ? (r[0]?.[0] ?? null) : r;
  }

  private calcular(k: string): V {
    if (this.cache.has(k)) return this.cache.get(k)!;
    if (this.pilha.has(k)) {
      if (this.antecipando) this.circFalso = true;
      return E("#CIRC!");
    }
    const no = (this.conteudos.get(k) as { formula: No }).formula;
    this.pilha.add(k);
    const [s, resto] = k.split(":");
    const [l, c] = resto.split(",").map(Number);
    const r = avaliar(no, this.contexto(Number(s)));
    this.pilha.delete(k);
    let v: V;
    if (Array.isArray(r)) {
      const chave = (i: number, j: number) => `${s}:${l + i},${c + j}`;
      if (!r.length || !r[0].length) v = E("#CALC!");
      else if (r.length === 1 && r[0].length === 1) v = r[0][0] ?? 0;
      else if (r.some((linha, i) => linha.some((_, j) => (i || j) && (this.conteudos.has(chave(i, j)) || this.derramado.has(chave(i, j)))))) v = E("#DESPEJAR!");
      else {
        r.forEach((linha, i) => linha.forEach((x, j) => { if (i || j) this.derramado.set(chave(i, j), x ?? null); }));
        this.tamanhos.set(k, { linhas: r.length, colunas: r[0].length });
        v = r[0][0] ?? null;
      }
    } else v = r ?? 0; // fórmula que aponta para uma célula vazia mostra 0, como no Excel
    this.cache.set(k, v);
    this.pendentes?.delete(k);
    return v;
  }

  ler(l: number, c: number, s = 0): V {
    const k = `${s}:${l},${c}`;
    const x = this.conteudos.get(k);
    if (x && "formula" in x) return this.calcular(k);
    if (x) return x.valor;
    // Vazia: pode ser parte do resultado de uma fórmula que derrama. Calcula as pendentes.
    if (!this.derramado.has(k)) {
      if (!this.pendentes) {
        this.pendentes = new Set();
        for (const [kk, y] of this.conteudos) if ("formula" in y && !this.cache.has(kk)) this.pendentes.add(kk);
      }
      for (const kk of [...this.pendentes]) {
        if (this.pilha.has(kk)) continue;
        const antes = this.circFalso;
        this.circFalso = false;
        this.antecipando++;
        try {
          this.calcular(kk);
        } finally {
          this.antecipando--;
        }
        if (this.circFalso)
          for (const [ck, v] of [...this.cache])
            if (v !== null && typeof v === "object" && !Array.isArray(v) && (v as { erro?: string }).erro === "#CIRC!") this.cache.delete(ck);
        this.circFalso = antes || this.circFalso;
      }
    }
    return this.derramado.get(k) ?? null;
  }

  /** Tipo do valor, para a exibição (data, moeda, porcentagem…), como o Excel infere. */
  tipo(l: number, c: number, s = 0): Tipo {
    const v = this.ler(l, c, s);
    if (v === null) return "EMPTY";
    if (typeof v === "string") return "STRING";
    if (typeof v === "boolean") return "BOOLEAN";
    if (typeof v === "object") return "ERROR";
    const k = `${s}:${l},${c}`;
    const x = this.conteudos.get(k);
    if (!x) return "NUMBER_RAW";
    if ("valor" in x) return x.tipo;
    if (!this.tipos.has(k)) { this.tipos.set(k, "NUMBER_RAW"); this.tipos.set(k, this.tipoDe(x.formula, s)); }
    return this.tipos.get(k)!;
  }

  private tipoDe(no: No, s: number): Tipo {
    const aba = (nome?: string) => (nome === undefined ? s : this.indiceDaAba(nome));
    switch (no.t) {
      case "ref": { const a = aba(no.aba); if (a < 0) return "NUMBER_RAW"; const t = this.tipo(no.l, no.c, a); return t.startsWith("NUMBER") ? t : "NUMBER_RAW"; }
      case "pct": return "NUMBER_PERCENT";
      case "fn":
        if (DATAS.has(no.nome)) return "NUMBER_DATE";
        if (no.nome === "AGORA") return "NUMBER_DATETIME";
        if (["SE", "SEERRO", "MÍNIMO", "MÁXIMO", "SOMA", "ARRED"].includes(no.nome) && no.args.length) {
          const ts = no.args.map((a) => this.tipoDe(a, s)).filter((t) => t !== "NUMBER_RAW");
          return ts.length && ts.every((t) => t === ts[0]) && ts[0] !== "NUMBER_PERCENT" ? ts[0] : "NUMBER_RAW";
        }
        return "NUMBER_RAW";
      case "int": { const a = aba(no.aba); if (a < 0) return "NUMBER_RAW"; const t = this.tipo(no.a.l, no.a.c, a); return t.startsWith("NUMBER") ? t : "NUMBER_RAW"; }
      case "bin": {
        const a = this.tipoDe(no.a, s), b = this.tipoDe(no.b, s);
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
