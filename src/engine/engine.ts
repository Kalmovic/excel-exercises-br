import type { Dinamica, Exercicio, Formato, Grafico, Ordenacao, Recursos, RegraCondicional } from "@/content/schema";
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
import { diagnosticarSintaxe, funcoesUsadas, validarIdioma, type Validacao } from "./formula";
import { lerEntrada, normalizarFormula } from "./motor/entrada";
import { Calculo, FUNCOES, type Conteudo } from "./motor/nucleo";
import { analisar, type No } from "./motor/parser";
import { referenciasDaFormula } from "./referencias";
import { compararParaClassificar } from "./classificar";
import { calcularDinamica } from "./dinamica";
import { calcularCondicionais, type EstiloCelula } from "./condicional";
import { dadosDoGrafico, type DadosGrafico } from "./grafico";

export type Grade = Exercicio["grade"];

export type Alteracao = { endereco: string; bruto: string };

type FotoFormato = { end: string; formato?: Formato; doAluno?: Formato };
type Mudanca = { end: string; antes?: string; depois?: string };
/** Retrato completo (planilhas do simulador são pequenas): usado por classificar e filtrar. */
type Foto = {
  textos: Map<string, string>;
  formatos: Map<string, Formato>;
  formatosAluno: Map<string, Formato>;
  negritos: Set<string>;
  bloqueadas: Set<string>;
  filtro: Filtro | null;
  ordenacoes: Ordenacao[];
  dinamicas: Dinamica[];
  condicionais: RegraCondicional[];
  graficos: Grafico[];
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
  private filtro: Filtro | null = null;
  /** Classificações feitas desde o estado inicial (é isso que o progresso guarda). */
  private ordenacoes: Ordenacao[] = [];
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
  private inicial = { filtro: false, dinamicas: false, condicionais: false, graficos: false };
  private graficosLista: Grafico[] = [];
  /** Células editáveis que o exercício já traz preenchidas (para gravar quando o aluno as apaga). */
  private preenchidasEditaveis = new Set<string>();
  /** Regras de formatação condicional (a última tem prioridade) e o estilo que cada célula ganhou. */
  private condicionais: RegraCondicional[] = [];
  private estilos = new Map<string, EstiloCelula>();

  constructor(grade: Grade, extras: { formatos?: Record<string, Grade["celulas"][string]["formato"]> } = {}) {
    this.linhas = grade.linhas;
    this.colunas = grade.colunas;
    this.calculo.linhaOculta = (l) => this.ocultas.has(l);
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
      };
      this.aplicarRecursos(grade.recursos, { inicial: true });
    }
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
    this.atualizarDerivados();
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
    return this.negritos.has(end) || this.negritosDinamicas.has(end);
  }

  /** Conteúdo bruto de todas as células preenchidas (para correção e progresso). Derramadas não entram. */
  /**
   * O que o aluno escreveu (o que o progresso guarda e o certificado reenvia):
   * as células editáveis, e "" nas que o exercício trazia preenchidas e o
   * aluno apagou (sem isso, o valor original voltaria ao restaurar).
   */
  conteudosDoAluno(): Record<string, string> {
    const out = Object.fromEntries(Object.entries(this.conteudos()).filter(([end]) => !this.bloqueada(end)));
    for (const end of this.preenchidasEditaveis) if (!(end in out) && !this.bloqueada(end)) out[end] = "";
    return out;
  }

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
    const motivo = this.motivoBloqueio(end);
    if (motivo) return { ok: false, mensagem: motivo };
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
    else if (acao.tipo === "estado") this.restaurar(acao.antes);
    else this.aplicar([...acao.mudancas].reverse(), "antes");
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
    this.notificar();
  }

  // --- recursos: filtro e classificação -------------------------------------

  /** Configuração atual dos recursos (o que o progresso guarda e o certificado reenvia). */
  recursos(): Recursos {
    const r: Recursos = {};
    if (this.filtro)
      r.filtro = {
        intervalo: intervaloParaTexto(this.filtro.intervalo),
        criterios: Object.fromEntries(Object.entries(this.filtro.criterios).map(([c, valores]) => [c, { valores }])),
      };
    else if (this.inicial.filtro) r.filtro = null; // o aluno desligou o filtro que o exercício trazia
    if (this.ordenacoes.length) r.ordenacoes = this.ordenacoes.map((o) => structuredClone(o));
    if (this.dinamicas.length || this.inicial.dinamicas) r.dinamicas = structuredClone(this.dinamicas);
    if (this.condicionais.length || this.inicial.condicionais) r.condicionais = structuredClone(this.condicionais);
    if (this.graficosLista.length || this.inicial.graficos) r.graficos = structuredClone(this.graficosLista);
    return r;
  }

  /**
   * Restaura recursos salvos: refaz as classificações na ordem e liga o filtro.
   * Sem histórico (Ctrl+Z não desfaz o que foi restaurado). `inicial`: estado do
   * próprio exercício, que não conta como classificação feita pelo aluno.
   */
  aplicarRecursos(r: Recursos, { inicial = false } = {}) {
    for (const o of r.ordenacoes ?? []) {
      const int = this.recortar(deIntervalo(o.intervalo));
      if (!int) continue;
      this.ordenar(int, o);
      if (!inicial) this.ordenacoes.push(structuredClone(o));
    }
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
    this.atualizarDerivados();
    this.versao++;
    this.ouvintes.forEach((fn) => fn());
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

  private atualizarOcultas() {
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
  classificar(o: Ordenacao) {
    const int = this.recortar(deIntervalo(o.intervalo));
    if (!int) return;
    this.mudarEstado(() => {
      this.ordenar(int, o);
      this.ordenacoes.push(structuredClone(o));
    });
  }

  private ordenar(int: Intervalo, o: Ordenacao) {
    const primeira = int.inicio.linha + (o.cabecalho ? 1 : 0);
    if (primeira >= int.fim.linha) return;
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
    const cols = Array.from({ length: int.fim.coluna - int.inicio.coluna + 1 }, (_, i) => int.inicio.coluna + i);
    const linhaDe = (l: number) =>
      cols.map((c) => {
        const end = paraEndereco({ linha: l, coluna: c });
        return {
          texto: this.textos.get(`${l},${c}`) ?? "",
          formato: this.formatos.get(end),
          aluno: this.formatosAluno.get(end),
          negrito: this.negritos.has(end),
          bloqueada: this.bloqueadas.has(end),
        };
      });
    const fotos = ordem.map(linhaDe);
    fotos.forEach((foto, i) => {
      const destino = primeira + i;
      const origem = ordem[i];
      cols.forEach((c, j) => {
        const x = foto[j];
        const end = paraEndereco({ linha: destino, coluna: c });
        this.gravar({ linha: destino, coluna: c }, x.texto.startsWith("=") ? deslocarFormula(x.texto, destino - origem, 0) : x.texto);
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
    this.atualizarDinamicas();
    this.atualizarOcultas();
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
    });
  }

  /** Avalia a fórmula de uma regra escrita para `origem`, ajustada para a célula `p` (como copiar a fórmula). */
  private avaliarFormulaEm(formula: string, origem: Pos, p: Pos): ValorCelula {
    try {
      const f = deslocarFormula(formula, p.linha - origem.linha, p.coluna - origem.coluna);
      return this.calculo.avaliarAvulsa(analisar(f));
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
      if (!this.textos.has(k)) this.calculo.definir(l, c, null);
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
        this.calculo.definir(p.linha, p.coluna, { valor: x.valor, tipo });
        if (x.negrito) this.negritosDinamicas.add(end);
        if (x.formatoDe) {
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
  configurarDinamica(i: number, config: Dinamica) {
    if (!this.dinamicas[i]) return;
    this.mudarEstado(() => {
      this.dinamicas[i] = structuredClone(config);
    });
  }

  removerDinamica(i: number) {
    if (!this.dinamicas[i]) return;
    this.mudarEstado(() => {
      this.dinamicas.splice(i, 1);
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

  configurarGrafico(i: number, g: Grafico) {
    if (!this.graficosLista[i]) return;
    this.mudarEstado(() => {
      this.graficosLista[i] = structuredClone(g);
    });
  }

  removerGrafico(i: number) {
    if (!this.graficosLista[i]) return;
    this.mudarEstado(() => {
      this.graficosLista.splice(i, 1);
    });
  }

  private fotografar(): Foto {
    return {
      textos: new Map(this.textos),
      formatos: new Map(this.formatos),
      formatosAluno: new Map(this.formatosAluno),
      negritos: new Set(this.negritos),
      bloqueadas: new Set(this.bloqueadas),
      filtro: this.filtro ? structuredClone(this.filtro) : null,
      ordenacoes: structuredClone(this.ordenacoes),
      dinamicas: structuredClone(this.dinamicas),
      condicionais: structuredClone(this.condicionais),
      graficos: structuredClone(this.graficosLista),
    };
  }

  private restaurar(f: Foto) {
    for (const k of new Set([...this.textos.keys(), ...f.textos.keys()])) {
      const novo = f.textos.get(k) ?? "";
      if ((this.textos.get(k) ?? "") === novo) continue;
      const [linha, coluna] = k.split(",").map(Number);
      this.gravar({ linha, coluna }, novo);
    }
    this.formatos = new Map(f.formatos);
    this.formatosAluno = new Map(f.formatosAluno);
    this.negritos = new Set(f.negritos);
    this.bloqueadas = new Set(f.bloqueadas);
    this.filtro = f.filtro ? structuredClone(f.filtro) : null;
    this.ordenacoes = structuredClone(f.ordenacoes);
    this.dinamicas = structuredClone(f.dinamicas);
    this.condicionais = structuredClone(f.condicionais);
    this.graficosLista = structuredClone(f.graficos);
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
