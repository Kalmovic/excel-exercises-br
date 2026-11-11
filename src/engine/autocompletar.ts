import { CATALOGO, funcaoDoCatalogo, type FuncaoCatalogo } from "./catalogo";

/** Tira acentos e caixa: "média" e "MEDIA" casam com "MÉDIA". */
const chave = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

const LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ_]/;
const IDENT_NO_FIM = /[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*$/;

/** Índices de `texto` que estão dentro de aspas (até `fim`). */
function dentroDeAspas(texto: string, fim: number) {
  let aberto = false;
  for (let i = 0; i < fim; i++) if (texto[i] === '"') aberto = !aberto;
  return aberto;
}

export type Palavra = { inicio: number; prefixo: string };

/** Nome de função sendo digitado logo antes do cursor (só em fórmulas, fora de aspas). */
export function palavraNoCursor(texto: string, cursor: number): Palavra | null {
  if (!texto.startsWith("=") || dentroDeAspas(texto, cursor)) return null;
  const antes = texto.slice(0, cursor);
  const m = IDENT_NO_FIM.exec(antes);
  if (!m) return null;
  const inicio = cursor - m[0].length;
  // "$B" ou "B$" são referências; número antes ("2E") não é nome.
  const anterior = texto[inicio - 1];
  if (anterior === "$" || /[0-9]/.test(anterior ?? "")) return null;
  // Logo depois do cursor já vem mais nome ou "(": o aluno está editando no meio.
  const depois = texto[cursor];
  if (depois && (LETRA.test(depois) || depois === "(")) return null;
  return { inicio, prefixo: m[0] };
}

/** Funções que começam com o prefixo (sem diferenciar acento e caixa). */
export function sugestoes(prefixo: string, limite = 8): FuncaoCatalogo[] {
  const p = chave(prefixo);
  if (!p) return [];
  return CATALOGO.filter((x) => chave(x.nome).startsWith(p))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/** Troca o prefixo pelo nome completo e abre o parêntese. */
export function completar(texto: string, cursor: number, nome: string) {
  const w = palavraNoCursor(texto, cursor);
  if (!w) return { texto, cursor };
  const novo = texto.slice(0, w.inicio) + nome + "(" + texto.slice(cursor);
  return { texto: novo, cursor: w.inicio + nome.length + 1 };
}

export type FuncaoAtual = { funcao: FuncaoCatalogo; argumento: number };

/** Função cujos parênteses envolvem o cursor, e em qual argumento ele está (0 = primeiro). */
export function funcaoNoCursor(texto: string, cursor: number): FuncaoAtual | null {
  if (!texto.startsWith("=")) return null;
  const pilha: { nome: string | null; arg: number }[] = [];
  let aspas = false;
  for (let i = 1; i < cursor; i++) {
    const ch = texto[i];
    if (ch === '"') aspas = !aspas;
    if (aspas) continue;
    if (ch === "(") {
      const m = IDENT_NO_FIM.exec(texto.slice(0, i).trimEnd());
      pilha.push({ nome: m ? m[0] : null, arg: 0 });
    } else if (ch === ")") pilha.pop();
    else if (ch === ";" && pilha.length) pilha[pilha.length - 1].arg++;
  }
  for (let k = pilha.length - 1; k >= 0; k--) {
    const { nome, arg } = pilha[k];
    if (nome === null) continue; // parêntese de conta, como em =(A1+B1)*2: olha o de fora
    const funcao = funcaoDoCatalogo(nome);
    return funcao ? { funcao, argumento: arg } : null;
  }
  return null;
}

/**
 * Qual argumento da assinatura destacar. Em funções que repetem argumentos
 * (`...`), passar do fim destaca o último antes das reticências (ou o par).
 */
export function argumentoDestacado(funcao: FuncaoCatalogo, argumento: number): number {
  const n = funcao.args.length;
  if (argumento < n && funcao.args[argumento] !== "...") return argumento;
  const repete = funcao.args[n - 1] === "...";
  if (!repete) return -1;
  const fixos = n - 1;
  // Ex.: SES(teste1; valor1; ...) repete os dois últimos; SOMA(núm1; [núm2]; ...) repete o último.
  const bloco = funcao.args.filter((a) => /1\]?$/.test(a)).length >= 2 ? 2 : 1;
  const inicioBloco = fixos - bloco;
  return inicioBloco + ((argumento - inicioBloco) % bloco);
}

// --- F4 --------------------------------------------------------------------

const REF = /\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/g;

function ciclar(ref: string): string {
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(ref)!;
  const [, c, col, l, lin] = m;
  // B2 → $B$2 → B$2 → $B2 → B2, como no Excel.
  if (!c && !l) return `$${col}$${lin}`;
  if (c && l) return `${col}$${lin}`;
  if (!c && l) return `$${col}${lin}`;
  return `${col}${lin}`;
}

/**
 * F4: alterna os `$` da referência onde está o cursor (ou logo antes dele).
 * Num intervalo (B2:B7), as duas pontas mudam juntas.
 */
export function alternarReferencia(texto: string, cursor: number) {
  if (!texto.startsWith("=")) return null;
  for (const m of texto.matchAll(REF)) {
    const ini = m.index!;
    const fim = ini + m[0].length;
    if (cursor < ini || cursor > fim) continue;
    if (dentroDeAspas(texto, ini)) continue;
    // Faz parte de um nome maior (ex.: "LOG10" ou "CONT.SE1")?
    if (LETRA.test(texto[ini - 1] ?? "") || /[A-Za-z0-9_.(]/.test(texto[fim] ?? "")) continue;
    const partes = m[0].split(":");
    const novo = partes.map(ciclar).join(":");
    return { texto: texto.slice(0, ini) + novo + texto.slice(fim), cursor: ini + novo.length };
  }
  return null;
}
