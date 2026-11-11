/**
 * Envia um erro do navegador para /api/erros, que grava no log do servidor
 * (na Vercel: Logs do projeto). Sem conta externa; troque por Sentry quando
 * o volume justificar.
 */
const enviados = new Set<string>();

export function reportarErro(erro: unknown, contexto: string) {
  try {
    const e = erro instanceof Error ? erro : new Error(String(erro));
    const chave = `${contexto}:${e.message}`;
    if (enviados.has(chave) || enviados.size > 20) return; // sem enxurrada
    enviados.add(chave);
    const corpo = JSON.stringify({
      mensagem: e.message.slice(0, 500),
      pilha: (e.stack ?? "").slice(0, 2000),
      contexto,
      url: location.pathname,
      agente: navigator.userAgent.slice(0, 200),
    });
    if (!navigator.sendBeacon?.("/api/erros", new Blob([corpo], { type: "application/json" }))) {
      void fetch("/api/erros", { method: "POST", body: corpo, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // reportar erro nunca pode gerar outro erro
  }
}
