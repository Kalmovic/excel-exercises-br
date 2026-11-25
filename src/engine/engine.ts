import {
  dinamicaSchema,
  graficoSchema,
  regraCondicionalSchema,
  validacaoDadosSchema,
  type Dinamica,
  type Exercicio,
  type Formato,
  type Grafico,
  type Ordenacao,
  type Permutacao,
  type Recursos,
  type RecursosDeUmaAba,
  type RegraCondicional,
  type ValidacaoDados,
} from "@/content/schema";
import {
  colunaParaLetras,
  deEndereco,
  deIntervalo,
  intervaloParaTexto,
  letrasParaColuna,
  paraEndereco,
  posicoes,
  type Intervalo,
  type Pos,
} from "./address";
import { formatarValor, type TipoDetalhado, type ValorCelula } from "./format";
import { diagnosticarSintaxe, fecharParenteses, funcoesUsadas, validarIdioma, type Validacao } from "./formula";
import { lerEntrada, normalizarFormula } from "./motor/entrada";
import { Calculo, FUNCOES, type Conteudo } from "./motor/nucleo";
import { analisar, type No } from "./motor/parser";
import { referenciasDaFormula } from "./referencias";
import { compararParaClassificar } from "./classificar";
import { calcularDinamica } from "./dinamica";
import { calcularCondicionais, type EstiloCelula } from "./condicional";
import { dadosDoGrafico, type DadosGrafico } from "./grafico";
import { ERRO_PADRAO, itensDaFonte, lerLimite, passaNaValidacao } from "./validacao";

export type Grade = Exercicio["grade"];

export type Alteracao = { endereco: string; bruto: string };

type FotoFormato = { end: string; formato?: Formato; doAluno?: Formato };
/** `antes`/`depois` são textos fiéis (ver `fiel`): regravá-los devolve o mesmo tipo (R$, hora…). */
type Mudanca = { end: string; antes?: string; depois?: string };
/** Retrato completo (planilhas do simulador são pequenas): usado por classificar e filtrar. */
type Foto = {
  /** Texto fiel de cada célula preenchida. */
  textos: Map<string, string>;
  formatos: Map<string, Formato>;
  formatosAluno: Map<string, Formato>;
  negritos: Set<string>;
  bloqueadas: Set<string>;
  preenchidasEditaveis: Set<string>;
  filtro: Filtro | null;
  permutacoes: Permutacao[];
  dinamicas: Dinamica[];
  condicionais: RegraCondicional[];
  graficos: Grafico[];
  validacoes: ValidacaoDados[];
};
type AcaoHistorico =
  | { tipo: "celulas"; mudancas: Mudanca[] }
  | { tipo: "formato"; antes: FotoFormato[]; depois: FotoFormato[] }
  | { tipo: "estado"; antes: Foto; depois: Foto };

/** AutoFiltro: a primeira linha do intervalo é o cabeçalho; critérios por letra da coluna. */
export type Filtro = { intervalo: Intervalo; criterios: Record<string, string[]> };

export { compararParaClassificar };

/** O que cada tabela dinâmica ocupa na grade agora (e por que não aparece, se for o caso). */
type SituacaoDinamica = { area: Intervalo; vazia: boolean; erro: string | null };

const contemPos = (i: Intervalo, p: Pos) =>
  p.linha >= i.inicio.linha && p.linha <= i.fim.linha && p.coluna >= i.inicio.coluna && p.coluna <= i.fim.coluna;

const pt = (n: number) => String(Math.round(n * 1e10) / 1e10).replace(".", ",");
const dois = (n: number) => String(n).padStart(2, "0");

/** Ctrl+Z: até 200 ações e, somando todas, até tantas células guardadas (retratos contam as duas fotos). */
const MAX_ACOES_HISTORICO = 200;
const MAX_CELULAS_HISTORICO = 60_000;
/** Classificações em intervalos diferentes, alternadas, que o progresso consegue guardar. */
const MAX_PERMUTACOES = 20;
/**
 * Orçamento da formatação condicional por atualização: uma célula de regra de
 * fórmula custa 20, as outras 1. Cabem as regras de qualquer exercício (a
 * grade maior tem 1.300 células); um conjunto malicioso não trava a tela.
 */
const ORCAMENTO_CONDICIONAL = 60_000;

const mesmoValor = (a: unknown, b: unknown) =>
  a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= Math.abs(b) * 1e-12) || JSON.stringify(a) === JSON.stringify(b);

/** Permutação composta: primeiro `a`, depois `b` (as duas relativas ao mesmo intervalo). */
const compor = (a: number[], b: number[]) => b.map((i) => a[i]);

/** Primeira mensagem do zod, para recusar algo que a tela produziu fora dos limites. */
function mensagemDoSchema(erro: { issues: { path: PropertyKey[]; message: string; code: string }[] }, nomes: Record<string, string>): string {
  const i = erro.issues[0];
  const campo = nomes[String(i?.path[0] ?? "")];
  const max = i && "maximum" in i ? Number((i as { maximum: unknown }).maximum) : null;
  if (campo && max !== null && i.code === "too_big") return `${campo} pode ter no máximo ${max} caracteres.`;
  return campo ? `${campo} não é válido.` : "Configuração inválida.";
}

/** Fórmula com erro de escrita vinda do conteúdo (pegadinhas): mostra o texto e calcula como erro. */
const ERRO_DE_ESCRITA: No = { t: "erro", v: "#NOME?" };

/** Funções usadas na fórmula que o motor ainda não calcula. */
function naoImplementadas(no: No, out = new Set<string>()): Set<string> {
  if (no.t === "fn") {
    if (!FUNCOES[no.nome]) out.add(no.nome);
    no.args.forEach((a) => naoImplementadas(a, out));
  } else if (no.t === "un" || no.t === "pct") naoImplementadas(no.x, out);
  else if (no.t === "bin") { naoImplementadas(no.a, out); naoImplementadas(no.b, out); }
  return out;
}

/**
 * Adaptador do motor de fórmulas. A UI só conversa com esta classe; o cálculo
 * é do motor próprio (`./motor`), que entende pt-BR direto.
 *
 * Também funciona como "store externo" para `useSyncExternalStore`.
 */
export class Planilha {
  readonly linhas: number;
  readonly colunas: number;
  /** Cálculo (compartilhado entre as abas de uma Pasta) e o índice desta aba nele. */
  private calculo: Calculo;
  readonly aba: number;
  /** O que aparece na barra de fórmulas de cada célula preenchida (chave "linha,coluna"). */
  private textos = new Map<string, string>();
  private versao = 0;
  private ouvintes = new Set<() => void>();
  private bloqueadas = new Set<string>();
  private negritos = new Set<string>();
  private formatos = new Map<string, Formato>();
  /** Formatos aplicados pelo aluno (barra R$ / %), para salvar no progresso. */
  private formatosAluno = new Map<string, Formato>();
  /** Histórico do Ctrl+Z: conteúdo das células e formatação, na ordem em que aconteceram. */
  private historico: AcaoHistorico[] = [];
  private refeitos: AcaoHistorico[] = [];
  private area: Intervalo | null = null; // última área copiada
  private filtro: Filtro | null = null;
  /** O conteúdo de cada célula preenchida (com o tipo digitado: R$, %, hora…), ao lado do texto da barra. */
  private conteudosCel = new Map<string, Conteudo>();
  /** Células guardadas no histórico (para o limite de memória). */
  private pesoHistorico = 0;
  /**
   * Classificações feitas desde o estado inicial, pelo efeito: a permutação das
   * linhas de cada intervalo (é isso que o progresso guarda).
   */
  private permutacoes: Permutacao[] = [];
  /** Linhas escondidas pelo filtro, recalculadas a cada mudança. */
  private ocultas = new Set<number>();
  /** Tabelas dinâmicas (configuração) e o que cada uma ocupa na grade agora. */
  private dinamicas: Dinamica[] = [];
  private saidasDinamicas: SituacaoDinamica[] = [];
  /** Células escritas pelas tabelas dinâmicas ("linha,coluna"): bloqueadas, fora do progresso. */
  private celulasDinamicas = new Set<string>();
  private formatosDinamicas = new Map<string, Formato>();
  private negritosDinamicas = new Set<string>();
  /** O exercício já começa com filtro / tabela dinâmica: o progresso precisa gravar quando o aluno os remove. */
  private inicial = { filtro: false, dinamicas: false, condicionais: false, graficos: false, validacoes: false };
  private validacoesLista: ValidacaoDados[] = [];
  private graficosLista: Grafico[] = [];
  /** Células editáveis que o exercício já traz preenchidas (para gravar quando o aluno as apaga). */
  private preenchidasEditaveis = new Set<string>();
  /** Regras de formatação condicional (a última tem prioridade) e o estilo que cada célula ganhou. */
  private condicionais: RegraCondicional[] = [];
  private estilos = new Map<string, EstiloCelula>();

  constructor(
    grade: Grade,
    extras: { formatos?: Record<string, Grade["celulas"][string]["formato"]> } = {},
    vinculo?: { calculo: Calculo; aba: number },
  ) {
    this.linhas = grade.linhas;
    this.colunas = grade.colunas;
    this.calculo = vinculo?.calculo ?? new Calculo();
    this.aba = vinculo?.aba ?? 0;
    // Numa Pasta, quem distribui por aba é ela (cada aba tem o seu filtro).
    if (!vinculo) {
      this.calculo.linhaOculta = (l) => this.ocultas.has(l);
      // Até onde vão a coluna inteira (A:A) e a linha inteira (1:1): a grade do exercício.
      this.calculo.limites = { linhas: grade.linhas, colunas: grade.colunas };
    }
    for (const [end, cel] of Object.entries(grade.celulas)) {
      this.gravar(deEndereco(end), cel.entrada);
      if (cel.bloqueada ?? cel.entrada !== "") this.bloqueadas.add(end);
      else if (cel.entrada.trim() !== "") this.preenchidasEditaveis.add(end);
      if (cel.formato) this.formatos.set(end, cel.formato);
      if (cel.negrito) this.negritos.add(end);
    }
    for (const [end, f] of Object.entries(extras.formatos ?? {})) if (f) this.formatos.set(end, f);
    if (grade.recursos) {
      this.inicial = {
        filtro: !!grade.recursos.filtro,
        dinamicas: !!grade.recursos.dinamicas?.length,
        condicionais: !!grade.recursos.condicionais?.length,
        graficos: !!grade.recursos.graficos?.length,
        validacoes: !!grade.recursos.validacoes?.length,
      };
      this.aplicarRecursos(grade.recursos, { inicial: true });
    }
  }

  /** Monta a planilha de um exercício, aplicando também os formatos das células-alvo. */
  /**
   * A planilha do exercício. Com várias abas, devolve a primeira de uma Pasta
   * (as outras ficam em `planilha.pasta`): correção, progresso e certificado
   * continuam conversando com uma Planilha só.
   */
  static deExercicio(ex: Exercicio) {
    const formatos = ex.type === "formula" ? Object.fromEntries(ex.alvos.map((a) => [a.celula, a.formato])) : {};
    return Planilha.deGrades(ex.grade, ex.abas, formatos);
  }

  /** Primeira aba (`grade`) e as outras (`abas`), já ligadas numa Pasta quando houver mais de uma. */
  static deGrades(grade: Grade, abas: Exercicio["abas"], formatos: Record<string, Formato | undefined> = {}) {
    if (!abas?.length) return new Planilha(grade, { formatos });
    return new Pasta([{ nome: grade.nome ?? "Planilha1", grade, formatos }, ...abas.map((a) => ({ nome: a.nome, grade: a.grade }))]).abas[0];
  }

  // --- várias abas ----------------------------------------------------------

  /** A pasta de trabalho, quando o exercício tem várias abas. */
  pasta?: Pasta;
  /** Chamado depois de cada mudança (a Pasta usa para avisar as outras abas). */
  aoMudar?: () => void;

  /** Outra aba mudou: fórmulas daqui podem depender dela. Recalcula o que é derivado e avisa a tela. */
  refrescar() {
    this.atualizarDerivados();
    this.versao++;
    this.ouvintes.forEach((fn) => fn());
  }

  /**
   * A fórmula fica em maiúsculas ao ser gravada (`=VENDAS!B2`); o nome da aba
   * volta para a grafia dela (`=Vendas!B2`), como o Excel mostra.
   */
  private grafarAbas(formula: string): string {
    const nomes = this.calculo.abas;
    if (nomes.length < 2) return formula;
    // O nome simples não pode vir colado a "#" (é um erro: #REF!, #VALOR!) nem a outro identificador.
    const grafia = (nome: string) => { const i = this.calculo.indiceDaAba(nome); return i < 0 ? nome : nomes[i]; };
    return formula.replace(/("(?:[^"]|"")*")|'((?:[^':]|'')+):((?:[^':]|'')+)'!|(?<![#A-Za-zÀ-ÖØ-öø-ÿ0-9_.])([A-ZÀ-ÖØ-Þ_][A-ZÀ-ÖØ-Þ0-9_.]*):([A-ZÀ-ÖØ-Þ_][A-ZÀ-ÖØ-Þ0-9_.]*)!|'((?:[^']|'')+)'!|(?<![#A-Za-zÀ-ÖØ-öø-ÿ0-9_.])([A-ZÀ-ÖØ-Þ_][A-ZÀ-ÖØ-Þ0-9_.]*)!/g, (m, texto, ci1, ci2, si1, si2, citado, simples) => {
      if (texto) return texto;
      // Referência 3D: Jan:Mar! e 'Jan 1:Mar 1'!
      if (ci1 !== undefined) return `'${grafia(ci1.replace(/''/g, "'")).replace(/'/g, "''")}:${grafia(ci2.replace(/''/g, "'")).replace(/'/g, "''")}'!`;
      if (si1 !== undefined) return `${grafia(si1)}:${grafia(si2)}!`;
      const nome = (citado ?? simples).replace(/''/g, "'");
      const i = this.calculo.indiceDaAba(nome);
      if (i < 0) return m;
      return citado !== undefined ? `'${nomes[i].replace(/'/g, "''")}'!` : `${nomes[i]}!`;
    });
  }

  /** "Vendas!A1" → a Planilha da aba Vendas e "A1". Sem "!", esta aba. */
  private daAba(end: string): [Planilha, string] | null {
    const i = end.lastIndexOf("!");
    if (i < 0) return [this, end];
    const alvo = this.pasta?.aba(end.slice(0, i).replace(/^'(.*)'$/, "$1"));
    return alvo ? [alvo, end.slice(i + 1)] : null;
  }

  // --- store externo -------------------------------------------------------

  subscribe = (fn: () => void) => {
    this.ouvintes.add(fn);
    return () => {
      this.ouvintes.delete(fn);
    };
  };

  getVersion = () => this.versao;

  private notificar() {
    this.atualizarDerivados();
    this.versao++;
    this.ouvintes.forEach((fn) => fn());
    this.aoMudar?.();
  }

  // --- leitura -------------------------------------------------------------

  private pos(end: string | Pos): Pos {
    return typeof end === "string" ? deEndereco(end) : end;
  }
  private chave(end: string | Pos) {
    const p = this.pos(end);
    return `${p.linha},${p.coluna}`;
  }

  valor(end: string | Pos): ValorCelula {
    const p = this.pos(end);
    return this.calculo.ler(p.linha, p.coluna, this.aba);
  }

  tipo(end: string | Pos): TipoDetalhado {
    const p = this.pos(end);
    return this.calculo.tipo(p.linha, p.coluna, this.aba);
  }

  /** Mensagem técnica do erro (o motor próprio já usa os nomes em português). */
  mensagemErro(end: string | Pos): string | undefined {
    const v = this.valor(end);
    return v !== null && typeof v === "object" ? v.erro : undefined;
  }

  /** O que aparece na barra de fórmulas. */
  bruto(end: string | Pos): string {
    const k = this.chave(end);
    // Tabela dinâmica: a barra de fórmulas mostra o valor, como no Excel.
    if (this.celulasDinamicas.has(k)) return this.exibicao(end);
    return this.textos.get(k) ?? "";
  }

  /**
   * A fórmula depende do próprio resultado (ex.: `=SOMA(B2:B8)` dentro de B8).
   * O Excel mostra 0 e um aviso, e é isso que reproduzimos na exibição.
   */
  circular(end: string | Pos): boolean {
    const v = this.valor(end);
    return v !== null && typeof v === "object" && v.erro === "#CIRC!";
  }

  /** Células com fórmula envolvidas em referência circular, em ordem de leitura. */
  celulasCirculares(): string[] {
    const out: string[] = [];
    for (let linha = 0; linha < this.linhas; linha++)
      for (let coluna = 0; coluna < this.colunas; coluna++) {
        const p = { linha, coluna };
        if (this.temFormula(p) && this.circular(p)) out.push(paraEndereco(p));
      }
    return out;
  }

  exibicao(end: string | Pos): string {
    const e = typeof end === "string" ? end : paraEndereco(end);
    if (this.circular(e)) return formatarValor(0, "NUMBER_RAW", this.formatoDe(e));
    return formatarValor(this.valor(e), this.tipo(e), this.formatoDe(e));
  }

  temFormula(end: string | Pos): boolean {
    const p = this.pos(end);
    return this.calculo.temFormula(p.linha, p.coluna, this.aba);
  }

  /** Célula preenchida por uma fórmula de array (FILTRO, ÚNICO…) que derramou. */
  derramada(end: string | Pos): boolean {
    const p = this.pos(end);
    return this.calculo.derramada(p.linha, p.coluna, this.aba);
  }

  funcoesUsadas(end: string | Pos): string[] {
    return funcoesUsadas(this.bruto(end));
  }

  bloqueada(end: string | Pos): boolean {
    if (typeof end === "string" && end.includes("!")) {
      const alvo = this.daAba(end);
      return !alvo || alvo[0].bloqueada(alvo[1]);
    }
    return this.bloqueadas.has(typeof end === "string" ? end : paraEndereco(end)) || this.daDinamica(end);
  }

  /** A célula é parte da saída de uma tabela dinâmica. */
  daDinamica(end: string | Pos): boolean {
    return this.celulasDinamicas.has(this.chave(end));
  }

  /** Por que a célula não pode ser editada (null se pode). */
  motivoBloqueio(end: string | Pos): string | null {
    if (this.daDinamica(end)) return "Não é possível alterar esta parte de uma tabela dinâmica. Mude os campos no painel Campos da Tabela Dinâmica.";
    if (this.bloqueada(end)) return "Esta célula faz parte dos dados do exercício e não pode ser alterada.";
    return null;
  }

  formatoDe(end: string | Pos): Formato | undefined {
    const e = typeof end === "string" ? end : paraEndereco(end);
    return this.formatos.get(e) ?? this.formatosDinamicas.get(e);
  }

  /**
   * Aplica um formato (barra R$ / %). Vale também para células bloqueadas:
   * a trava é do conteúdo, não da aparência.
   */
  formatar(intervalo: Intervalo, formato: Formato) {
    const fotos = this.fotosDeFormato(intervalo, formato);
    if (!fotos) return; // fora da planilha
    this.aplicarFormatos(fotos.depois);
    this.registrar({ tipo: "formato", ...fotos });
    this.notificar();
  }

  /** Antes e depois de formatar o intervalo (recortado na planilha; null se fica todo fora). */
  private fotosDeFormato(intervalo: Intervalo, formato: Formato): { antes: FotoFormato[]; depois: FotoFormato[] } | null {
    const int = this.recortar(intervalo);
    if (!int) return null;
    const antes: FotoFormato[] = [];
    const depois: FotoFormato[] = [];
    for (const p of posicoes(int)) {
      const end = paraEndereco(p);
      antes.push({ end, formato: this.formatos.get(end), doAluno: this.formatosAluno.get(end) });
      depois.push({ end, formato, doAluno: formato });
    }
    return { antes, depois };
  }

  private aplicarFormatos(fotos: FotoFormato[]) {
    for (const { end, formato, doAluno } of fotos) {
      if (formato) this.formatos.set(end, formato);
      else this.formatos.delete(end);
      if (doAluno) this.formatosAluno.set(end, doAluno);
      else this.formatosAluno.delete(end);
    }
  }

  /** Quantas células a ação guarda (o histórico tem limite de memória, não só de ações). */
  private static peso(acao: AcaoHistorico): number {
    if (acao.tipo === "celulas") return acao.mudancas.length + 1;
    if (acao.tipo === "formato") return acao.antes.length * 2 + 1;
    const foto = (f: Foto) =>
      f.textos.size + f.formatos.size + f.formatosAluno.size + f.negritos.size + f.bloqueadas.size + f.preenchidasEditaveis.size + 10;
    return foto(acao.antes) + foto(acao.depois);
  }

  private registrar(acao: AcaoHistorico) {
    this.historico.push(acao);
    this.pesoHistorico += Planilha.peso(acao);
    while (this.historico.length > 1 && (this.historico.length > MAX_ACOES_HISTORICO || this.pesoHistorico > MAX_CELULAS_HISTORICO))
      this.pesoHistorico -= Planilha.peso(this.historico.shift()!);
    this.refeitos = [];
  }

  /** Ações que o Ctrl+Z ainda desfaz e células guardadas nelas (para os testes de limite). */
  tamanhoDoHistorico(): { acoes: number; celulas: number } {
    return { acoes: this.historico.length, celulas: this.pesoHistorico };
  }

  /** Depois de restaurar o progresso salvo: Ctrl+Z não deve apagar o que foi restaurado. Vale para todas as abas. */
  limparHistorico() {
    for (const aba of this.pasta?.abas ?? [this]) {
      aba.historico = [];
      aba.refeitos = [];
      aba.pesoHistorico = 0;
    }
  }

  /**
   * Formatos aplicados pelo aluno (barra R$ / %), por célula. Na primeira aba
   * de uma Pasta, junta os das outras com o nome na frente ("Jan!B2").
   */
  formatosDoAluno(): Record<string, Formato> {
    const out: Record<string, Formato> = Object.fromEntries(this.formatosAluno);
    if (this.pasta && this.pasta.abas[0] === this)
      for (const aba of this.pasta.abas.slice(1))
        for (const [end, f] of aba.formatosAluno) out[`${this.pasta.nomeDe(aba)}!${end}`] = f;
    return out;
  }

  negrito(end: string): boolean {
    return this.negritos.has(end) || this.negritosDinamicas.has(end);
  }

  /** Conteúdo bruto de todas as células preenchidas (para correção e progresso). Derramadas não entram. */
  /**
   * O que o aluno escreveu (o que o progresso guarda e o certificado reenvia):
   * as células editáveis, e "" nas que o exercício trazia preenchidas e o
   * aluno apagou (sem isso, o valor original voltaria ao restaurar).
   */
  conteudosDoAluno(): Record<string, string> {
    const out: Record<string, string> = Object.fromEntries(Object.entries(this.conteudos()).filter(([end]) => !this.bloqueadas.has(end) && !this.daDinamica(end)));
    for (const end of this.preenchidasEditaveis) if (!(end in out) && !this.bloqueada(end)) out[end] = "";
    // Na primeira aba de uma Pasta, junta as outras com o nome na frente ("Vendas!A1").
    if (this.pasta && this.pasta.abas[0] === this)
      for (const aba of this.pasta.abas.slice(1))
        for (const [end, t] of Object.entries(aba.conteudosDoAluno())) out[`${this.pasta.nomeDe(aba)}!${end}`] = t;
    return out;
  }

  /**
   * Conteúdo de todas as células preenchidas, como texto fiel: regravado,
   * volta igual, com o tipo (`R$ 10` para moeda digitada, `'123` para texto).
   */
  conteudos(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of this.textos.keys()) {
      const [linha, coluna] = k.split(",").map(Number);
      out[paraEndereco({ linha, coluna })] = this.fiel(k);
    }
    return out;
  }

  /**
   * O texto que, gravado de novo, devolve exatamente o mesmo conteúdo. A barra
   * mostra `10` para "R$ 10,00" (como o Excel, que guarda o R$ no formato);
   * aqui sai `R$ 10`, senão o tipo se perde ao desfazer, classificar ou restaurar.
   */
  private fiel(k: string): string {
    const t = this.textos.get(k) ?? "";
    const c = this.conteudosCel.get(k);
    if (!c || "formula" in c) return t;
    const { valor: v, tipo } = c;
    let candidato = t;
    if (typeof v === "number") {
      if (tipo === "NUMBER_CURRENCY") candidato = `${v < 0 ? "-" : ""}R$ ${pt(Math.abs(v))}`;
      else if (tipo === "NUMBER_TIME") {
        const s = Math.round(v * 86400);
        candidato = `${dois(Math.floor(s / 3600))}:${dois(Math.floor((s % 3600) / 60))}${s % 60 ? `:${dois(s % 60)}` : ""}`;
      } else if (tipo === "NUMBER_RAW") candidato = String(v).replace(".", ",");
    }
    const volta = (x: string) => {
      try {
        const r = lerEntrada(x);
        return !!r && "valor" in r && r.tipo === tipo && mesmoValor(r.valor, v);
      } catch {
        return false;
      }
    };
    if (volta(candidato)) return candidato;
    if (volta(t)) return t;
    return typeof v === "string" ? `'${v}` : t;
  }

  // --- escrita -------------------------------------------------------------

  /** Grava sem validar (dados do exercício, restauração, colar). Devolve o texto fiel anterior. */
  private gravar(p: Pos, bruto: string): string | undefined {
    const k = `${p.linha},${p.coluna}`;
    const antes = this.textos.has(k) ? this.fiel(k) : undefined;
    let conteudo: Conteudo | null;
    let texto: string;
    try {
      conteudo = lerEntrada(bruto);
      texto = conteudo === null ? "" : "formula" in conteudo ? this.grafarAbas(normalizarFormula(bruto)) : this.textoDe(conteudo, bruto);
    } catch {
      conteudo = { formula: ERRO_DE_ESCRITA };
      texto = bruto.trim();
    }
    this.colocar(p, conteudo, texto);
    return antes;
  }

  /** Põe na célula um conteúdo já lido e o texto da barra (mover sem ler de novo: o tipo vai junto). */
  private colocar(p: Pos, conteudo: Conteudo | null, texto: string) {
    const k = `${p.linha},${p.coluna}`;
    if (texto === "" || conteudo === null) {
      this.calculo.definir(p.linha, p.coluna, null, this.aba);
      this.textos.delete(k);
      this.conteudosCel.delete(k);
    } else {
      this.calculo.definir(p.linha, p.coluna, conteudo, this.aba);
      this.textos.set(k, texto);
      this.conteudosCel.set(k, conteudo);
    }
  }

  /** A célula existe nesta planilha. */
  private naGrade(p: Pos): boolean {
    return Number.isInteger(p.linha) && Number.isInteger(p.coluna) && p.linha >= 0 && p.coluna >= 0 && p.linha < this.linhas && p.coluna < this.colunas;
  }

  /** Endereço sem aba ("B2") dentro da planilha, ou null. */
  private posNaGrade(end: string | Pos): Pos | null {
    try {
      const p = this.pos(end);
      return this.naGrade(p) ? p : null;
    } catch {
      return null;
    }
  }

  /** Como o Excel mostra na barra o valor digitado: 1234,5 para "R$ 1.234,50", 15/03/2026 para a data. */
  private textoDe(c: Conteudo, bruto: string): string {
    if ("formula" in c) return bruto;
    const v = c.valor;
    if (typeof v === "boolean") return v ? "VERDADEIRO" : "FALSO";
    if (typeof v !== "number") return typeof v === "string" ? v : bruto;
    if (c.tipo === "NUMBER_PERCENT") return `${pt(v * 100)}%`;
    if (c.tipo === "NUMBER_DATE") {
      const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
      return `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    }
    if (c.tipo === "NUMBER_TIME") {
      const s = Math.round(v * 86400);
      return `${dois(Math.floor(s / 3600))}:${dois(Math.floor((s % 3600) / 60))}`;
    }
    return pt(v);
  }

  private aplicar(mudancas: Mudanca[], lado: "antes" | "depois") {
    for (const m of mudancas) this.gravar(deEndereco(m.end), m[lado] ?? "");
  }

  /**
   * Valida (idioma pt-BR e escrita) e grava. Não grava se a validação falhar.
   * Validação de dados com alerta Aviso ou Informação: a recusa vem com
   * `alerta`, e a tela pergunta; `aceitarAlerta` grava mesmo assim (Sim/OK).
   */
  definir(end: string | Pos, bruto: string, opcoes?: { aceitarAlerta?: boolean }): Validacao {
    // Só dentro da grade do exercício (a tela, o servidor e os testes seguem a mesma regra).
    let p: Pos;
    try {
      p = this.pos(end);
    } catch {
      return { ok: false, mensagem: "Endereço inválido." };
    }
    if (!(p.linha >= 0 && p.coluna >= 0 && p.linha < this.linhas && p.coluna < this.colunas))
      return { ok: false, mensagem: "Esta célula fica fora da planilha do exercício." };
    const motivo = this.motivoBloqueio(p);
    if (motivo) return { ok: false, mensagem: motivo };
    let entrada = bruto.trim();
    const v = validarIdioma(entrada);
    if (!v.ok) return v;
    // Fórmula que não pode ser lida: recusa com explicação (o Excel também não deixa gravar).
    if (entrada.startsWith("=")) {
      let no: No;
      try {
        no = analisar(entrada);
      } catch {
        // Como o Excel: faltando só fechar parênteses no fim, fecha sozinho.
        const fechada = fecharParenteses(entrada);
        let lida: No | null = null;
        try {
          lida = fechada ? analisar(fechada) : null;
        } catch {
          lida = null;
        }
        if (!lida || !fechada) return { ok: false, mensagem: diagnosticarSintaxe(entrada) };
        no = lida;
        entrada = bruto = fechada;
      }
      const faltam = [...naoImplementadas(no)];
      if (faltam.length) return { ok: false, mensagem: `A função ${faltam[0]} ainda não está disponível no simulador.` };
    }
    const antes = this.gravar(p, bruto);
    // Validação de dados: grava, confere o resultado e desfaz se não passar (estilo "Parar" do Excel).
    const recusa = this.recusaDaValidacao(p);
    if (recusa && !(recusa.estilo !== "parar" && opcoes?.aceitarAlerta)) {
      this.gravar(p, antes ?? "");
      return recusa.estilo === "parar" ? { ok: false, mensagem: recusa.mensagem } : { ok: false, mensagem: recusa.mensagem, alerta: recusa.estilo };
    }
    this.registrar({ tipo: "celulas", mudancas: [{ end: paraEndereco(p), antes, depois: this.fielEm(p) }] });
    this.notificar();
    return { ok: true };
  }

  /** Grava várias células de uma vez, sem validação de idioma (uso interno e restauração). */
  definirVarias(alteracoes: Alteracao[]) {
    const porAba = this.separarPorAba(alteracoes);
    for (const [aba, lista] of porAba) if (aba !== this) aba.definirVarias(lista);
    const mudancas = this.gravarVarias(porAba.get(this) ?? [], (p) => this.bloqueada(p));
    this.registrar({ tipo: "celulas", mudancas });
    this.notificar();
  }

  /** Endereços com aba ("Vendas!A1") vão para a aba deles; os que não existem ficam de fora. */
  private separarPorAba(alteracoes: Alteracao[]): Map<Planilha, Alteracao[]> {
    const porAba = new Map<Planilha, Alteracao[]>();
    for (const a of alteracoes) {
      const alvo = this.daAba(a.endereco);
      if (!alvo) continue;
      const lista = porAba.get(alvo[0]) ?? [];
      lista.push({ endereco: alvo[1], bruto: a.bruto });
      porAba.set(alvo[0], lista);
    }
    return porAba;
  }

  /** Grava sem validar as células desta aba que existem e não estão travadas. */
  private gravarVarias(alteracoes: Alteracao[], travada: (p: Pos) => boolean): Mudanca[] {
    const mudancas: Mudanca[] = [];
    for (const { endereco, bruto } of alteracoes) {
      const p = this.posNaGrade(endereco);
      if (!p || travada(p) || typeof bruto !== "string") continue;
      const antes = this.gravar(p, bruto);
      mudancas.push({ end: paraEndereco(p), antes, depois: this.fielEm(p) });
    }
    return mudancas;
  }

  private fielEm(end: string | Pos): string | undefined {
    const k = this.chave(end);
    return this.textos.has(k) ? this.fiel(k) : undefined;
  }

  /** Conteúdo bruto de um intervalo como texto (tab entre colunas, quebra entre linhas), para a área de transferência. */
  textoDoIntervalo(intervalo: Intervalo): string {
    const linhas: string[] = [];
    for (let l = intervalo.inicio.linha; l <= intervalo.fim.linha; l++) {
      const cols: string[] = [];
      for (let c = intervalo.inicio.coluna; c <= intervalo.fim.coluna; c++) cols.push(this.bruto({ linha: l, coluna: c }));
      linhas.push(cols.join("\t"));
    }
    return linhas.join("\n");
  }

  /**
   * Cola texto vindo de fora (outra planilha, editor de texto) a partir de
   * `inicio`. Tab separa colunas e quebra de linha separa linhas. Cada célula
   * passa pelas mesmas validações da digitação; devolve a primeira recusa.
   */
  colarTexto(inicio: Pos, texto: string): Validacao & { fim: Pos } {
    const linhas = texto.replace(/\r/g, "").replace(/\n$/, "").split("\n");
    let primeiraRecusa: string | null = null;
    let fim = inicio;
    linhas.forEach((linha, dl) =>
      linha.split("\t").forEach((valor, dc) => {
        const p = { linha: inicio.linha + dl, coluna: inicio.coluna + dc };
        if (p.linha >= this.linhas || p.coluna >= this.colunas) return;
        fim = { linha: Math.max(fim.linha, p.linha), coluna: Math.max(fim.coluna, p.coluna) };
        const r = this.definir(p, valor);
        if (!r.ok && !primeiraRecusa) primeiraRecusa = r.mensagem;
      }),
    );
    return primeiraRecusa ? { ok: false, mensagem: primeiraRecusa, fim } : { ok: true, fim };
  }

  limpar(intervalo: Intervalo) {
    const mudancas: Mudanca[] = [];
    for (const p of posicoes(intervalo)) {
      if (this.bloqueada(p) || !this.textos.has(`${p.linha},${p.coluna}`)) continue;
      mudancas.push({ end: paraEndereco(p), antes: this.gravar(p, "") });
    }
    if (mudancas.length) this.registrar({ tipo: "celulas", mudancas });
    this.notificar();
  }

  copiar(intervalo: Intervalo) {
    this.area = intervalo;
  }

  areaCopiada() {
    return this.area;
  }

  /**
   * Cola a área copiada a partir de `destino`, ajustando referências relativas
   * (B2 -> B3) e mantendo as absolutas ($B$2), como o Excel.
   * Se o destino for maior que a origem, repete a origem (como o Excel faz).
   */
  colar(destino: Intervalo): boolean {
    if (!this.area) return false;
    this.colarDe(this.area, destino);
    return true;
  }

  /** Alça de preenchimento / Ctrl+D / Ctrl+R: repete a origem sobre o destino. */
  preencher(origem: Intervalo, destino: Intervalo) {
    this.colarDe(origem, destino);
  }

  private colarDe(origem: Intervalo, destino: Intervalo) {
    const altO = origem.fim.linha - origem.inicio.linha + 1;
    const largO = origem.fim.coluna - origem.inicio.coluna + 1;
    const altD = Math.max(destino.fim.linha - destino.inicio.linha + 1, altO);
    const largD = Math.max(destino.fim.coluna - destino.inicio.coluna + 1, largO);
    // Lê a origem antes de escrever: colar sobre ela mesma não pode embaralhar.
    const fonte = (l: number, c: number) => this.fielEm({ linha: l, coluna: c }) ?? this.bruto({ linha: l, coluna: c });
    const plano: { alvo: Pos; texto: string }[] = [];
    for (let dl = 0; dl < altD; dl++)
      for (let dc = 0; dc < largD; dc++) {
        const alvo = { linha: destino.inicio.linha + dl, coluna: destino.inicio.coluna + dc };
        if (alvo.linha >= this.linhas || alvo.coluna >= this.colunas) continue;
        if (this.bloqueada(alvo)) continue;
        const de = { linha: origem.inicio.linha + (dl % altO), coluna: origem.inicio.coluna + (dc % largO) };
        if (de.linha === alvo.linha && de.coluna === alvo.coluna) continue;
        const t = fonte(de.linha, de.coluna);
        plano.push({ alvo, texto: t.startsWith("=") ? deslocarFormula(t, alvo.linha - de.linha, alvo.coluna - de.coluna) : t });
      }
    const mudancas: Mudanca[] = plano.map(({ alvo, texto }) => {
      const antes = this.gravar(alvo, texto);
      return { end: paraEndereco(alvo), antes, depois: this.fielEm(alvo) };
    });
    if (mudancas.length) this.registrar({ tipo: "celulas", mudancas });
    this.notificar();
  }

  /** Ctrl+Z: desfaz a última ação, seja de conteúdo ou de formatação. */
  desfazer() {
    const acao = this.historico.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.antes);
    else if (acao.tipo === "estado") this.restaurar(acao.antes);
    else this.aplicar([...acao.mudancas].reverse(), "antes");
    this.pesoHistorico -= Planilha.peso(acao);
    this.refeitos.push(acao);
    this.notificar();
  }

  /** Ctrl+Y / Ctrl+Shift+Z. */
  refazer() {
    const acao = this.refeitos.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.depois);
    else if (acao.tipo === "estado") this.restaurar(acao.depois);
    else this.aplicar(acao.mudancas, "depois");
    this.historico.push(acao);
    this.pesoHistorico += Planilha.peso(acao);
    this.notificar();
  }

  // --- recursos: filtro e classificação -------------------------------------

  /** Configuração atual dos recursos (o que o progresso guarda e o certificado reenvia). */
  /**
   * Configuração atual dos recursos (o que o progresso guarda e o certificado
   * reenvia). Na primeira aba de uma Pasta, os das outras vão em `abas`.
   */
  recursos(): Recursos {
    const r: Recursos = this.recursosDestaAba();
    if (this.pasta && this.pasta.abas[0] === this) {
      const abas: Record<string, RecursosDeUmaAba> = {};
      for (const aba of this.pasta.abas.slice(1)) {
        const x = aba.recursosDestaAba();
        if (Object.keys(x).length) abas[this.pasta.nomeDe(aba)] = x;
      }
      if (Object.keys(abas).length) r.abas = abas;
    }
    return r;
  }

  private recursosDestaAba(): RecursosDeUmaAba {
    const r: RecursosDeUmaAba = {};
    if (this.filtro)
      r.filtro = {
        intervalo: intervaloParaTexto(this.filtro.intervalo),
        criterios: Object.fromEntries(Object.entries(this.filtro.criterios).map(([c, valores]) => [c, { valores }])),
      };
    else if (this.inicial.filtro) r.filtro = null; // o aluno desligou o filtro que o exercício trazia
    if (this.permutacoes.length) r.permutacoes = structuredClone(this.permutacoes);
    if (this.dinamicas.length || this.inicial.dinamicas) r.dinamicas = structuredClone(this.dinamicas);
    if (this.condicionais.length || this.inicial.condicionais) r.condicionais = structuredClone(this.condicionais);
    if (this.graficosLista.length || this.inicial.graficos) r.graficos = structuredClone(this.graficosLista);
    if (this.validacoesLista.length || this.inicial.validacoes) r.validacoes = structuredClone(this.validacoesLista);
    return r;
  }

  /**
   * Restaura o progresso salvo (o que `conteudosDoAluno`, `formatosDoAluno` e
   * `recursos` devolveram). É o ponto único usado pelo Simulador e pelo
   * certificado, sempre nesta ordem:
   *
   * 1. classificações (movem os dados do exercício para as posições finais);
   * 2. células do aluno, que já estão nas posições finais;
   * 3. formatos do aluno;
   * 4. o resto dos recursos (filtro, tabelas dinâmicas, regras, gráficos, validações);
   * 5. os derivados calculados uma vez, sem histórico (Ctrl+Z não desfaz o restaurado).
   *
   * Numa Pasta, chamada na primeira aba, distribui para as outras. O que não
   * existe (endereço fora da grade, aba desconhecida) é ignorado.
   */
  restaurarProgresso(salvo: { conteudos?: Record<string, string>; formatos?: Record<string, Formato>; recursos?: Recursos }) {
    const abas = this.pasta && this.pasta.abas[0] === this ? this.pasta.abas : [this];
    const r = salvo.recursos ?? {};
    const daAbaSalva = (aba: Planilha): RecursosDeUmaAba => {
      if (aba === this) return r;
      const nome = this.pasta!.nomeDe(aba).toUpperCase();
      const k = Object.keys(r.abas ?? {}).find((n) => n.toUpperCase() === nome);
      return k ? r.abas![k] : {};
    };
    for (const aba of abas) aba.aplicarClassificacoes(daAbaSalva(aba), false);
    // Só as células travadas ficam de fora: a saída da tabela dinâmica ainda vai ser recalculada (e,
    // se a célula do aluno estiver no caminho, a tabela é que não cabe, como estava na tela).
    const porAba = this.separarPorAba(Object.entries(salvo.conteudos ?? {}).map(([endereco, bruto]) => ({ endereco, bruto })));
    for (const [aba, lista] of porAba) if (abas.includes(aba)) aba.gravarVarias(lista, (p) => aba.bloqueadas.has(paraEndereco(p)));
    for (const [end, f] of Object.entries(salvo.formatos ?? {})) {
      const alvo = this.daAba(end);
      if (!alvo || !abas.includes(alvo[0])) continue;
      let int: Intervalo;
      try {
        int = deIntervalo(alvo[1]);
      } catch {
        continue;
      }
      const fotos = alvo[0].fotosDeFormato(int, f);
      if (fotos) alvo[0].aplicarFormatos(fotos.depois);
    }
    for (const aba of abas) aba.aplicarDemais(daAbaSalva(aba));
    this.limparHistorico();
    // Duas passadas: uma aba pode ler o que é derivado em outra (tabela dinâmica, regra).
    for (const aba of abas) aba.atualizarDerivados();
    for (const aba of abas) aba.refrescar();
  }

  /**
   * Restaura recursos salvos: refaz as classificações e liga o filtro.
   * Sem histórico (Ctrl+Z não desfaz o que foi restaurado). `inicial`: estado do
   * próprio exercício, que não conta como classificação feita pelo aluno.
   * Para o progresso salvo, prefira `restaurarProgresso` (que põe as células na ordem certa).
   */
  aplicarRecursos(r: Recursos, { inicial = false } = {}) {
    this.aplicarClassificacoes(r, inicial);
    this.aplicarDemais(r);
    this.atualizarDerivados();
    this.versao++;
    this.ouvintes.forEach((fn) => fn());
    if (r.abas && this.pasta && this.pasta.abas[0] === this)
      for (const [nome, x] of Object.entries(r.abas)) {
        const aba = this.pasta.aba(nome);
        if (aba && aba !== this) aba.aplicarRecursos(x, { inicial });
      }
  }

  /** Classificações salvas: as do formato antigo (refeitas como cliques) e as permutações. */
  private aplicarClassificacoes(r: RecursosDeUmaAba, inicial: boolean) {
    for (const o of r.ordenacoes ?? []) {
      let int: Intervalo | null;
      try {
        int = this.recortar(deIntervalo(o.intervalo));
      } catch {
        continue;
      }
      if (!int) continue;
      const feita = this.ordenar(int, o);
      if (!inicial && feita) this.anotarPermutacao(feita);
    }
    for (const pm of r.permutacoes ?? []) {
      const feita = this.aplicarPermutacao(pm);
      if (!inicial && feita) this.anotarPermutacao(feita);
    }
  }

  /** Filtro, tabelas dinâmicas, regras, gráficos e validações (sem recalcular os derivados). */
  private aplicarDemais(r: RecursosDeUmaAba) {
    if (r.filtro === null) this.filtro = null;
    else if (r.filtro) {
      const int = this.recortar(deIntervalo(r.filtro.intervalo));
      if (int)
        this.filtro = {
          intervalo: int,
          criterios: Object.fromEntries(Object.entries(r.filtro.criterios).map(([c, k]) => [c, [...k.valores]])),
        };
    }
    // Tabelas dinâmicas: a lista salva substitui a atual (inclusive as que o exercício já trazia).
    if (r.dinamicas) this.dinamicas = structuredClone(r.dinamicas).filter((d) => this.recortar(deIntervalo(d.origem)));
    if (r.condicionais) this.condicionais = structuredClone(r.condicionais);
    if (r.graficos) this.graficosLista = structuredClone(r.graficos);
    if (r.validacoes) this.validacoesLista = structuredClone(r.validacoes);
  }

  /** O intervalo cortado nas bordas da planilha (null se ficar fora). */
  private recortar(i: Intervalo): Intervalo | null {
    const fim = { linha: Math.min(i.fim.linha, this.linhas - 1), coluna: Math.min(i.fim.coluna, this.colunas - 1) };
    return i.inicio.linha > fim.linha || i.inicio.coluna > fim.coluna ? null : { inicio: i.inicio, fim };
  }

  filtroAtual(): Filtro | null {
    return this.filtro;
  }

  /** A linha está escondida pelo filtro. */
  linhaOculta(linha: number): boolean {
    return this.ocultas.has(linha);
  }

  /** Números (base 1) das linhas de dados visíveis no intervalo do filtro, sem o cabeçalho. */
  linhasVisiveis(): number[] {
    if (!this.filtro) return [];
    const { inicio, fim } = this.filtro.intervalo;
    const out: number[] = [];
    for (let l = inicio.linha + 1; l <= fim.linha; l++) if (!this.ocultas.has(l)) out.push(l + 1);
    return out;
  }

  /** Total de linhas de dados no filtro (para "4 de 12 registros encontrados"). */
  totalDoFiltro(): number {
    return this.filtro ? this.filtro.intervalo.fim.linha - this.filtro.intervalo.inicio.linha : 0;
  }

  /** O texto que o filtro compara: o que aparece na célula, sem espaços nas pontas. */
  textoParaFiltro(p: Pos): string {
    const v = this.valor(p);
    return v === null || v === "" ? "" : this.exibicao(p).trim();
  }

  /** Recalcula as linhas escondidas pelo filtro. Devolve se mudaram. */
  private atualizarOcultas(): boolean {
    const novo = new Set<number>();
    const f = this.filtro;
    if (f) {
      const cols = Object.entries(f.criterios).map(([letra, valores]) => ({ coluna: letrasParaColuna(letra), ok: new Set(valores) }));
      for (let l = f.intervalo.inicio.linha + 1; l <= f.intervalo.fim.linha; l++)
        if (cols.some(({ coluna, ok }) => !ok.has(this.textoParaFiltro({ linha: l, coluna })))) novo.add(l);
    }
    const mudou = novo.size !== this.ocultas.size || [...novo].some((l) => !this.ocultas.has(l));
    this.ocultas = novo;
    if (mudou) this.calculo.invalidar(); // SUBTOTAL depende das linhas visíveis
    return mudou;
  }

  /**
   * Os textos de uma coluna do filtro, para a lista de caixas de seleção: só os
   * das linhas que passam nos critérios das OUTRAS colunas (como no Excel).
   * Números primeiro (em ordem), depois textos em ordem alfabética, (Vazias) por último.
   */
  valoresDaColuna(coluna: number): string[] {
    const f = this.filtro;
    if (!f) return [];
    const letra = colunaParaLetras(coluna);
    const outras = Object.entries(f.criterios)
      .filter(([c]) => c !== letra)
      .map(([c, valores]) => ({ coluna: letrasParaColuna(c), ok: new Set(valores) }));
    const vistos = new Map<string, ValorCelula>();
    for (let l = f.intervalo.inicio.linha + 1; l <= f.intervalo.fim.linha; l++) {
      if (outras.some(({ coluna: c, ok }) => !ok.has(this.textoParaFiltro({ linha: l, coluna: c })))) continue;
      const p = { linha: l, coluna };
      const t = this.textoParaFiltro(p);
      if (!vistos.has(t)) vistos.set(t, this.valor(p));
    }
    return [...vistos.entries()].sort((a, b) => compararParaClassificar(a[1], b[1])).map(([t]) => t);
  }

  /** Liga o AutoFiltro no intervalo (a primeira linha vira cabeçalho com as setas). */
  ligarFiltro(intervalo: Intervalo) {
    const int = this.recortar(intervalo);
    if (!int || int.fim.linha === int.inicio.linha) return;
    this.mudarEstado(() => {
      this.filtro = { intervalo: int, criterios: {} };
    });
  }

  desligarFiltro() {
    if (!this.filtro) return;
    this.mudarEstado(() => {
      this.filtro = null;
    });
  }

  /** Critério de uma coluna: os textos que ficam visíveis. `null` limpa o filtro da coluna. */
  filtrarColuna(coluna: number, valores: string[] | null) {
    const f = this.filtro;
    if (!f) return;
    const letra = colunaParaLetras(coluna);
    this.mudarEstado(() => {
      const criterios = { ...f.criterios };
      if (valores === null) delete criterios[letra];
      else criterios[letra] = [...valores];
      this.filtro = { ...f, criterios };
    });
  }

  /** Limpa os critérios de todas as colunas (o filtro continua ligado). */
  limparFiltros() {
    const f = this.filtro;
    if (!f || Object.keys(f.criterios).length === 0) return;
    this.mudarEstado(() => {
      this.filtro = { ...f, criterios: {} };
    });
  }

  /**
   * Classificar: reordena as linhas do intervalo (inclusive os dados do
   * exercício, que são bloqueados para digitação mas podem ser organizados),
   * levando junto formato e negrito, como o Excel.
   */
  classificar(o: Ordenacao): Validacao {
    let int: Intervalo | null;
    try {
      int = this.recortar(deIntervalo(o.intervalo));
    } catch {
      int = null;
    }
    if (!int) return { ok: false, mensagem: "Selecione uma célula dentro da tabela para classificar." };
    const dados = intervaloParaTexto({ inicio: { linha: int.inicio.linha + (o.cabecalho ? 1 : 0), coluna: int.inicio.coluna }, fim: int.fim });
    if (this.permutacoes.length >= MAX_PERMUTACOES && this.permutacoes.at(-1)?.intervalo !== dados)
      return {
        ok: false,
        mensagem: `Já são ${MAX_PERMUTACOES} classificações alternando entre tabelas diferentes. Desfaça algumas (Ctrl+Z) ou recomece o exercício.`,
      };
    const alvo = int;
    this.mudarEstado(() => {
      const feita = this.ordenar(alvo, o);
      if (feita) this.anotarPermutacao(feita);
    });
    return { ok: true };
  }

  /** Junta a classificação às já feitas: no mesmo intervalo da última, as duas viram uma só. */
  private anotarPermutacao(p: Permutacao) {
    const ultima = this.permutacoes.at(-1);
    if (ultima && ultima.intervalo === p.intervalo) {
      ultima.ordem = compor(ultima.ordem, p.ordem);
      if (ultima.ordem.every((x, i) => x === i)) this.permutacoes.pop(); // voltou à ordem de antes
      return;
    }
    if (p.ordem.every((x, i) => x === i)) return;
    if (this.permutacoes.length < MAX_PERMUTACOES) this.permutacoes.push({ intervalo: p.intervalo, ordem: [...p.ordem] });
  }

  /** Aplica uma permutação salva (se ainda couber exatamente na planilha). Devolve a que foi feita. */
  private aplicarPermutacao(pm: Permutacao): Permutacao | null {
    let int: Intervalo;
    try {
      int = deIntervalo(pm.intervalo);
    } catch {
      return null;
    }
    const n = int.fim.linha - int.inicio.linha + 1;
    const permutacao = pm.ordem.length === n && new Set(pm.ordem).size === n && pm.ordem.every((x) => Number.isInteger(x) && x >= 0 && x < n);
    if (!permutacao || !this.naGrade(int.inicio) || !this.naGrade(int.fim)) return null;
    this.permutarLinhas(int, pm.ordem);
    return { intervalo: intervaloParaTexto(int), ordem: [...pm.ordem] };
  }

  /**
   * Classifica e devolve o efeito: a permutação das linhas de dados (relativa à
   * primeira linha de dados), ou null se não há o que classificar.
   */
  private ordenar(int: Intervalo, o: Ordenacao): Permutacao | null {
    const primeira = int.inicio.linha + (o.cabecalho ? 1 : 0);
    if (primeira >= int.fim.linha) return null;
    const linhas = Array.from({ length: int.fim.linha - primeira + 1 }, (_, i) => primeira + i);
    const chaves = o.chaves.map((k) => ({ coluna: letrasParaColuna(k.coluna), desc: k.ordem === "desc" }));
    const valores = new Map(linhas.map((l) => [l, chaves.map((k) => this.valor({ linha: l, coluna: k.coluna }))]));
    const ordem = [...linhas].sort((a, b) => {
      for (const [i, k] of chaves.entries()) {
        const r = compararParaClassificar(valores.get(a)![i], valores.get(b)![i], k.desc);
        if (r !== 0) return r;
      }
      return a - b; // estável, como o Excel
    });
    const dados: Intervalo = { inicio: { linha: primeira, coluna: int.inicio.coluna }, fim: int.fim };
    const relativa = ordem.map((l) => l - primeira);
    this.permutarLinhas(dados, relativa);
    return { intervalo: intervaloParaTexto(dados), ordem: relativa };
  }

  /**
   * Põe na linha i do intervalo o que estava na linha `ordem[i]`, levando junto
   * o conteúdo (com o tipo), o formato, o negrito, a trava e a marca de
   * "pré-preenchida editável". Fórmulas acompanham a linha (referência relativa).
   */
  private permutarLinhas(int: Intervalo, ordem: number[]) {
    const primeira = int.inicio.linha;
    const cols = Array.from({ length: int.fim.coluna - int.inicio.coluna + 1 }, (_, i) => int.inicio.coluna + i);
    const linhaDe = (l: number) =>
      cols.map((c) => {
        const end = paraEndereco({ linha: l, coluna: c });
        const k = `${l},${c}`;
        return {
          texto: this.textos.get(k) ?? "",
          conteudo: this.conteudosCel.get(k) ?? null,
          formato: this.formatos.get(end),
          aluno: this.formatosAluno.get(end),
          negrito: this.negritos.has(end),
          bloqueada: this.bloqueadas.has(end),
          preenchida: this.preenchidasEditaveis.has(end),
        };
      });
    const fotos = ordem.map((i) => linhaDe(primeira + i));
    fotos.forEach((foto, i) => {
      const destino = primeira + i;
      const origem = primeira + ordem[i];
      cols.forEach((c, j) => {
        const x = foto[j];
        const p = { linha: destino, coluna: c };
        const end = paraEndereco(p);
        if (x.conteudo && "formula" in x.conteudo) {
          if (destino === origem) this.colocar(p, x.conteudo, x.texto);
          else this.gravar(p, deslocarFormula(x.texto, destino - origem, 0));
        } else this.colocar(p, x.conteudo, x.texto);
        if (x.preenchida) this.preenchidasEditaveis.add(end);
        else this.preenchidasEditaveis.delete(end);
        if (x.formato) this.formatos.set(end, x.formato);
        else this.formatos.delete(end);
        if (x.aluno) this.formatosAluno.set(end, x.aluno);
        else this.formatosAluno.delete(end);
        if (x.negrito) this.negritos.add(end);
        else this.negritos.delete(end);
        if (x.bloqueada) this.bloqueadas.add(end);
        else this.bloqueadas.delete(end);
      });
    });
  }

  /**
   * "Região atual" do Excel (Ctrl+Shift+8): o bloco de dados em volta da célula,
   * até as linhas e colunas vazias. É o que Filtro e Classificar usam quando a
   * seleção é uma célula só.
   */
  regiaoAtual(p: Pos): Intervalo {
    const cheia = (l: number, c: number) => {
      if (l < 0 || c < 0 || l >= this.linhas || c >= this.colunas) return false;
      const v = this.valor({ linha: l, coluna: c });
      return v !== null && v !== "";
    };
    let [l0, c0, l1, c1] = [p.linha, p.coluna, p.linha, p.coluna];
    for (let mudou = true; mudou; ) {
      mudou = false;
      const linhaTem = (l: number) => Array.from({ length: c1 - c0 + 3 }, (_, i) => c0 - 1 + i).some((c) => cheia(l, c));
      const colunaTem = (c: number) => Array.from({ length: l1 - l0 + 3 }, (_, i) => l0 - 1 + i).some((l) => cheia(l, c));
      if (l0 > 0 && linhaTem(l0 - 1)) {
        l0--;
        mudou = true;
      }
      if (l1 < this.linhas - 1 && linhaTem(l1 + 1)) {
        l1++;
        mudou = true;
      }
      if (c0 > 0 && colunaTem(c0 - 1)) {
        c0--;
        mudou = true;
      }
      if (c1 < this.colunas - 1 && colunaTem(c1 + 1)) {
        c1++;
        mudou = true;
      }
    }
    return { inicio: { linha: l0, coluna: c0 }, fim: { linha: l1, coluna: c1 } };
  }

  /**
   * O Excel adivinha se a primeira linha é cabeçalho. Aqui: todas as células
   * dela são texto e (estão em negrito ou a linha de baixo tem algo que não é texto).
   */
  pareceCabecalho(int: Intervalo): boolean {
    const l = int.inicio.linha;
    if (l >= int.fim.linha) return false;
    const cols = Array.from({ length: int.fim.coluna - int.inicio.coluna + 1 }, (_, i) => int.inicio.coluna + i);
    const textos = cols.every((c) => typeof this.valor({ linha: l, coluna: c }) === "string");
    if (!textos) return false;
    const negrito = cols.every((c) => this.negritos.has(paraEndereco({ linha: l, coluna: c })));
    const abaixoNaoTexto = cols.some((c) => {
      const v = this.valor({ linha: l + 1, coluna: c });
      return v !== null && v !== "" && typeof v !== "string";
    });
    return negrito || abaixoNaoTexto;
  }

  // --- tabela dinâmica ---------------------------------------------------------

  /** Filtro e tabelas dinâmicas dependem dos valores: recalculados a cada mudança. */
  private atualizarDerivados() {
    // Linhas ocultas primeiro: a tabela dinâmica pode ler um SUBTOTAL, que depende delas.
    // Se a saída da tabela muda o que o filtro esconde, mais uma passada (no máximo duas).
    this.atualizarOcultas();
    this.atualizarDinamicas();
    if (this.atualizarOcultas()) this.atualizarDinamicas();
    this.atualizarCondicionais();
  }

  // --- formatação condicional ---------------------------------------------------

  private atualizarCondicionais() {
    if (this.condicionais.length === 0) {
      this.estilos = new Map();
      return;
    }
    this.estilos = calcularCondicionais(this.condicionais, {
      valor: (p) => this.valor(p),
      texto: (p) => this.textoParaFiltro(p),
      formula: (f, origem, p) => this.avaliarFormulaEm(f, origem, p),
      limites: { linhas: this.linhas, colunas: this.colunas },
      orcamento: ORCAMENTO_CONDICIONAL,
    });
  }

  /** Avalia a fórmula de uma regra escrita para `origem`, ajustada para a célula `p` (como copiar a fórmula). */
  private avaliarFormulaEm(formula: string, origem: Pos, p: Pos): ValorCelula {
    try {
      const f = deslocarFormula(formula, p.linha - origem.linha, p.coluna - origem.coluna);
      return this.calculo.avaliarAvulsa(analisar(f), this.aba);
    } catch {
      return null;
    }
  }

  /** Estilo da formatação condicional na célula (destaque, barra de dados, escala de cor). */
  estiloCondicional(end: string | Pos): EstiloCelula | undefined {
    return this.estilos.get(typeof end === "string" ? end : paraEndereco(end));
  }

  /** Células do intervalo com destaque (opcionalmente só desta cor). */
  destacadas(intervalo: Intervalo, estilo?: EstiloCelula["destaque"]): string[] {
    return [...posicoes(intervalo)]
      .map(paraEndereco)
      .filter((e) => {
        const d = this.estilos.get(e)?.destaque;
        return d && (!estilo || d === estilo);
      });
  }

  regrasCondicionais(): RegraCondicional[] {
    return this.condicionais;
  }

  /**
   * Nova regra. A fórmula de "Usar uma fórmula" é conferida como se fosse
   * digitada numa célula (idioma e escrita), e recusada com explicação.
   */
  adicionarRegra(regra: RegraCondicional): Validacao {
    // Os mesmos limites do progresso e do certificado: o que a tela grava, o servidor aceita.
    const valida = regraCondicionalSchema.safeParse(regra);
    if (!valida.success)
      return {
        ok: false,
        mensagem: mensagemDoSchema(valida.error, { valor: "O valor da regra", valor2: "O segundo valor da regra", formula: "A fórmula da regra", n: "O número de itens", intervalo: "O intervalo da regra" }),
      };
    if (regra.tipo === "formula") {
      const v = validarIdioma(regra.formula.trim());
      if (!v.ok) return v;
      let no: No;
      try {
        no = analisar(regra.formula.trim());
      } catch {
        return { ok: false, mensagem: diagnosticarSintaxe(regra.formula.trim()) };
      }
      const faltam = [...naoImplementadas(no)];
      if (faltam.length) return { ok: false, mensagem: `A função ${faltam[0]} ainda não está disponível no simulador.` };
    }
    if (this.condicionais.length >= 20) return { ok: false, mensagem: "No máximo 20 regras por planilha." };
    this.mudarEstado(() => {
      this.condicionais.push(structuredClone(regra));
    });
    return { ok: true };
  }

  removerRegra(i: number) {
    if (!this.condicionais[i]) return;
    this.mudarEstado(() => {
      this.condicionais.splice(i, 1);
    });
  }

  /**
   * "Mover para Cima" (`+1`, mais prioridade) ou "Mover para Baixo" (`-1`) no
   * Gerenciador. A prioridade é a posição: a última da lista vale primeiro.
   */
  moverRegra(i: number, sentido: 1 | -1) {
    const j = i + sentido;
    if (!this.condicionais[i] || !this.condicionais[j]) return;
    this.mudarEstado(() => {
      [this.condicionais[i], this.condicionais[j]] = [this.condicionais[j], this.condicionais[i]];
    });
  }

  /** Limpar Regras: das que tocam o intervalo, ou da planilha inteira (`null`). */
  limparRegras(intervalo: Intervalo | null) {
    const toca = (r: RegraCondicional) => {
      if (!intervalo) return true;
      const i = deIntervalo(r.intervalo);
      return !(i.fim.linha < intervalo.inicio.linha || i.inicio.linha > intervalo.fim.linha || i.fim.coluna < intervalo.inicio.coluna || i.inicio.coluna > intervalo.fim.coluna);
    };
    if (!this.condicionais.some(toca)) return;
    this.mudarEstado(() => {
      this.condicionais = this.condicionais.filter((r) => !toca(r));
    });
  }

  /**
   * Reescreve a saída de todas as tabelas dinâmicas. Diferença consciente para o
   * Excel: aqui ela acompanha a origem sozinha (lá precisa de "Atualizar").
   */
  private atualizarDinamicas() {
    for (const k of this.celulasDinamicas) {
      const [l, c] = k.split(",").map(Number);
      if (!this.textos.has(k)) this.calculo.definir(l, c, null, this.aba);
    }
    this.celulasDinamicas = new Set();
    this.formatosDinamicas = new Map();
    this.negritosDinamicas = new Set();
    this.saidasDinamicas = this.dinamicas.map((d) => {
      const origem = this.recortar(deIntervalo(d.origem))!;
      const destino = deEndereco(d.destino);
      const nomes = this.nomesDosCampos(origem);
      const saida = calcularDinamica(d, origem, nomes, {
        valor: (l, c) => this.valor({ linha: l, coluna: c }),
        texto: (l, c) => this.textoParaFiltro({ linha: l, coluna: c }),
      });
      const area: Intervalo = {
        inicio: destino,
        fim: { linha: destino.linha + Math.max(saida.altura, 1) - 1, coluna: destino.coluna + Math.max(saida.largura, 1) - 1 },
      };
      if (area.fim.linha >= this.linhas || area.fim.coluna >= this.colunas)
        return { area, vazia: saida.vazia, erro: "A tabela dinâmica não cabe a partir daqui. Mude o destino ou tire campos." };
      const ocupada = saida.celulas
        .map((x) => ({ linha: destino.linha + x.dl, coluna: destino.coluna + x.dc }))
        .find((p) => this.textos.has(`${p.linha},${p.coluna}`) || this.celulasDinamicas.has(`${p.linha},${p.coluna}`) || contemPos(origem, p));
      if (ocupada)
        return { area, vazia: saida.vazia, erro: `A tabela dinâmica não cabe: ${paraEndereco(ocupada)} já tem dados. Mude o destino ou apague o que está lá.` };
      for (const x of saida.celulas) {
        const p = { linha: destino.linha + x.dl, coluna: destino.coluna + x.dc };
        const k = `${p.linha},${p.coluna}`;
        const end = paraEndereco(p);
        this.celulasDinamicas.add(k);
        if (x.valor === null) continue;
        const tipo = typeof x.valor === "number" ? "NUMBER_RAW" : typeof x.valor === "string" ? "STRING" : typeof x.valor === "boolean" ? "BOOLEAN" : "ERROR";
        this.calculo.definir(p.linha, p.coluna, { valor: x.valor, tipo }, this.aba);
        if (x.negrito) this.negritosDinamicas.add(end);
        if (x.formato) this.formatosDinamicas.set(end, x.formato);
        else if (x.formatoDe) {
          const f = this.formatoDoCampo(origem, x.formatoDe);
          if (f) this.formatosDinamicas.set(end, f);
        }
      }
      return { area, vazia: saida.vazia, erro: null };
    });
  }

  /** Formato de um campo da origem (o da primeira célula de dados que tiver um). */
  private formatoDoCampo(origem: Intervalo, letra: string): Formato | undefined {
    const c = letrasParaColuna(letra);
    for (let l = origem.inicio.linha + 1; l <= origem.fim.linha; l++) {
      const end = paraEndereco({ linha: l, coluna: c });
      const f = this.formatos.get(end);
      if (f) return f;
      const t = this.tipo(end);
      if (t === "NUMBER_CURRENCY") return "moeda";
      if (t === "NUMBER_PERCENT") return "percentual";
      if (t === "NUMBER_DATE") return "data";
      if (this.valor(end) !== null) return undefined;
    }
    return undefined;
  }

  /** Nome de cada campo (letra → texto do cabeçalho). */
  private nomesDosCampos(origem: Intervalo): Record<string, string> {
    const out: Record<string, string> = {};
    for (let c = origem.inicio.coluna; c <= origem.fim.coluna; c++)
      out[colunaParaLetras(c)] = this.textoParaFiltro({ linha: origem.inicio.linha, coluna: c }) || `Coluna${c + 1}`;
    return out;
  }

  /** As tabelas dinâmicas, com a área que ocupam e o erro (se não couberem). */
  tabelasDinamicas(): { config: Dinamica; area: Intervalo; vazia: boolean; erro: string | null }[] {
    return this.dinamicas.map((config, i) => ({ config, ...this.saidasDinamicas[i] }));
  }

  /** Índice da tabela dinâmica que tem esta célula na área (-1 se nenhuma). */
  dinamicaEm(p: Pos): number {
    return this.saidasDinamicas.findIndex((s) => contemPos(s.area, p));
  }

  /** Campos da origem: letra, nome do cabeçalho e se são só números (vão para Valores com Soma). */
  camposDaDinamica(i: number): { letra: string; nome: string; numerico: boolean }[] {
    const d = this.dinamicas[i];
    if (!d) return [];
    const origem = this.recortar(deIntervalo(d.origem))!;
    const nomes = this.nomesDosCampos(origem);
    return Object.entries(nomes).map(([letra, nome]) => {
      const c = letrasParaColuna(letra);
      let algum = false;
      let numerico = true;
      for (let l = origem.inicio.linha + 1; l <= origem.fim.linha; l++) {
        const v = this.valor({ linha: l, coluna: c });
        if (v === null || v === "") continue;
        algum = true;
        if (typeof v !== "number") numerico = false;
      }
      return { letra, nome, numerico: algum && numerico };
    });
  }

  /** Itens de um campo (para o filtro da tabela dinâmica), na ordem do Excel. */
  itensDoCampo(i: number, letra: string): string[] {
    const d = this.dinamicas[i];
    if (!d) return [];
    const origem = this.recortar(deIntervalo(d.origem))!;
    const c = letrasParaColuna(letra);
    const vistos = new Map<string, ValorCelula>();
    for (let l = origem.inicio.linha + 1; l <= origem.fim.linha; l++) {
      const p = { linha: l, coluna: c };
      const t = this.textoParaFiltro(p);
      if (!vistos.has(t)) vistos.set(t, this.valor(p));
    }
    return [...vistos.entries()].sort((a, b) => compararParaClassificar(a[1], b[1])).map(([t]) => t);
  }

  /**
   * Inserir → Tabela dinâmica. A origem precisa ter cabeçalho (todo campo com
   * nome) e pelo menos uma linha de dados; o destino, ficar fora dela e vazio.
   */
  inserirDinamica(origem: Intervalo, destino: Pos): Validacao {
    const o = this.recortar(origem);
    if (!o || o.fim.linha === o.inicio.linha)
      return { ok: false, mensagem: "Selecione a tabela inteira, com o cabeçalho e pelo menos uma linha de dados." };
    for (let c = o.inicio.coluna; c <= o.fim.coluna; c++)
      if (this.textoParaFiltro({ linha: o.inicio.linha, coluna: c }) === "")
        return { ok: false, mensagem: "O nome do campo da tabela dinâmica não é válido: toda coluna da origem precisa de um cabeçalho." };
    if (destino.linha >= this.linhas || destino.coluna >= this.colunas) return { ok: false, mensagem: "O destino fica fora da planilha." };
    if (contemPos(o, destino)) return { ok: false, mensagem: "O destino não pode ficar dentro dos dados de origem." };
    if (this.textos.has(`${destino.linha},${destino.coluna}`) || this.daDinamica(destino))
      return { ok: false, mensagem: `${paraEndereco(destino)} já tem conteúdo. Escolha uma célula vazia para a tabela dinâmica.` };
    if (this.dinamicas.length >= 3) return { ok: false, mensagem: "Este exercício aceita no máximo 3 tabelas dinâmicas." };
    this.mudarEstado(() => {
      this.dinamicas.push({
        origem: intervaloParaTexto(o),
        destino: paraEndereco(destino),
        linhas: [],
        colunas: [],
        valores: [],
        filtros: [],
      });
    });
    return { ok: true };
  }

  /** Troca a configuração (os campos nas quatro áreas) da tabela dinâmica `i`. */
  configurarDinamica(i: number, config: Dinamica): Validacao {
    if (!this.dinamicas[i]) return { ok: false, mensagem: "Tabela dinâmica inexistente." };
    if (!dinamicaSchema.safeParse(config).success)
      return { ok: false, mensagem: "Por ora a tabela dinâmica aceita 1 campo em Linhas, 1 em Colunas, até 3 em Valores (1 com campo em Colunas) e 2 em Filtros." };
    this.mudarEstado(() => {
      this.dinamicas[i] = structuredClone(config);
    });
    return { ok: true };
  }

  removerDinamica(i: number) {
    if (!this.dinamicas[i]) return;
    this.mudarEstado(() => {
      this.dinamicas.splice(i, 1);
    });
  }

  // --- validação de dados -------------------------------------------------------

  validacoes(): ValidacaoDados[] {
    return this.validacoesLista;
  }

  /** A regra que vale na célula (a mais nova que a cobre). */
  validacaoEm(end: string | Pos): ValidacaoDados | undefined {
    const p = this.pos(end);
    for (let i = this.validacoesLista.length - 1; i >= 0; i--) {
      try {
        if (contemPos(deIntervalo(this.validacoesLista[i].intervalo), p)) return this.validacoesLista[i];
      } catch {
        continue;
      }
    }
    return undefined;
  }

  /** Itens da setinha, se a célula tem validação de lista. */
  itensDaLista(end: string | Pos): string[] | null {
    const v = this.validacaoEm(end);
    return v?.permitir === "lista" ? this.itensDe(v) : null;
  }

  private itensDe(v: ValidacaoDados): string[] {
    return itensDaFonte(v.fonte, (t) => {
      try {
        // "=Listas!A2:A9": a lista vem de outra aba da pasta.
        const alvo = this.daAba(t);
        if (!alvo) return null;
        const [aba, end] = alvo;
        const i = aba.recortar(deIntervalo(end.replace(/^'(.*)'$/, "$1")));
        return i ? [...posicoes(i)].map((p) => aba.textoParaFiltro(p)) : null;
      } catch {
        return null;
      }
    });
  }

  /** O valor que está agora na célula passa na validação dela? */
  passaNaValidacao(end: string | Pos): boolean {
    const v = this.validacaoEm(end);
    if (!v) return true;
    const p = this.pos(end);
    const formula = () => {
      try {
        return this.avaliarFormulaEm(v.formula ?? "", deIntervalo(v.intervalo).inicio, p);
      } catch {
        return null;
      }
    };
    return passaNaValidacao(v, this.valor(p), this.textoParaFiltro(p), v.permitir === "lista" ? this.itensDe(v) : [], formula);
  }

  /** O alerta de erro se o valor atual da célula não passa (null se passa), com o estilo da regra. */
  private recusaDaValidacao(p: Pos): { mensagem: string; estilo: NonNullable<ValidacaoDados["estilo"]> } | null {
    if (this.passaNaValidacao(p)) return null;
    const regra = this.validacaoEm(p);
    const titulo = regra?.erro?.titulo.trim() || ERRO_PADRAO.titulo;
    const texto = regra?.erro?.texto.trim() || ERRO_PADRAO.texto;
    return { mensagem: `${titulo}: ${texto}`, estilo: regra?.estilo ?? "parar" };
  }

  /**
   * A regra aceitaria esta digitação nesta célula? Testa sem deixar rastro
   * (nem histórico): usado pela correção para conferir o comportamento.
   */
  aceitariaNaCelula(end: string | Pos, bruto: string): boolean {
    const p = this.posNaGrade(end);
    // Na saída de uma tabela dinâmica não se digita (e regravar apagaria o valor dela).
    if (!p || this.daDinamica(p)) return false;
    const k = `${p.linha},${p.coluna}`;
    // Guarda o conteúdo lido (não o texto): R$ e hora voltam com o mesmo tipo.
    const texto = this.textos.get(k) ?? "";
    const conteudo = this.conteudosCel.get(k) ?? null;
    this.gravar(p, bruto);
    const ok = this.passaNaValidacao(p);
    this.colocar(p, conteudo, texto);
    return ok;
  }

  /** "Circular Dados Inválidos": células preenchidas que furam a validação (o que já estava lá antes da regra). */
  celulasInvalidas(intervalo?: Intervalo): string[] {
    const area = intervalo ?? { inicio: { linha: 0, coluna: 0 }, fim: { linha: this.linhas - 1, coluna: this.colunas - 1 } };
    return [...posicoes(area)].filter((p) => this.validacaoEm(p) && !this.passaNaValidacao(p)).map(paraEndereco);
  }

  /**
   * Aplicar a validação na seleção. Como no Excel, ela substitui a regra das
   * células selecionadas: as regras antigas que ficam inteiramente dentro saem.
   */
  adicionarValidacao(entrada: ValidacaoDados): Validacao {
    // Títulos e textos das mensagens são cortados (como a janela do Excel); o resto, recusado com explicação.
    const v = structuredClone(entrada);
    if (v.entrada) v.entrada = { titulo: v.entrada.titulo.slice(0, 50), texto: v.entrada.texto.slice(0, 255) };
    if (v.erro) v.erro = { titulo: v.erro.titulo.slice(0, 50), texto: v.erro.texto.slice(0, 255) };
    const valida = validacaoDadosSchema.safeParse(v);
    if (!valida.success)
      return {
        ok: false,
        mensagem: mensagemDoSchema(valida.error, { valor1: "O valor (Mínimo)", valor2: "O valor (Máximo)", fonte: "A Fonte da lista", intervalo: "O intervalo" }),
      };
    let alvo: Intervalo;
    try {
      alvo = deIntervalo(v.intervalo);
    } catch {
      return { ok: false, mensagem: "Intervalo inválido." };
    }
    if (v.permitir === "personalizado") {
      const f = (v.formula ?? "").trim();
      if (!f.startsWith("=") || f.length < 2) return { ok: false, mensagem: "Escreva a fórmula da regra, começando com = (por exemplo, =B2<=C2)." };
      const idioma = validarIdioma(f);
      if (!idioma.ok) return idioma;
      let no: No;
      try {
        no = analisar(f);
      } catch {
        return { ok: false, mensagem: diagnosticarSintaxe(f) };
      }
      const faltam = [...naoImplementadas(no)];
      if (faltam.length) return { ok: false, mensagem: `A função ${faltam[0]} ainda não está disponível no simulador.` };
      v.formula = f;
    }
    if (v.permitir === "lista" && this.itensDe(v).length === 0) return { ok: false, mensagem: "A Fonte da lista está vazia. Escreva os itens separados por ponto e vírgula (Sim;Não) ou um intervalo (=$F$2:$F$5)." };
    if (v.permitir !== "lista" && v.permitir !== "personalizado") {
      const dois = (v.operador ?? "entre") === "entre" || v.operador === "fora";
      if (lerLimite(v.valor1) === null || (dois && lerLimite(v.valor2) === null))
        return { ok: false, mensagem: dois ? "Preencha o Mínimo e o Máximo com números (ou datas)." : "Preencha o valor com um número (ou data)." };
    }
    if (this.validacoesLista.length >= 20) return { ok: false, mensagem: "No máximo 20 regras de validação por planilha." };
    this.mudarEstado(() => {
      this.validacoesLista = this.validacoesLista.filter((x) => {
        const i = deIntervalo(x.intervalo);
        return !(contemPos(alvo, i.inicio) && contemPos(alvo, i.fim));
      });
      this.validacoesLista.push(structuredClone(v));
    });
    return { ok: true };
  }

  /** "Limpar Tudo" na janela: tira as regras que tocam o intervalo. */
  limparValidacoes(intervalo: Intervalo) {
    const toca = (x: ValidacaoDados) => {
      const i = deIntervalo(x.intervalo);
      return !(i.fim.linha < intervalo.inicio.linha || i.inicio.linha > intervalo.fim.linha || i.fim.coluna < intervalo.inicio.coluna || i.inicio.coluna > intervalo.fim.coluna);
    };
    if (!this.validacoesLista.some(toca)) return;
    this.mudarEstado(() => {
      this.validacoesLista = this.validacoesLista.filter((x) => !toca(x));
    });
  }

  // --- gráficos ------------------------------------------------------------------

  graficos(): Grafico[] {
    return this.graficosLista;
  }

  /** Categorias e séries do gráfico `i`, lidas da planilha agora (o gráfico acompanha os dados). */
  dadosDoGrafico(i: number): DadosGrafico {
    const g = this.graficosLista[i];
    if (!g) return { categorias: [], series: [], erro: "Gráfico inexistente." };
    return dadosDoGrafico(g, {
      valor: (p) => (p.linha < this.linhas && p.coluna < this.colunas ? this.valor(p) : null),
      texto: (p) => (p.linha < this.linhas && p.coluna < this.colunas ? this.textoParaFiltro(p) : ""),
      formato: (p) => this.formatoDe(p),
    });
  }

  /**
   * Inserir → Gráfico. Ancorado duas colunas depois dos dados (ou abaixo,
   * se não houver espaço), como o Excel faz perto da seleção.
   */
  inserirGrafico(tipo: Grafico["tipo"], dados: Intervalo): Validacao & { indice?: number } {
    const d = this.recortar(dados);
    if (!d) return { ok: false, mensagem: "Selecione os dados do gráfico." };
    if (this.graficosLista.length >= 4) return { ok: false, mensagem: "No máximo 4 gráficos por planilha." };
    const aoLado = { linha: d.inicio.linha, coluna: d.fim.coluna + 2 };
    const posicao = aoLado.coluna < this.colunas ? aoLado : { linha: Math.min(d.fim.linha + 2, this.linhas - 1), coluna: d.inicio.coluna };
    const g: Grafico = { tipo, dados: intervaloParaTexto(d), posicao: paraEndereco(posicao), titulo: "", rotulos: false, alternar: false };
    const teste = dadosDoGrafico(g, {
      valor: (p) => this.valor(p),
      texto: (p) => this.textoParaFiltro(p),
      formato: (p) => this.formatoDe(p),
    });
    if (teste.erro) return { ok: false, mensagem: `${teste.erro} Selecione a tabela com os rótulos e os valores.` };
    this.mudarEstado(() => {
      this.graficosLista.push(g);
    });
    return { ok: true, indice: this.graficosLista.length - 1 };
  }

  configurarGrafico(i: number, g: Grafico): Validacao {
    if (!this.graficosLista[i]) return { ok: false, mensagem: "Gráfico inexistente." };
    const novo = { ...structuredClone(g), titulo: (g.titulo ?? "").slice(0, 80) };
    if (!graficoSchema.safeParse(novo).success) return { ok: false, mensagem: "Configuração de gráfico inválida." };
    this.mudarEstado(() => {
      this.graficosLista[i] = novo;
    });
    return { ok: true };
  }

  removerGrafico(i: number) {
    if (!this.graficosLista[i]) return;
    this.mudarEstado(() => {
      this.graficosLista.splice(i, 1);
    });
  }

  private fotografar(): Foto {
    return {
      textos: new Map([...this.textos.keys()].map((k) => [k, this.fiel(k)])),
      formatos: new Map(this.formatos),
      formatosAluno: new Map(this.formatosAluno),
      negritos: new Set(this.negritos),
      bloqueadas: new Set(this.bloqueadas),
      preenchidasEditaveis: new Set(this.preenchidasEditaveis),
      filtro: this.filtro ? structuredClone(this.filtro) : null,
      permutacoes: structuredClone(this.permutacoes),
      dinamicas: structuredClone(this.dinamicas),
      condicionais: structuredClone(this.condicionais),
      graficos: structuredClone(this.graficosLista),
      validacoes: structuredClone(this.validacoesLista),
    };
  }

  private restaurar(f: Foto) {
    for (const k of new Set([...this.textos.keys(), ...f.textos.keys()])) {
      const novo = f.textos.get(k) ?? "";
      if ((this.textos.has(k) ? this.fiel(k) : "") === novo) continue;
      const [linha, coluna] = k.split(",").map(Number);
      this.gravar({ linha, coluna }, novo);
    }
    this.formatos = new Map(f.formatos);
    this.formatosAluno = new Map(f.formatosAluno);
    this.negritos = new Set(f.negritos);
    this.bloqueadas = new Set(f.bloqueadas);
    this.preenchidasEditaveis = new Set(f.preenchidasEditaveis);
    this.filtro = f.filtro ? structuredClone(f.filtro) : null;
    this.permutacoes = structuredClone(f.permutacoes);
    this.dinamicas = structuredClone(f.dinamicas);
    this.condicionais = structuredClone(f.condicionais);
    this.graficosLista = structuredClone(f.graficos);
    this.validacoesLista = structuredClone(f.validacoes);
  }

  /** Aplica uma mudança de recurso com um retrato antes e depois (para o Ctrl+Z). */
  private mudarEstado(fn: () => void) {
    const antes = this.fotografar();
    fn();
    this.registrar({ tipo: "estado", antes, depois: this.fotografar() });
    this.notificar();
  }

  destruir() {
    this.ouvintes.clear();
  }
}

/** Ajusta as referências relativas de uma fórmula copiada (B2 → B3); as com $ ficam. Fora da planilha vira #REF!. */
export function deslocarFormula(formula: string, dl: number, dc: number): string {
  const refs = referenciasDaFormula(formula);
  let out = formula;
  for (const r of [...refs].reverse()) {
    let quebrou = false;
    const novo = r.texto
      .split(":")
      .map((parte) =>
        parte.replace(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/, (_, cAbs: string, col: string, lAbs: string, lin: string) => {
          let c = [...col.toUpperCase()].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
          let l = Number(lin);
          if (!cAbs) c += dc;
          if (!lAbs) l += dl;
          if (c < 1 || l < 1) quebrou = true;
          let letras = "";
          for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) letras = String.fromCharCode(65 + ((n - 1) % 26)) + letras;
          return `${cAbs}${letras}${lAbs}${l}`;
        }),
      )
      .join(":");
    out = out.slice(0, r.inicio) + (quebrou ? "#REF!" : novo) + out.slice(r.fim);
  }
  return out;
}

/**
 * Pasta de trabalho: várias abas (cada uma uma Planilha) com um cálculo só,
 * para que `=Vendas!B2` funcione. Quando uma aba muda, as outras recalculam
 * o que é derivado (filtro, tabela dinâmica…) e avisam a tela.
 */
export class Pasta {
  readonly calculo = new Calculo();
  readonly abas: Planilha[];

  constructor(folhas: { nome: string; grade: Grade; formatos?: Record<string, Formato | undefined> }[]) {
    this.calculo.abas = folhas.map((f) => f.nome);
    // A:A e 1:1 vão até a maior aba (o motor ainda amplia até a última célula preenchida de cada uma).
    this.calculo.limites = {
      linhas: Math.max(...folhas.map((f) => f.grade.linhas)),
      colunas: Math.max(...folhas.map((f) => f.grade.colunas)),
    };
    this.abas = folhas.map((f, i) => new Planilha(f.grade, { formatos: f.formatos }, { calculo: this.calculo, aba: i }));
    this.calculo.linhaOculta = (l, aba) => this.abas[aba]?.linhaOculta(l) ?? false;
    for (const p of this.abas) {
      p.pasta = this;
      p.aoMudar = () => this.abas.forEach((o) => o !== p && o.refrescar());
    }
    // Recursos de uma aba (tabela dinâmica, regras) podem ler outra: recalcula com todas montadas.
    this.abas.forEach((p) => p.refrescar());
  }

  nomes(): string[] {
    return this.calculo.abas;
  }

  nomeDe(p: Planilha): string {
    return this.calculo.abas[p.aba];
  }

  aba(nome: string): Planilha | undefined {
    const i = this.calculo.indiceDaAba(nome);
    return i < 0 ? undefined : this.abas[i];
  }
}
