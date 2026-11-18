import { limitar } from "@/lib/limite";

/**
 * Recebe erros do navegador e grava no log do servidor como uma linha JSON
 * (fácil de filtrar nos Logs da Vercel por "erro_cliente").
 *
 * Anônimo, então com limite por IP: sem ele, qualquer um enche o log.
 */
export async function POST(req: Request) {
  const limite = limitar(req.headers, "erros");
  if (limite) return limite;
  const texto = (await req.text()).slice(0, 5000);
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  // null, número, texto ou lista não são um relatório de erro.
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) return new Response(null, { status: 400 });
  const campos = dados as Record<string, unknown>;
  const limpo = Object.fromEntries(
    ["mensagem", "pilha", "contexto", "url", "agente"].map((k) => [k, comoTexto(campos[k]).slice(0, 2000)]),
  );
  console.error(JSON.stringify({ tipo: "erro_cliente", ...limpo }));
  return new Response(null, { status: 204 });
}

/** String() quebra com {"toString": 1}; JSON.stringify, não. */
const comoTexto = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v));
