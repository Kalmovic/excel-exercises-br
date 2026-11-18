/**
 * TEXTO(valor; formato): os códigos de formato do Excel em português.
 * Datas: d, dd, ddd, dddd, m…mmmmm, a/aa, aaaa (ou y), h, hh, m/mm (minutos
 * junto de h ou s), s, ss, AM/PM. Números: 0, #, ?, "." de milhar, "," decimal,
 * %, E+00. Textos entre aspas, \x e o resto dos caracteres saem como estão.
 */

const BASE = Date.UTC(1899, 11, 30);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_LONGOS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Pedaço do formato: texto literal ou código. */
type Tok = { lit: string } | { cod: string };

function separarSecoes(f: string): string[] {
  const out: string[] = [];
  let atual = "", aspas = false;
  for (let i = 0; i < f.length; i++) {
    const ch = f[i];
    if (ch === '"') aspas = !aspas;
    if (ch === "\\" && !aspas && i + 1 < f.length) { atual += ch + f[++i]; continue; }
    if (ch === ";" && !aspas) { out.push(atual); atual = ""; continue; }
    atual += ch;
  }
  out.push(atual);
  return out;
}

function tokenizar(f: string): Tok[] {
  const out: Tok[] = [];
  const lit = (s: string) => { const u = out[out.length - 1]; if (u && "lit" in u) u.lit += s; else out.push({ lit: s }); };
  let i = 0;
  while (i < f.length) {
    const ch = f[i];
    const resto = f.slice(i).toLowerCase();
    if (ch === '"') { const j = f.indexOf('"', i + 1); const fim = j < 0 ? f.length : j; lit(f.slice(i + 1, fim)); i = fim + 1; continue; }
    if (ch === "\\" && i + 1 < f.length) { lit(f[i + 1]); i += 2; continue; }
    if (ch === "[") { const j = f.indexOf("]", i); i = j < 0 ? f.length : j + 1; continue; }
    if (resto.startsWith("am/pm")) { out.push({ cod: "am/pm" }); i += 5; continue; }
    if (resto.startsWith("a/p")) { out.push({ cod: "a/p" }); i += 3; continue; }
    const m = /^(d+|m+|a+|y+|h+|s+|e[+-]|[0#?.,%])/.exec(resto);
    if (m) { out.push({ cod: m[0] }); i += m[0].length; continue; }
    lit(ch);
    i++;
  }
  return out;
}

const ehData = (c: string) => /^(d+|m+|a+|y+|h+|s+|am\/pm|a\/p)$/.test(c);

function formatarData(n: number, toks: Tok[]): string {
  const dia = Math.floor(n);
  let seg = Math.round((n - dia) * 86400);
  let d = dia;
  if (seg >= 86400) { seg -= 86400; d++; }
  const dt = new Date(BASE + d * 86400000);
  const a = dt.getUTCFullYear(), mes = dt.getUTCMonth(), dd = dt.getUTCDate(), sem = dt.getUTCDay();
  const h = Math.floor(seg / 3600), mi = Math.floor((seg % 3600) / 60), s = seg % 60;
  const ampm = toks.some((t) => "cod" in t && (t.cod === "am/pm" || t.cod === "a/p"));
  const codigos = toks.flatMap((t, i) => ("cod" in t ? [i] : []));
  const pad = (x: number) => String(x).padStart(2, "0");
  return toks
    .map((t, i) => {
      if ("lit" in t) return t.lit;
      const c = t.cod;
      if (c[0] === "d") return c.length === 1 ? String(dd) : c.length === 2 ? pad(dd) : c.length === 3 ? DIAS[sem] : DIAS_LONGOS[sem];
      if (c[0] === "a" && c !== "am/pm" && c !== "a/p") return c.length <= 2 ? pad(a % 100) : String(a);
      if (c[0] === "y") return c.length <= 2 ? pad(a % 100) : String(a);
      if (c[0] === "h") { const x = ampm ? h % 12 || 12 : h; return c.length === 1 ? String(x) : pad(x); }
      if (c[0] === "s") return c.length === 1 ? String(s) : pad(s);
      if (c === "am/pm") return h < 12 ? "AM" : "PM";
      if (c === "a/p") return h < 12 ? "A" : "P";
      if (c[0] === "m") {
        // m/mm logo depois de h, ou logo antes de s, são minutos.
        const k = codigos.indexOf(i);
        const antes = k > 0 ? (toks[codigos[k - 1]] as { cod: string }).cod : "";
        const depois = k + 1 < codigos.length ? (toks[codigos[k + 1]] as { cod: string }).cod : "";
        if (c.length <= 2 && (antes[0] === "h" || depois[0] === "s")) return c.length === 1 ? String(mi) : pad(mi);
        return c.length === 1 ? String(mes + 1) : c.length === 2 ? pad(mes + 1) : c.length === 3 ? MESES[mes] : c.length === 4 ? MESES_LONGOS[mes] : MESES[mes][0];
      }
      return c;
    })
    .join("");
}

const agrupar = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function formatarNumero(n: number, toks: Tok[], comSinal: boolean): string {
  const lugar = (t: Tok) => "cod" in t && /^[0#?]$/.test(t.cod);
  let x = Math.abs(n);
  for (const t of toks) if ("cod" in t && t.cod === "%") x *= 100;
  const iDec = toks.findIndex((t) => "cod" in t && t.cod === ",");
  const iExp = toks.findIndex((t) => "cod" in t && /^e[+-]$/.test(t.cod));
  const fimMantissa = iExp >= 0 ? iExp : toks.length;
  const inteira = toks.slice(0, iDec >= 0 ? iDec : fimMantissa);
  const decimal = iDec >= 0 ? toks.slice(iDec + 1, fimMantissa) : [];
  const lugaresDec = decimal.filter(lugar).length;
  const lugaresInt = inteira.filter(lugar);
  // "." entre lugares de dígito agrupa; "." no fim divide por mil.
  const iUltimoInt = inteira.reduce((u, t, i) => (lugar(t) ? i : u), -1);
  let milhar = false;
  inteira.forEach((t, i) => { if ("cod" in t && t.cod === ".") { if (i < iUltimoInt) milhar = true; else if (iUltimoInt >= 0) x /= 1000; } });
  let expoente = "";
  if (iExp >= 0) {
    const e = x === 0 ? 0 : Math.floor(Math.log10(x)) - Math.max(0, lugaresInt.length - 1);
    x /= 10 ** e;
    const digitos = toks.slice(iExp + 1).filter(lugar).length;
    const sinal = e < 0 ? "-" : (toks[iExp] as { cod: string }).cod[1] === "+" ? "+" : "";
    expoente = "E" + sinal + String(Math.abs(e)).padStart(digitos, "0");
  }
  const fixo = x.toFixed(lugaresDec);
  const [pInt, pDec = ""] = fixo.split(".");
  let digitos = pInt === "0" ? "" : pInt;
  const minimo = lugaresInt.filter((t) => (t as { cod: string }).cod === "0").length;
  digitos = digitos.padStart(minimo, "0");
  // Parte inteira: preenche os lugares da direita para a esquerda; o que sobra vai no primeiro.
  let textoInt: string;
  if (milhar || !inteira.some((t) => "lit" in t)) {
    const corpo = milhar ? agrupar(digitos) : digitos;
    const primeiro = inteira.findIndex(lugar);
    const antes = inteira.slice(0, Math.max(0, primeiro)).map((t) => ("lit" in t ? t.lit : t.cod === "%" ? "%" : "")).join("");
    const depois = inteira.slice(iUltimoInt + 1).map((t) => ("lit" in t ? t.lit : t.cod === "%" ? "%" : "")).join("");
    textoInt = primeiro < 0 ? inteira.map((t) => ("lit" in t ? t.lit : t.cod === "%" ? "%" : "")).join("") + corpo : antes + corpo + depois;
  } else {
    let k = digitos.length;
    const partes: string[] = [];
    for (let i = inteira.length - 1; i >= 0; i--) {
      const t = inteira[i];
      if ("lit" in t) { partes.unshift(t.lit); continue; }
      if (t.cod === "%") { partes.unshift("%"); continue; }
      if (!lugar(t)) continue;
      let s = k > 0 ? digitos[--k] : t.cod === "0" ? "0" : t.cod === "?" ? " " : "";
      if (i === inteira.findIndex(lugar) && k > 0) { s = digitos.slice(0, k) + s; k = 0; }
      partes.unshift(s);
    }
    textoInt = partes.join("");
  }
  // Parte decimal: da esquerda para a direita; # e ? no fim somem se forem zeros.
  let textoDec = "";
  if (iDec >= 0) {
    const ds = pDec.split("");
    let j = 0;
    const saida: { s: string; opcional: boolean }[] = [];
    for (const t of decimal) {
      if ("lit" in t) { saida.push({ s: t.lit, opcional: false }); continue; }
      if (t.cod === "%") { saida.push({ s: "%", opcional: false }); continue; }
      if (!lugar(t)) continue;
      const d = ds[j++] ?? "0";
      saida.push({ s: d === "0" && t.cod !== "0" ? (t.cod === "?" ? " " : "") : d, opcional: t.cod !== "0" });
    }
    // Os # do fim só aparecem se houver dígito diferente de zero depois deles.
    let fim = saida.length;
    for (let i = saida.length - 1; i >= 0 && saida[i].opcional; i--) if (saida[i].s !== "") break; else fim = i;
    textoDec = "," + saida.slice(0, fim).map((p) => p.s).join("") + saida.slice(fim).map((p) => p.s).join("");
  }
  const sufixo = iExp >= 0 ? expoente + toks.slice(iExp + 1).filter((t) => "lit" in t).map((t) => (t as { lit: string }).lit).join("") : "";
  const zero = /^0*$/.test((digitos + pDec).replace(/\D/g, ""));
  return (comSinal && n < 0 && !zero ? "-" : "") + textoInt + textoDec + sufixo;
}

/** O valor já convertido em número (`n`) com o código de formato `f`. */
export function formatarComCodigo(n: number, f: string): string {
  const secoes = separarSecoes(f);
  let secao = secoes[0], comSinal = true;
  if (n < 0 && secoes.length >= 2 && secoes[1] !== "") { secao = secoes[1]; comSinal = false; }
  else if (n === 0 && secoes.length >= 3) secao = secoes[2];
  const toks = tokenizar(secao);
  const codigos = toks.filter((t): t is { cod: string } => "cod" in t).map((t) => t.cod);
  if (codigos.length && codigos.some(ehData) && !codigos.some((c) => /^[0#?]$/.test(c)))
    return formatarData(comSinal ? n : Math.abs(n), toks);
  // Sem código de número: "a" literal, "General"… ficam como texto.
  if (!codigos.some((c) => /^[0#?]$/.test(c))) return toks.map((t) => ("lit" in t ? t.lit : t.cod)).join("");
  return formatarNumero(n, toks, comSinal);
}
