import { paraEndereco, type Intervalo } from "@/engine/address";
import type { ValorCelula } from "@/engine/format";
import { funcoesUsadas } from "@/engine/formula";
import { ptBR } from "@/engine/ptBR";
import { referenciasDaFormula } from "@/engine/referencias";

/**
 * Feedback específico: compara a fórmula do aluno com a de referência (e o
 * valor obtido com o esperado) e devolve UMA dica concreta, ou null quando
 * não reconhece o erro. Base barata para um tutor: só regras, sem IA.
 */

const pt = (canonico: string) => (ptBR.functions as Record<string, string>)[canonico] ?? canonico;
const txt = (i: Intervalo) => {
  const a = paraEndereco(i.inicio);
  const b = paraEndereco(i.fim);
  return a === b ? a : `${a}:${b}`;
};
const multi = (i: Intervalo) => i.inicio.linha !== i.fim.linha || i.inicio.coluna !== i.fim.coluna;

/** Texto fora de aspas, para procurar operadores sem cair em critérios como ">1000". */
function semAspas(f: string) {
  return f.replace(/"(?:[^"]|"")*"/g, '""');
}

/** Dica comparando os intervalos (para onde, onde começa, coluna errada). */
function dicaDeIntervalo(aluno: string, ref: string): string | null {
  const ia = referenciasDaFormula(aluno).map((r) => r.intervalo).filter(multi);
  const ir = referenciasDaFormula(ref).map((r) => r.intervalo).filter(multi);
  for (let k = 0; k < Math.min(ia.length, ir.length); k++) {
    const a = ia[k];
    const r = ir[k];
    const mesmaColuna = a.inicio.coluna === r.inicio.coluna && a.fim.coluna === r.fim.coluna;
    const mesmaLinha = a.inicio.linha === r.inicio.linha && a.fim.linha === r.fim.linha;
    if (mesmaColuna && mesmaLinha) continue;
    if (mesmaColuna) {
      if (a.inicio.linha === r.inicio.linha && a.fim.linha < r.fim.linha)
        return `Seu intervalo ${txt(a)} termina cedo demais: confira até onde vão os dados que o enunciado pede.`;
      if (a.inicio.linha === r.inicio.linha && a.fim.linha > r.fim.linha)
        return `Seu intervalo ${txt(a)} vai longe demais: ele inclui linhas que não fazem parte do que o enunciado pede.`;
      if (a.inicio.linha === r.inicio.linha - 1 && a.fim.linha === r.fim.linha)
        return `Seu intervalo ${txt(a)} inclui o cabeçalho da coluna. Confira onde os dados começam.`;
      if (a.inicio.linha > r.inicio.linha) return `Seu intervalo ${txt(a)} começa tarde: ficou dado de fora no começo.`;
      return `Confira o intervalo ${txt(a)}: ele cobre exatamente os dados que o enunciado pede?`;
    }
    if (mesmaLinha) return `O intervalo ${txt(a)} está na coluna errada. Confira em que coluna estão os dados que você quer usar.`;
  }
  return null;
}

/** Dica quando o resultado tem uma relação reconhecível com o esperado. */
function dicaDeValor(obtido: ValorCelula, esperado: ValorCelula): string | null {
  if (typeof obtido !== "number" || typeof esperado !== "number" || esperado === 0) return null;
  const perto = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);
  if (perto(obtido, -esperado)) return "O valor está certo, mas o sinal está trocado.";
  if (perto(obtido, esperado * 100))
    return "O resultado está 100 vezes maior. Lembre que o formato % já multiplica a exibição por 100.";
  if (perto(obtido, esperado / 100)) return "O resultado está 100 vezes menor. Confira como a porcentagem entrou na conta.";
  if (obtido !== 0 && perto(1 / obtido, esperado)) return "Confira a ordem da divisão: o que vai em cima e o que vai embaixo?";
  if (Math.abs(obtido - esperado) < 0.01) return "Quase: a diferença está nas casas decimais. Releia o enunciado sobre arredondamento.";
  return null;
}

function dicaDeOperador(aluno: string, ref: string): string | null {
  const a = semAspas(aluno);
  const r = semAspas(ref);
  const tem = (s: string, op: string) => new RegExp(op === ">" ? ">(?!=)" : op === "<" ? "<(?![=>])" : op).test(s);
  const sinal = "Confira o sinal de comparação: o valor exato do limite deve entrar ou ficar de fora?";
  if (tem(r, ">=") && !tem(a, ">=") && tem(a, ">")) return sinal;
  if (tem(r, "<=") && !tem(a, "<=") && tem(a, "<")) return sinal;
  if (tem(r, ">") && !tem(r, ">=") && tem(a, ">=")) return sinal;
  if (tem(r, "<") && !tem(r, "<=") && tem(a, "<=")) return sinal;
  return null;
}

function dicaDeBusca(aluno: string, ref: string): string | null {
  // PROCV/PROCH sem o 4º argumento quando a resposta usa busca exata
  const exata = /PROC[VH]\([^)]*;\s*FALSO\s*\)/i.test(ref);
  const m = /PROC([VH])\(([^()]*)\)/i.exec(aluno);
  if (exata && m && m[2].split(";").length === 3)
    return `Confira o último argumento do PROC${m[1].toUpperCase()}: sem ele, a busca é aproximada. É esse o tipo de busca que você quer?`;
  const col = (f: string) => /PROC[VH]\([^;]*;[^;]*;\s*(\d+)/i.exec(f)?.[1];
  const ca = col(aluno);
  const cr = col(ref);
  if (ca && cr && ca !== cr)
    return "Confira o número da coluna no PROCV: conte as colunas a partir da primeira coluna da tabela que você selecionou.";
  return null;
}

/** Referências de célula única da resposta (critério, taxa, meta) que o aluno não usou. */
function dicaDeCelulaIgnorada(aluno: string, ref: string): string | null {
  const doAluno = referenciasDaFormula(aluno).map((r) => r.intervalo);
  const cobre = (i: Intervalo, l: number, c: number) =>
    l >= i.inicio.linha && l <= i.fim.linha && c >= i.inicio.coluna && c <= i.fim.coluna;
  for (const r of referenciasDaFormula(ref)) {
    if (multi(r.intervalo)) continue;
    const { linha, coluna } = r.intervalo.inicio;
    if (!doAluno.some((i) => cobre(i, linha, coluna))) {
      const travada = /\$[A-Z]+\$\d+/i.test(r.texto);
      return travada
        ? "Sua fórmula não usa uma das células de que o cálculo depende. Se ela foi copiada de outra célula, alguma referência pode ter andado junto: precisava ficar parada?"
        : "Sua fórmula não usa uma das células que o enunciado indica. Use a referência da célula em vez de digitar o valor.";
    }
  }
  return null;
}

function dicaDeFuncao(aluno: string, ref: string): string | null {
  const fa = new Set(funcoesUsadas(aluno).filter((f) => f !== "TRUE" && f !== "FALSE"));
  const fr = funcoesUsadas(ref).filter((f) => f !== "TRUE" && f !== "FALSE");
  const faltam = fr.filter((f) => !fa.has(f));
  if (faltam.length === 0 || fa.size === 0) return null;
  const sobra = [...fa].filter((f) => !fr.includes(f));
  // Funções que resolvem o mesmo problema: trocar uma pela outra não é o erro.
  const familias = [
    ["IF", "IFS"],
    ["VLOOKUP", "HLOOKUP", "XLOOKUP", "INDEX", "MATCH"],
    ["CONCAT", "CONCATENATE"],
    ["SUMIF", "SUMIFS"],
    ["COUNTIF", "COUNTIFS"],
    ["AVERAGEIF", "SUMIF", "COUNTIF"],
  ];
  const mesmaFamilia = (x: string, y: string) => familias.some((f) => f.includes(x) && f.includes(y));
  if (sobra.length === 1 && faltam.length === 1 && !mesmaFamilia(sobra[0], faltam[0]))
    return `Confira a função: ${pt(sobra[0])} faz o cálculo que o enunciado pede?`;
  return null;
}

export type Diagnostico = {
  formulaAluno: string;
  formulaReferencia: string;
  obtido: ValorCelula;
  esperado: ValorCelula;
};

/** Para quem errou o valor ("valor"): a dica mais provável. */
export function diagnosticarValor(d: Diagnostico): string | null {
  const aluno = d.formulaAluno.startsWith("=") ? d.formulaAluno : "";
  return (
    (aluno && dicaDeIntervalo(aluno, d.formulaReferencia)) ||
    (aluno && dicaDeOperador(aluno, d.formulaReferencia)) ||
    (aluno && dicaDeBusca(aluno, d.formulaReferencia)) ||
    (aluno && dicaDeFuncao(aluno, d.formulaReferencia)) ||
    dicaDeValor(d.obtido, d.esperado) ||
    (aluno && dicaDeCelulaIgnorada(aluno, d.formulaReferencia)) ||
    null
  );
}

/** Para quem acertou o valor mas não acompanha os dados ("valor-fixo"). */
export function diagnosticarValorFixo(formulaAluno: string, formulaReferencia: string): string | null {
  if (!formulaAluno.startsWith("=")) return null;
  if (/^=[\d\s.,+\-*/^()%]+$/.test(formulaAluno))
    return "Sua fórmula só tem números digitados. Use as referências das células, para o resultado acompanhar os dados.";
  return dicaDeCelulaIgnorada(formulaAluno, formulaReferencia);
}

/**
 * Fórmula que parece ter recebido uma fórmula nova escrita depois da antiga, como
 * `=SOMA(B2;B7)=SOMA(B2:B7)` (no celular, o toque duplo abria a edição com o cursor
 * no fim). Critério estreito, para não pegar comparações de verdade: um `=` no nível
 * de fora (fora de aspas e de parênteses) com uma chamada de função inteira antes
 * (`SOMA(B2;B7)`) e, logo depois, o nome de uma função abrindo parêntese. `<=` e `>=`
 * nunca casam (o que vem antes termina em `<`/`>`). Quem chama ainda confere que o
 * resultado é lógico e que o esperado não é.
 */
export function pareceTextoAnexado(formula: string): boolean {
  if (!formula.startsWith("=")) return false;
  const f = formula.slice(1);
  let nivel = 0;
  let aspas: string | null = null;
  for (let i = 0; i < f.length; i++) {
    const ch = f[i];
    if (aspas) {
      if (ch === aspas) aspas = null;
      continue;
    }
    if (ch === '"' || ch === "'") aspas = ch;
    else if (ch === "(") nivel++;
    else if (ch === ")") nivel--;
    else if (ch === "=" && nivel === 0) {
      const antes = f.slice(0, i).trim();
      if (chamadaUnica(antes) && FUNCAO_ABRINDO.test(f.slice(i + 1))) return true;
    }
  }
  return false;
}

const FUNCAO_ABRINDO = /^\s*[A-ZÀ-Ý_][A-ZÀ-Ý0-9_.]*\s*\(/i;

/** `SOMA(B2;B7)`: uma chamada de função só, do nome ao último parêntese (o que já estava na célula). */
function chamadaUnica(s: string): boolean {
  if (!FUNCAO_ABRINDO.test(s) || !s.endsWith(")")) return false;
  let nivel = 0;
  let aspas: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (aspas) {
      if (ch === aspas) aspas = null;
      continue;
    }
    if (ch === '"' || ch === "'") aspas = ch;
    else if (ch === "(") nivel++;
    else if (ch === ")" && --nivel === 0) return i === s.length - 1;
  }
  return false;
}

/** A mensagem para `pareceTextoAnexado` (texto puro: as falhas não passam pelo TextoRico). */
export function mensagemTextoAnexado(formula: string): string {
  return `Sua fórmula ficou "${formula}": parece que o texto novo foi escrito depois do que já estava na célula. Apague o conteúdo antes de digitar.`;
}
