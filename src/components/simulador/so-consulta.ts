import type { Exercicio } from "@/content/schema";

/** Uma fórmula escrita no texto: `=SOMA(...)` em código ou =FUNÇÃO( solto. */
const FORMULA = /`\s*=|(^|[\s(])=\s*[A-ZÀ-Ú][A-ZÀ-Ú0-9.]*\s*\(/i;

/**
 * Questão de múltipla escolha com planilha ao lado em que a fórmula está no
 * enunciado ou nas alternativas: se a planilha aceitasse digitação, bastaria
 * colar a fórmula para ver a resposta. Nesses casos a planilha fica só para
 * consulta (dá para olhar os dados, não para escrever).
 */
export function planilhaSoConsulta(ex: Exercicio): boolean {
  if (ex.type !== "multiple_choice" || !ex.comPlanilha) return false;
  return ex.enunciado.some((p) => FORMULA.test(p)) || ex.opcoes.some((o) => FORMULA.test(o.texto) || o.texto.trim().startsWith("="));
}
