import { NextResponse } from "next/server";
import { clienteStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

/** Portal do Stripe: trocar o cartão e ver as faturas. Precisa ser ativado uma vez no painel do Stripe. */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  const { data } = await supabaseAdmin()
    .from("assinaturas")
    .select("stripe_cliente_id")
    .eq("usuario_id", usuario.id)
    .maybeSingle<{ stripe_cliente_id: string | null }>();
  if (!data?.stripe_cliente_id) return NextResponse.json({ erro: "Você ainda não tem pagamentos." }, { status: 400 });
  try {
    const sessao = await clienteStripe().billingPortal.sessions.create({
      customer: data.stripe_cliente_id,
      return_url: `${new URL(request.url).origin}/conta`,
    });
    return NextResponse.json({ url: sessao.url });
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_portal", mensagem: String(e) }));
    return NextResponse.json({ erro: "Não deu certo agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
}
