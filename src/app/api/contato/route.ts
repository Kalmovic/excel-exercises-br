import { contatoSchema } from "@/lib/contato";
import { limitar } from "@/lib/limite";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Recebe os formulários B2B ("fale com a gente" e "indicar uma empresa").
 *
 * O lead (nome, e-mail, mensagem…) é dado pessoal (LGPD): vai para a tabela
 * `contatos` do Supabase, que só o servidor lê e grava, e NUNCA para o log.
 * O log guarda só o tipo de formulário e o id da linha.
 *
 * Sem o Supabase configurado (testes locais), responde como se tivesse
 * gravado e registra só o aviso, sem os dados.
 */
export async function POST(req: Request) {
  const limite = limitar(req.headers, "contato");
  if (limite) return limite;
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
  const lead = Object.fromEntries(Object.entries(r.data).filter(([k]) => k !== "site"));
  const publico = r.data.formulario === "contato" ? r.data.publico : null;
  const resumo = { tipo: "lead_b2b", em: new Date().toISOString(), formulario: r.data.formulario, publico };

  if (!process.env.SUPABASE_SECRET_KEY) {
    console.log(JSON.stringify({ ...resumo, gravado: false }));
    return new Response(null, { status: 204 });
  }
  const { data, error } = await supabaseAdmin()
    .from("contatos")
    .insert({ formulario: r.data.formulario, publico, dados: lead, pagina: req.headers.get("referer")?.slice(0, 500) ?? null })
    .select("id")
    .single<{ id: number }>();
  if (error) {
    console.error(JSON.stringify({ tipo: "erro_lead_b2b", formulario: r.data.formulario, codigo: error.code }));
    return Response.json({ erro: "Não foi possível enviar agora. Tente de novo em alguns minutos." }, { status: 500 });
  }
  console.log(JSON.stringify({ ...resumo, id: data.id }));
  return new Response(null, { status: 204 });
}
