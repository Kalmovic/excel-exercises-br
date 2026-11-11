/**
 * Recebe erros do navegador e grava no log do servidor como uma linha JSON
 * (fácil de filtrar nos Logs da Vercel por "erro_cliente").
 */
export async function POST(req: Request) {
  const texto = (await req.text()).slice(0, 5000);
  let dados: Record<string, unknown> = {};
  try {
    dados = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const limpo = Object.fromEntries(
    ["mensagem", "pilha", "contexto", "url", "agente"].map((k) => [k, String(dados[k] ?? "").slice(0, 2000)]),
  );
  console.error(JSON.stringify({ tipo: "erro_cliente", ...limpo }));
  return new Response(null, { status: 204 });
}
