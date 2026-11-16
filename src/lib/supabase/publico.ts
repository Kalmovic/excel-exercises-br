import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, contasLigadas } from "./config";

/** Cliente sem sessão (como um visitante qualquer): para leituras públicas, como verificar certificado. */
export function supabasePublico() {
  if (!contasLigadas()) return null;
  return createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, { auth: { persistSession: false, autoRefreshToken: false } });
}
