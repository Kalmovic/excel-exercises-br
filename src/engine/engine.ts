import { DetailedCellError, ErrorType, HyperFormula } from "hyperformula";
import type { Exercicio, Formato } from "@/content/schema";
import {
  deEndereco,
  normalizar,
  paraEndereco,
  posicoes,
  type Intervalo,
  type Pos,
} from "./address";
import { formatarValor, type TipoDetalhado, type ValorCelula } from "./format";
import {
  diagnosticarSintaxe,
  funcoesUsadas,
  paraExibicao,
  paraMotor,
  validarIdioma,
  type Validacao,
} from "./formula";
import { CONFIG_PT_BR, garantirRegistro } from "./ptBR";

const SHEET = 0;

export type Grade = Exercicio["grade"];

export type Alteracao = { endereco: string; bruto: string };

/** Ajustes de entrada que o Excel aceita e o HyperFormula não. */
function normalizarEntrada(bruto: string): string {
  const s = bruto.trim() === "" ? "" : bruto;
  if (s.startsWith("=")) return paraMotor(s);
  // "R$ 1.234,50" -> "R$1.234,50"
  return s.replace(/^(-?)R\$\s+/, "$1R$");
}

/**
 * Adapter do motor de fórmulas. A UI só conversa com esta classe,
 * então dá para trocar o HyperFormula sem mexer nos componentes.
 *
 * Também funciona como "store externo" para `useSyncExternalStore`.
 */
type FotoFormato = { end: string; formato?: Formato; doAluno?: Formato };
type AcaoHistorico =
  | { tipo: "motor"; passos: number }
  | { tipo: "formato"; antes: FotoFormato[]; depois: FotoFormato[] };

export class Planilha {
  readonly linhas: number;
  readonly colunas: number;
  private hf: HyperFormula;
  private versao = 0;
  private ouvintes = new Set<() => void>();
  private bloqueadas = new Set<string>();
  private negritos = new Set<string>();
  private formatos = new Map<string, Formato>();
  /** Formatos aplicados pelo aluno (barra R$ / %), para salvar no progresso. */
  private formatosAluno = new Map<string, Formato>();
  /**
   * Histórico próprio para o Ctrl+Z: intercala operações do motor (que tem o
   * seu undo, contado em passos) e de formatação (que fica fora dele).
   */
  private historico: AcaoHistorico[] = [];
  private refeitos: AcaoHistorico[] = [];
  private area: Intervalo | null = null; // última área copiada

  constructor(grade: Grade, extras: { formatos?: Record<string, Grade["celulas"][string]["formato"]> } = {}) {
    garantirRegistro();
    this.linhas = grade.linhas;
    this.colunas = grade.colunas;
    // `null` = célula vazia. String vazia conta como conteúdo e bloquearia o spill.
    const dados: (string | null)[][] = Array.from({ length: grade.linhas }, () =>
      Array.from({ length: grade.colunas }, () => null),
    );
    for (const [end, cel] of Object.entries(grade.celulas)) {
      const { linha, coluna } = deEndereco(end);
      dados[linha][coluna] = normalizarEntrada(cel.entrada) || null;
      if (cel.bloqueada ?? cel.entrada !== "") this.bloqueadas.add(end);
      if (cel.formato) this.formatos.set(end, cel.formato);
      if (cel.negrito) this.negritos.add(end);
    }
    for (const [end, f] of Object.entries(extras.formatos ?? {})) if (f) this.formatos.set(end, f);
    this.hf = HyperFormula.buildFromArray(dados, {
      ...CONFIG_PT_BR,
      undoLimit: 1000,
    });
  }

  /** Monta a planilha de um exercício, aplicando também os formatos das células-alvo. */
  static deExercicio(ex: Exercicio) {
    return new Planilha(ex.grade, {
      formatos:
        ex.type === "formula" ? Object.fromEntries(ex.alvos.map((a) => [a.celula, a.formato])) : {},
    });
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
    this.versao++;
    this.ouvintes.forEach((fn) => fn());
  }

  // --- leitura -------------------------------------------------------------

  private addr(end: string | Pos) {
    const p = typeof end === "string" ? deEndereco(end) : end;
    return { sheet: SHEET, row: p.linha, col: p.coluna };
  }

  valor(end: string | Pos): ValorCelula {
    const v = this.hf.getCellValue(this.addr(end));
    if (v instanceof DetailedCellError) return { erro: v.value };
    return v as ValorCelula;
  }

  tipo(end: string | Pos): TipoDetalhado {
    return this.hf.getCellValueDetailedType(this.addr(end)) as TipoDetalhado;
  }

  /** Mensagem de erro do motor (em inglês), útil para depuração e para o tutor de IA. */
  mensagemErro(end: string | Pos): string | undefined {
    const v = this.hf.getCellValue(this.addr(end));
    return v instanceof DetailedCellError ? v.message : undefined;
  }

  /** O que aparece na barra de fórmulas. */
  bruto(end: string | Pos): string {
    const s = this.hf.getCellSerialized(this.addr(end));
    if (s === null || s === undefined) return "";
    if (typeof s === "string") return paraExibicao(s);
    if (typeof s === "number") return String(s).replace(".", ",");
    if (typeof s === "boolean") return s ? "VERDADEIRO" : "FALSO";
    return String(s);
  }

  /**
   * A fórmula depende do próprio resultado (ex.: `=SOMA(B2:B8)` dentro de B8).
   * O HyperFormula devolve #CYCLE!; o Excel mostra 0 e um aviso, e é isso que
   * reproduzimos na exibição.
   */
  circular(end: string | Pos): boolean {
    const v = this.hf.getCellValue(this.addr(end));
    return v instanceof DetailedCellError && v.type === ErrorType.CYCLE;
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
    if (this.circular(e)) return formatarValor(0, "NUMBER_RAW", this.formatos.get(e));
    return formatarValor(this.valor(e), this.tipo(e), this.formatos.get(e));
  }

  temFormula(end: string | Pos): boolean {
    return this.hf.doesCellHaveFormula(this.addr(end));
  }

  /** Célula preenchida por uma fórmula de array (FILTRO, ÚNICO…) que derramou. */
  derramada(end: string | Pos): boolean {
    return this.hf.isCellPartOfArray(this.addr(end)) && !this.temFormula(end);
  }

  funcoesUsadas(end: string | Pos): string[] {
    return funcoesUsadas(this.bruto(end));
  }

  bloqueada(end: string | Pos): boolean {
    return this.bloqueadas.has(typeof end === "string" ? end : paraEndereco(end));
  }

  formatoDe(end: string | Pos): Formato | undefined {
    return this.formatos.get(typeof end === "string" ? end : paraEndereco(end));
  }

  /**
   * Aplica um formato (barra R$ / %). Vale também para células bloqueadas:
   * a trava é do conteúdo, não da aparência. Fica fora do HyperFormula,
   * por isso tem um histórico próprio (ver `desfazer`).
   */
  formatar(intervalo: Intervalo, formato: Formato) {
    const antes: FotoFormato[] = [];
    const depois: FotoFormato[] = [];
    for (const p of posicoes(intervalo)) {
      const end = paraEndereco(p);
      antes.push({ end, formato: this.formatos.get(end), doAluno: this.formatosAluno.get(end) });
      depois.push({ end, formato, doAluno: formato });
    }
    this.aplicarFormatos(depois);
    this.registrar({ tipo: "formato", antes, depois });
    this.notificar();
  }

  private aplicarFormatos(fotos: FotoFormato[]) {
    for (const { end, formato, doAluno } of fotos) {
      if (formato) this.formatos.set(end, formato);
      else this.formatos.delete(end);
      if (doAluno) this.formatosAluno.set(end, doAluno);
      else this.formatosAluno.delete(end);
    }
  }

  private registrar(acao: AcaoHistorico) {
    this.historico.push(acao);
    if (this.historico.length > 200) this.historico.shift();
    this.refeitos = [];
  }

  /** Depois de restaurar o progresso salvo: Ctrl+Z não deve apagar o que foi restaurado. */
  limparHistorico() {
    this.historico = [];
    this.refeitos = [];
    this.hf.clearUndoStack();
    this.hf.clearRedoStack();
  }

  formatosDoAluno(): Record<string, Formato> {
    return Object.fromEntries(this.formatosAluno);
  }

  negrito(end: string): boolean {
    return this.negritos.has(end);
  }

  /** Conteúdo bruto de todas as células não vazias (para correção e progresso). */
  conteudos(): Record<string, string> {
    const out: Record<string, string> = {};
    for (let linha = 0; linha < this.linhas; linha++)
      for (let coluna = 0; coluna < this.colunas; coluna++) {
        // Células preenchidas por derramamento (FILTRO, ÚNICO…) não são conteúdo:
        // regravá-las como valor bloquearia o próprio derramamento (#DESPEJAR!).
        if (this.derramada({ linha, coluna })) continue;
        const b = this.bruto({ linha, coluna });
        if (b !== "") out[paraEndereco({ linha, coluna })] = b;
      }
    return out;
  }

  // --- escrita -------------------------------------------------------------

  /** Valida (idioma pt-BR) e grava. Não grava se a validação falhar. */
  definir(end: string | Pos, bruto: string): Validacao {
    if (this.bloqueada(end)) {
      return { ok: false, mensagem: "Esta célula faz parte dos dados do exercício e não pode ser alterada." };
    }
    const v = validarIdioma(bruto.trim());
    if (!v.ok) return v;
    const entrada = normalizarEntrada(bruto);
    // Fórmula que o motor não consegue ler: recusa com explicação (o Excel
    // também não deixa gravar), em vez de gravar e mostrar #ERROR!.
    if (entrada.startsWith("=") && !this.hf.validateFormula(entrada)) {
      return { ok: false, mensagem: diagnosticarSintaxe(entrada) };
    }
    this.hf.setCellContents(this.addr(end), entrada || null);
    this.registrar({ tipo: "motor", passos: 1 });
    this.notificar();
    return { ok: true };
  }

  /** Grava várias células de uma vez, sem validação de idioma (uso interno e restauração). */
  definirVarias(alteracoes: Alteracao[]) {
    this.hf.batch(() => {
      for (const { endereco, bruto } of alteracoes) {
        if (this.bloqueada(endereco)) continue;
        this.hf.setCellContents(this.addr(endereco), normalizarEntrada(bruto) || null);
      }
    });
    this.registrar({ tipo: "motor", passos: 1 });
    this.notificar();
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
    this.hf.batch(() => {
      for (const p of posicoes(intervalo)) {
        if (!this.bloqueada(p)) this.hf.setCellContents(this.addr(p), null);
      }
    });
    this.registrar({ tipo: "motor", passos: 1 });
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
    // Cola célula a célula para respeitar células bloqueadas e o limite da grade.
    let passos = 0;
    for (let dl = 0; dl < altD; dl++)
      for (let dc = 0; dc < largD; dc++) {
        const alvo = { linha: destino.inicio.linha + dl, coluna: destino.inicio.coluna + dc };
        if (alvo.linha >= this.linhas || alvo.coluna >= this.colunas) continue;
        if (this.bloqueada(alvo)) continue;
        const fonte = {
          linha: origem.inicio.linha + (dl % altO),
          coluna: origem.inicio.coluna + (dc % largO),
        };
        if (fonte.linha === alvo.linha && fonte.coluna === alvo.coluna) continue;
        this.hf.copy({ start: this.addr(fonte), end: this.addr(fonte) });
        this.hf.paste(this.addr(alvo));
        passos++;
      }
    this.hf.clearClipboard();
    if (passos) this.registrar({ tipo: "motor", passos });
    this.notificar();
  }

  /** Ctrl+Z: desfaz a última ação, seja de conteúdo ou de formatação. */
  desfazer() {
    const acao = this.historico.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.antes);
    else for (let i = 0; i < acao.passos && this.hf.isThereSomethingToUndo(); i++) this.hf.undo();
    this.refeitos.push(acao);
    this.notificar();
  }

  /** Ctrl+Y / Ctrl+Shift+Z. */
  refazer() {
    const acao = this.refeitos.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.depois);
    else for (let i = 0; i < acao.passos && this.hf.isThereSomethingToRedo(); i++) this.hf.redo();
    this.historico.push(acao);
    this.notificar();
  }

  destruir() {
    this.hf.destroy();
    this.ouvintes.clear();
  }
}

export { normalizar };
