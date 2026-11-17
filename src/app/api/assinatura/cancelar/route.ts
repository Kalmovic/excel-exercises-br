import { NextResponse } from "next/server";
import { clienteStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

/** Cancela a renovação do mensal no fim do período: o tempo já pago continua valendo. */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("assinaturas")
    .select("stripe_assinatura_id, acesso_ate")
    .eq("usuario_id", usuario.id)
    .maybeSingle<{ stripe_assinatura_id: string | null; acesso_ate: string | null }>();
  if (!data?.stripe_assinatura_id) return NextResponse.json({ erro: "Não há renovação automática para cancelar." }, { status: 400 });
  try {
    await clienteStripe().subscriptions.update(data.stripe_assinatura_id, { cancel_at_period_end: true });
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_cancelar", mensagem: String(e) }));
    return NextResponse.json({ erro: "Não deu certo agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
  // O webhook (customer.subscription.updated) também marca; aqui já mostramos na hora.
  await admin.from("assinaturas").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("usuario_id", usuario.id);
  return NextResponse.json({ acesso_ate: data.acesso_ate });
}
