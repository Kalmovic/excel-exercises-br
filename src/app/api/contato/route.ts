import { contatoSchema } from "@/lib/contato";

/**
 * Recebe os formulários B2B ("fale com a gente" e "indicar uma empresa").
 *
 * Provisório, até o backend: valida e grava uma linha JSON no log do servidor
 * (filtrar por "lead_b2b" nos Logs da Vercel). Com o Supabase, passa a inserir
 * na tabela de leads e a avisar a equipe por e-mail.
 */
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = JSON.parse((await req.text()).slice(0, 10_000));
  } catch {
    return Response.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const r = contatoSchema.safeParse(corpo);
  if (!r.success) return Response.json({ erro: r.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  // Robô preencheu o campo invisível: responde como se fosse sucesso e descarta.
  if (r.data.site) return new Response(null, { status: 204 });
  const { site: _site, ...lead } = r.data;
  console.log(JSON.stringify({ tipo: "lead_b2b", em: new Date().toISOString(), origem: req.headers.get("referer"), ...lead }));
  return new Response(null, { status: 204 });
}
