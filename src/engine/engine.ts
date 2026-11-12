import type { Exercicio, Formato } from "@/content/schema";
import { deEndereco, paraEndereco, posicoes, type Intervalo, type Pos } from "./address";
import { formatarValor, type TipoDetalhado, type ValorCelula } from "./format";
import { diagnosticarSintaxe, funcoesUsadas, validarIdioma, type Validacao } from "./formula";
import { lerEntrada, normalizarFormula } from "./motor/entrada";
import { Calculo, FUNCOES, type Conteudo } from "./motor/nucleo";
import { analisar, type No } from "./motor/parser";
import { referenciasDaFormula } from "./referencias";

export type Grade = Exercicio["grade"];

export type Alteracao = { endereco: string; bruto: string };

type FotoFormato = { end: string; formato?: Formato; doAluno?: Formato };
type Mudanca = { end: string; antes?: string; depois?: string };
type AcaoHistorico = { tipo: "celulas"; mudancas: Mudanca[] } | { tipo: "formato"; antes: FotoFormato[]; depois: FotoFormato[] };

const pt = (n: number) => String(Math.round(n * 1e10) / 1e10).replace(".", ",");
const dois = (n: number) => String(n).padStart(2, "0");

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
  private calculo = new Calculo();
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

  constructor(grade: Grade, extras: { formatos?: Record<string, Grade["celulas"][string]["formato"]> } = {}) {
    this.linhas = grade.linhas;
    this.colunas = grade.colunas;
    for (const [end, cel] of Object.entries(grade.celulas)) {
      this.gravar(deEndereco(end), cel.entrada);
      if (cel.bloqueada ?? cel.entrada !== "") this.bloqueadas.add(end);
      if (cel.formato) this.formatos.set(end, cel.formato);
      if (cel.negrito) this.negritos.add(end);
    }
    for (const [end, f] of Object.entries(extras.formatos ?? {})) if (f) this.formatos.set(end, f);
  }

  /** Monta a planilha de um exercício, aplicando também os formatos das células-alvo. */
  static deExercicio(ex: Exercicio) {
    return new Planilha(ex.grade, {
      formatos: ex.type === "formula" ? Object.fromEntries(ex.alvos.map((a) => [a.celula, a.formato])) : {},
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

  private pos(end: string | Pos): Pos {
    return typeof end === "string" ? deEndereco(end) : end;
  }
  private chave(end: string | Pos) {
    const p = this.pos(end);
    return `${p.linha},${p.coluna}`;
  }

  valor(end: string | Pos): ValorCelula {
    const p = this.pos(end);
    return this.calculo.ler(p.linha, p.coluna);
  }

  tipo(end: string | Pos): TipoDetalhado {
    const p = this.pos(end);
    return this.calculo.tipo(p.linha, p.coluna);
  }

  /** Mensagem técnica do erro (o motor próprio já usa os nomes em português). */
  mensagemErro(end: string | Pos): string | undefined {
    const v = this.valor(end);
    return v !== null && typeof v === "object" ? v.erro : undefined;
  }

  /** O que aparece na barra de fórmulas. */
  bruto(end: string | Pos): string {
    return this.textos.get(this.chave(end)) ?? "";
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
    if (this.circular(e)) return formatarValor(0, "NUMBER_RAW", this.formatos.get(e));
    return formatarValor(this.valor(e), this.tipo(e), this.formatos.get(e));
  }

  temFormula(end: string | Pos): boolean {
    const p = this.pos(end);
    return this.calculo.temFormula(p.linha, p.coluna);
  }

  /** Célula preenchida por uma fórmula de array (FILTRO, ÚNICO…) que derramou. */
  derramada(end: string | Pos): boolean {
    const p = this.pos(end);
    return this.calculo.derramada(p.linha, p.coluna);
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
   * a trava é do conteúdo, não da aparência.
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
  }

  formatosDoAluno(): Record<string, Formato> {
    return Object.fromEntries(this.formatosAluno);
  }

  negrito(end: string): boolean {
    return this.negritos.has(end);
  }

  /** Conteúdo bruto de todas as células preenchidas (para correção e progresso). Derramadas não entram. */
  conteudos(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, t] of this.textos) {
      const [linha, coluna] = k.split(",").map(Number);
      out[paraEndereco({ linha, coluna })] = t;
    }
    return out;
  }

  // --- escrita -------------------------------------------------------------

  /** Grava sem validar (dados do exercício, restauração, colar). Devolve o texto anterior. */
  private gravar(p: Pos, bruto: string): string | undefined {
    const k = `${p.linha},${p.coluna}`;
    const antes = this.textos.get(k);
    let conteudo: Conteudo | null;
    let texto: string;
    try {
      conteudo = lerEntrada(bruto);
      texto = conteudo === null ? "" : "formula" in conteudo ? normalizarFormula(bruto) : this.textoDe(conteudo, bruto);
    } catch {
      conteudo = { formula: ERRO_DE_ESCRITA };
      texto = bruto.trim();
    }
    this.calculo.definir(p.linha, p.coluna, conteudo);
    if (texto === "") this.textos.delete(k);
    else this.textos.set(k, texto);
    return antes;
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

  /** Valida (idioma pt-BR e escrita) e grava. Não grava se a validação falhar. */
  definir(end: string | Pos, bruto: string): Validacao {
    if (this.bloqueada(end)) {
      return { ok: false, mensagem: "Esta célula faz parte dos dados do exercício e não pode ser alterada." };
    }
    const entrada = bruto.trim();
    const v = validarIdioma(entrada);
    if (!v.ok) return v;
    // Fórmula que não pode ser lida: recusa com explicação (o Excel também não deixa gravar).
    if (entrada.startsWith("=")) {
      let no: No;
      try {
        no = analisar(entrada);
      } catch {
        return { ok: false, mensagem: diagnosticarSintaxe(entrada) };
      }
      const faltam = [...naoImplementadas(no)];
      if (faltam.length) return { ok: false, mensagem: `A função ${faltam[0]} ainda não está disponível no simulador.` };
    }
    const p = this.pos(end);
    const antes = this.gravar(p, bruto);
    this.registrar({ tipo: "celulas", mudancas: [{ end: paraEndereco(p), antes, depois: this.textos.get(`${p.linha},${p.coluna}`) }] });
    this.notificar();
    return { ok: true };
  }

  /** Grava várias células de uma vez, sem validação de idioma (uso interno e restauração). */
  definirVarias(alteracoes: Alteracao[]) {
    const mudancas: Mudanca[] = [];
    for (const { endereco, bruto } of alteracoes) {
      if (this.bloqueada(endereco)) continue;
      const antes = this.gravar(deEndereco(endereco), bruto);
      mudancas.push({ end: endereco, antes, depois: this.textos.get(this.chave(endereco)) });
    }
    this.registrar({ tipo: "celulas", mudancas });
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
    const fonte = (l: number, c: number) => this.bruto({ linha: l, coluna: c });
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
      return { end: paraEndereco(alvo), antes, depois: this.textos.get(`${alvo.linha},${alvo.coluna}`) };
    });
    if (mudancas.length) this.registrar({ tipo: "celulas", mudancas });
    this.notificar();
  }

  /** Ctrl+Z: desfaz a última ação, seja de conteúdo ou de formatação. */
  desfazer() {
    const acao = this.historico.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.antes);
    else this.aplicar([...acao.mudancas].reverse(), "antes");
    this.refeitos.push(acao);
    this.notificar();
  }

  /** Ctrl+Y / Ctrl+Shift+Z. */
  refazer() {
    const acao = this.refeitos.pop();
    if (!acao) return;
    if (acao.tipo === "formato") this.aplicarFormatos(acao.depois);
    else this.aplicar(acao.mudancas, "depois");
    this.historico.push(acao);
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
