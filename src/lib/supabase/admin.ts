import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Cliente com a chave SECRETA: ignora o RLS. Só para o que nenhum aluno pode
 * fazer por conta própria, como gravar a assinatura ao receber o webhook do
 * Asaas. Nunca importar em código que vai para o navegador (o "server-only"
 * acima quebra o build se isso acontecer).
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !chave) throw new Error("SUPABASE_SECRET_KEY não configurada");
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
