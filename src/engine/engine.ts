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
import { funcoesUsadas, paraExibicao, paraMotor, validarIdioma, type Validacao } from "./formula";
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
      undoLimit: 200,
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
   * então Ctrl+Z não desfaz formatação.
   */
  formatar(intervalo: Intervalo, formato: Formato) {
    for (const p of posicoes(intervalo)) {
      const end = paraEndereco(p);
      this.formatos.set(end, formato);
      this.formatosAluno.set(end, formato);
    }
    this.notificar();
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
    this.hf.setCellContents(this.addr(end), normalizarEntrada(bruto) || null);
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
    this.notificar();
  }

  limpar(intervalo: Intervalo) {
    this.hf.batch(() => {
      for (const p of posicoes(intervalo)) {
        if (!this.bloqueada(p)) this.hf.setCellContents(this.addr(p), null);
      }
    });
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
      }
    this.hf.clearClipboard();
    this.notificar();
  }

  desfazer() {
    if (this.hf.isThereSomethingToUndo()) {
      this.hf.undo();
      this.notificar();
    }
  }

  refazer() {
    if (this.hf.isThereSomethingToRedo()) {
      this.hf.redo();
      this.notificar();
    }
  }

  destruir() {
    this.hf.destroy();
    this.ouvintes.clear();
  }
}

export { normalizar };
