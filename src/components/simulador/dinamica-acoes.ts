import type { Dinamica, FuncaoValor } from "@/content/schema";

/**
 * As regras do painel de campos, como funções puras (testáveis sem tela).
 * Cada uma devolve a configuração nova ou um erro para mostrar ao aluno.
 */
export type Area = "filtros" | "colunas" | "linhas" | "valores";
export type Origem = { area: Area; indice: number } | null;
type Resultado = { config: Dinamica } | { erro: string };

export const NOMES_AREA: Record<Area, string> = { filtros: "Filtros", colunas: "Colunas", linhas: "Linhas", valores: "Valores" };

const tirarDe = (d: Dinamica, origem: Origem, letra: string): Dinamica => {
  if (!origem) return d;
  if (origem.area === "valores") return { ...d, valores: d.valores.filter((_, i) => i !== origem.indice) };
  if (origem.area === "filtros") return { ...d, filtros: d.filtros.filter((f) => f.campo !== letra) };
  return { ...d, [origem.area]: d[origem.area].filter((c) => c !== letra) };
};

/** Linhas, Colunas e Filtros: um campo fica em uma só delas. */
const tirarDasCategorias = (d: Dinamica, letra: string): Dinamica => ({
  ...d,
  linhas: d.linhas.filter((c) => c !== letra),
  colunas: d.colunas.filter((c) => c !== letra),
  filtros: d.filtros.filter((f) => f.campo !== letra),
});

/** Arrastar `letra` (de `origem`, ou da lista de campos) para `para`. */
export function moverCampo(d0: Dinamica, letra: string, para: Area, numerico: boolean, origem: Origem = null): Resultado {
  if (origem?.area === para && para !== "valores") return { config: d0 };
  let d = tirarDe(d0, origem, letra);
  if (para === "valores") {
    if (d.colunas.length && d.valores.length >= 1)
      return { erro: "Com um campo em Colunas, o simulador aceita um campo só em Valores. Tire o outro antes." };
    if (d.valores.length >= 3) return { erro: "No máximo 3 campos em Valores." };
    return { config: { ...d, valores: [...d.valores, { campo: letra, funcao: numerico ? "soma" : "contagem" }] } };
  }
  d = tirarDasCategorias(d, letra);
  if (para === "linhas") return { config: { ...d, linhas: [letra] } }; // por ora, um campo: o novo substitui
  if (para === "colunas") {
    if (d.valores.length > 1) return { erro: "Com mais de um campo em Valores, não dá para usar Colunas no simulador. Deixe só um em Valores." };
    return { config: { ...d, colunas: [letra] } };
  }
  if (d.filtros.length >= 2) return { erro: "No máximo 2 campos em Filtros." };
  return { config: { ...d, filtros: [...d.filtros, { campo: letra, valores: null }] } };
}

/** O campo está em alguma área? (a caixa de seleção da lista de campos) */
export const campoUsado = (d: Dinamica, letra: string) =>
  d.linhas.includes(letra) || d.colunas.includes(letra) || d.filtros.some((f) => f.campo === letra) || d.valores.some((v) => v.campo === letra);

/**
 * Marcar a caixa do campo, como no Excel: número vai para Valores (Soma);
 * texto vai para Linhas (ou Colunas, ou Filtros, se as outras já estiverem ocupadas).
 * Desmarcar tira o campo de todas as áreas.
 */
export function marcarCampo(d: Dinamica, letra: string, numerico: boolean): Resultado {
  if (campoUsado(d, letra)) return { config: { ...tirarDasCategorias(d, letra), valores: d.valores.filter((v) => v.campo !== letra) } };
  if (numerico) return moverCampo(d, letra, "valores", true);
  if (d.linhas.length === 0) return moverCampo(d, letra, "linhas", false);
  if (d.colunas.length === 0 && d.valores.length <= 1) return moverCampo(d, letra, "colunas", false);
  return moverCampo(d, letra, "filtros", false);
}

export function removerDaArea(d: Dinamica, area: Area, indice: number): Dinamica {
  if (area === "valores") return { ...d, valores: d.valores.filter((_, i) => i !== indice) };
  if (area === "filtros") return { ...d, filtros: d.filtros.filter((_, i) => i !== indice) };
  return { ...d, [area]: d[area].filter((_, i) => i !== indice) };
}

export const mudarFuncao = (d: Dinamica, indice: number, funcao: FuncaoValor): Dinamica => ({
  ...d,
  valores: d.valores.map((v, i) => (i === indice ? { ...v, funcao } : v)),
});

export const filtrarItens = (d: Dinamica, campo: string, valores: string[] | null): Dinamica => ({
  ...d,
  filtros: d.filtros.map((f) => (f.campo === campo ? { ...f, valores } : f)),
});
