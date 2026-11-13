/** Resultado dos testes de módulo, no navegador (na Fase 3 vai para a conta e conta para o certificado). */
const CHAVE = "excel-br:testes:v1";
export const APROVACAO = 4;

export type ResultadoTeste = { acertos: number; total: number; aprovado: boolean; em: string; tentativas: number };

export function lerTestes(): Record<string, ResultadoTeste> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}");
  } catch {
    return {};
  }
}

export function gravarTestes(t: Record<string, ResultadoTeste>) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(t));
  } catch {}
}

/** Guarda a tentativa. Aprovação, uma vez conquistada, não se perde numa nova tentativa pior. */
export function registrarTeste(modulo: string, acertos: number, total: number) {
  try {
    const tudo = lerTestes();
    const antes = tudo[modulo];
    const aprovadoAgora = acertos >= APROVACAO;
    tudo[modulo] = {
      acertos: Math.max(acertos, antes?.acertos ?? 0),
      total,
      aprovado: aprovadoAgora || !!antes?.aprovado,
      em: aprovadoAgora || !antes?.aprovado ? new Date().toISOString() : antes.em,
      tentativas: (antes?.tentativas ?? 0) + 1,
    };
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
    // Mesmo evento do progresso: a sincronização com a conta escuta este.
    window.dispatchEvent(new Event("excel-br:progresso"));
  } catch {}
}
