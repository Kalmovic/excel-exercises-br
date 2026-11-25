import "server-only";
import { supabaseServidor } from "./supabase/servidor";

/**
 * O visitante tem plano Pro? Checado SEMPRE no servidor: o que é Pro nem
 * chega ao navegador de quem não é.
 *
 * Lê a sessão do cookie (por isso a página precisa de <Suspense> em volta) e
 * pergunta ao banco pela função `tem_acesso_pro`, a regra única do Pro:
 * assinatura própria com `acesso_ate` no futuro (gravado pelo webhook do
 * Stripe) OU membro de organização com licença em vigor (empresas).
 *
 * Se a função falhar (banco instável, migration ainda não aplicada), cai na
 * regra antiga, só a assinatura própria: quem pagou não perde o acesso.
 */
export async function usuarioEhPro(): Promise<boolean> {
  const supabase = await supabaseServidor();
  if (!supabase) return false;
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims?.sub) return false;
  const { data: pro, error } = await supabase.rpc("tem_acesso_pro");
  if (!error) return pro === true;
  console.error(JSON.stringify({ tipo: "erro_tem_acesso_pro", mensagem: error.message }));
  const { data } = await supabase.from("assinaturas").select("acesso_ate").maybeSingle<{ acesso_ate: string | null }>();
  return !!data?.acesso_ate && new Date(data.acesso_ate) > new Date();
}
