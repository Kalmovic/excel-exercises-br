/**
 * Formatação condicional: das regras para o estilo de cada célula. Função
 * pura; a `Planilha` fornece os valores e avalia as fórmulas das regras.
 *
 * Como no Excel: a regra criada por último tem prioridade no preenchimento;
 * barras de dados e escala de cor convivem com o destaque.
 */
import type { EstiloDestaque, RegraCondicional } from "@/content/schema";
import { deIntervalo, paraEndereco, posicoes, type Intervalo, type Pos } from "./address";
import type { ValorCelula } from "./format";
import { lerEntrada } from "./motor/entrada";

export type EstiloCelula = {
  destaque?: EstiloDestaque;
  /** Barra de dados: fração da largura (0 a 1). */
  barra?: number;
  /** Escala de cor: cor de fundo calculada. */
  escala?: string;
};

/** As cores dos estilos prontos do Excel (fundo claro e texto escuro). */
export const CORES_DESTAQUE: Record<EstiloDestaque, { fundo: string; texto: string; nome: string }> = {
  vermelho: { fundo: "#FFC7CE", texto: "#9C0006", nome: "Preenchimento Vermelho Claro e Texto Vermelho Escuro" },
  amarelo: { fundo: "#FFEB9C", texto: "#9C5700", nome: "Preenchimento Amarelo e Texto Amarelo Escuro" },
  verde: { fundo: "#C6EFCE", texto: "#006100", nome: "Preenchimento Verde e Texto Verde Escuro" },
};

export type LeitorCondicional = {
  valor: (p: Pos) => ValorCelula;
  /** Texto como aparece (para "Texto que Contém"). */
  texto: (p: Pos) => string;
  /** Avalia a fórmula da regra para a célula `p` (já ajustada a partir da primeira célula). */
  formula: (formula: string, origem: Pos, p: Pos) => ValorCelula;
  limites: { linhas: number; colunas: number };
  /**
   * Trabalho máximo por atualização: cada célula custa 1, e numa regra de
   * fórmula custa CUSTO_FORMULA (é avaliada célula a célula). A regra que não
   * cabe no que sobrou fica sem efeito (e as mais antigas que ela também).
   */
  orcamento?: number;
};

/** Custo de avaliar uma regra de fórmula numa célula, em unidades do orçamento. */
export const CUSTO_FORMULA = 20;

/** O que foi digitado no valor da regra: número ("1.000", "R$ 500", "10%") ou texto. */
function lerAlvo(t: string): number | string {
  const c = lerEntrada(t);
  if (c && "valor" in c && typeof c.valor === "number") return c.valor;
  return t.trim();
}

const vazia = (v: ValorCelula) => v === null || v === "";
const chaveDup = (v: ValorCelula) => (typeof v === "string" ? `t:${v.toUpperCase()}` : `n:${String(v)}`);
const verdade = (v: ValorCelula) => (typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : false);

function igual(v: ValorCelula, alvo: number | string) {
  if (typeof alvo === "number") return typeof v === "number" && Math.abs(v - alvo) < 1e-9;
  return typeof v === "string" && v.trim().toUpperCase() === alvo.toUpperCase();
}

/** Escala de 3 cores do Excel: vermelho (menor), amarelo (meio, percentil 50), verde (maior). */
function corEscala(x: number, min: number, meio: number, max: number): string {
  const mistura = (a: number[], b: number[], t: number) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const V = [248, 105, 107], A = [255, 235, 132], G = [99, 190, 123];
  const rgb = x <= meio ? mistura(V, A, meio === min ? 1 : (x - min) / (meio - min)) : mistura(A, G, max === meio ? 1 : (x - meio) / (max - meio));
  return `rgb(${rgb.join(",")})`;
}

const mediana = (ns: number[]) => {
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function calcularCondicionais(regras: RegraCondicional[], ler: LeitorCondicional): Map<string, EstiloCelula> {
  const out = new Map<string, EstiloCelula>();
  const dentro = (i: Intervalo): Intervalo | null => {
    const fim = { linha: Math.min(i.fim.linha, ler.limites.linhas - 1), coluna: Math.min(i.fim.coluna, ler.limites.colunas - 1) };
    return i.inicio.linha > fim.linha || i.inicio.coluna > fim.coluna ? null : { inicio: i.inicio, fim };
  };
  const estilo = (p: Pos) => {
    const k = paraEndereco(p);
    let e = out.get(k);
    if (!e) out.set(k, (e = {}));
    return e;
  };

  // Da mais nova para a mais antiga: o primeiro destaque que encontrar vale.
  let resta = ler.orcamento ?? Infinity;
  for (const r of [...regras].reverse()) {
    let int: Intervalo | null;
    try {
      int = dentro(deIntervalo(r.intervalo));
    } catch {
      continue;
    }
    if (!int) continue;
    const area = (int.fim.linha - int.inicio.linha + 1) * (int.fim.coluna - int.inicio.coluna + 1);
    const custo = area * (r.tipo === "formula" ? CUSTO_FORMULA : 1);
    if (custo > resta) break; // orçamento acabou: as regras mais antigas ficam sem efeito
    resta -= custo;
    const cels = [...posicoes(int)].map((p) => ({ p, v: ler.valor(p) }));
    const numeros = cels.map((c) => c.v).filter((v): v is number => typeof v === "number");

    if (r.tipo === "barras") {
      const max = Math.max(0, ...numeros);
      for (const c of cels) if (typeof c.v === "number" && max > 0) estilo(c.p).barra ??= Math.max(0, Math.min(1, c.v / max));
      continue;
    }
    if (r.tipo === "escala") {
      if (numeros.length === 0) continue;
      const min = Math.min(...numeros), max = Math.max(...numeros), meio = mediana(numeros);
      for (const c of cels) if (typeof c.v === "number") estilo(c.p).escala ??= corEscala(c.v, min, meio, max);
      continue;
    }

    let passa: (c: { p: Pos; v: ValorCelula }) => boolean;
    switch (r.tipo) {
      case "maior":
      case "menor": {
        const alvo = lerAlvo(r.valor);
        passa = ({ v }) =>
          typeof alvo === "number"
            ? typeof v === "number" && (r.tipo === "maior" ? v > alvo : v < alvo)
            : typeof v === "string" && (r.tipo === "maior" ? v.localeCompare(alvo, "pt-BR") > 0 : v.localeCompare(alvo, "pt-BR") < 0);
        break;
      }
      case "entre": {
        const a = lerAlvo(r.valor), b = lerAlvo(r.valor2);
        const [lo, hi] = typeof a === "number" && typeof b === "number" ? [Math.min(a, b), Math.max(a, b)] : [NaN, NaN];
        passa = ({ v }) => typeof v === "number" && v >= lo && v <= hi; // Entre inclui as pontas, como no Excel
        break;
      }
      case "igual": {
        const alvo = lerAlvo(r.valor);
        passa = ({ v }) => igual(v, alvo);
        break;
      }
      case "texto": {
        const t = r.valor.trim().toUpperCase();
        passa = ({ p, v }) => !vazia(v) && t !== "" && ler.texto(p).toUpperCase().includes(t);
        break;
      }
      case "duplicados":
      case "unicos": {
        const conta = new Map<string, number>();
        for (const c of cels) if (!vazia(c.v)) conta.set(chaveDup(c.v), (conta.get(chaveDup(c.v)) ?? 0) + 1);
        passa = ({ v }) => !vazia(v) && (conta.get(chaveDup(v))! > 1) === (r.tipo === "duplicados");
        break;
      }
      case "maiores":
      case "menores": {
        const ord = [...numeros].sort((a, b) => (r.tipo === "maiores" ? b - a : a - b));
        const corte = ord[Math.min(r.n, ord.length) - 1];
        // Empates no corte entram todos, como no Excel.
        passa = ({ v }) => typeof v === "number" && corte !== undefined && (r.tipo === "maiores" ? v >= corte : v <= corte);
        break;
      }
      case "acimaMedia":
      case "abaixoMedia": {
        const media = numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : NaN;
        passa = ({ v }) => typeof v === "number" && (r.tipo === "acimaMedia" ? v > media : v < media);
        break;
      }
      case "formula": {
        const origem = int.inicio;
        passa = ({ p }) => verdade(ler.formula(r.formula, origem, p));
        break;
      }
    }
    for (const c of cels) {
      const e = estilo(c.p);
      if (!e.destaque && passa(c)) e.destaque = r.estilo;
    }
  }
  for (const [k, e] of out) if (!e.destaque && e.barra === undefined && !e.escala) out.delete(k);
  return out;
}
