import { NextResponse } from "next/server";
import { cancelarAssinatura } from "@/lib/asaas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

/** Cancela a renovação do mensal. O período já pago continua valendo até acesso_ate. */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("assinaturas")
    .select("asaas_assinatura_id, acesso_ate")
    .eq("usuario_id", usuario.id)
    .maybeSingle<{ asaas_assinatura_id: string | null; acesso_ate: string | null }>();
  if (!data?.asaas_assinatura_id)
    return NextResponse.json({ erro: "Não há renovação automática para cancelar." }, { status: 400 });
  try {
    await cancelarAssinatura(data.asaas_assinatura_id);
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_cancelar", mensagem: String(e) }));
    return NextResponse.json({ erro: "Não deu certo agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
  await admin.from("assinaturas").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("usuario_id", usuario.id);
  return NextResponse.json({ acesso_ate: data.acesso_ate });
}
