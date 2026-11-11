import { deEndereco, deIntervalo, paraEndereco, posicoes } from "@/engine/address";
import type { Exercicio } from "./schema";

/**
 * Células pintadas de amarelo como "do exercício". Tipos em que o destaque
 * entregaria a resposta (clicar, selecionar, responder) não destacam nada.
 */
export function celulasDestacadas(ex: Exercicio): string[] {
  switch (ex.type) {
    case "formula":
    case "type_value":
      return ex.alvos.map((a) => a.celula);
    case "format_cell":
      return ex.alvos.flatMap((a) => [...posicoes(deIntervalo(a.intervalo))].map(paraEndereco));
    case "text_answer":
    case "click_cell":
    case "select_range":
    case "multiple_choice":
      return [];
  }
}

/** Texto curto para "Células do exercício" (ex.: "B2:B5", "E2, E3, E4"). */
export function descricaoAlvos(ex: Exercicio): string | null {
  if (ex.type === "format_cell") return ex.alvos.map((a) => a.intervalo).join(", ");
  const cels = celulasDestacadas(ex);
  if (cels.length === 0) return null;
  return cels.length > 3 ? agruparEmIntervalos(cels) : cels.join(", ");
}

/** ["E2","E3","E4","F2","F3","F8"] -> "E2:E4, F2:F3, F8" (trechos contínuos de cada coluna). */
export function agruparEmIntervalos(cels: string[]): string {
  const pos = cels.map(deEndereco).sort((a, b) => a.coluna - b.coluna || a.linha - b.linha);
  const partes: string[] = [];
  let inicio = pos[0];
  let fim = pos[0];
  for (const p of [...pos.slice(1), null]) {
    if (p && p.coluna === fim.coluna && p.linha === fim.linha + 1) {
      fim = p;
      continue;
    }
    partes.push(inicio === fim ? paraEndereco(inicio) : `${paraEndereco(inicio)}:${paraEndereco(fim)}`);
    if (p) inicio = fim = p;
  }
  return partes.join(", ");
}
