import "server-only";

/**
 * O visitante tem plano Pro? Checado SEMPRE no servidor: o que é Pro nem
 * chega ao navegador de quem não é.
 *
 * Enquanto não existem contas (Fase 3), ninguém é Pro. Na Fase 3 isto lê a
 * sessão do Supabase e consulta `assinaturas.acesso_ate > now()`.
 */
export async function usuarioEhPro(): Promise<boolean> {
  return false;
}
