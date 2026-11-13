import "server-only";
import { supabaseServidor } from "./supabase/servidor";

/**
 * O visitante tem plano Pro? Checado SEMPRE no servidor: o que é Pro nem
 * chega ao navegador de quem não é.
 *
 * Lê a sessão do cookie (por isso a página precisa de <Suspense> em volta) e a
 * linha do aluno em `assinaturas`, pelo RLS: cada um só enxerga a própria.
 * Pro = `acesso_ate` no futuro. Quem grava `acesso_ate` é o webhook do Asaas.
 */
export async function usuarioEhPro(): Promise<boolean> {
  const supabase = await supabaseServidor();
  if (!supabase) return false;
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims?.sub) return false;
  const { data } = await supabase.from("assinaturas").select("acesso_ate").maybeSingle<{ acesso_ate: string | null }>();
  return !!data?.acesso_ate && new Date(data.acesso_ate) > new Date();
}
