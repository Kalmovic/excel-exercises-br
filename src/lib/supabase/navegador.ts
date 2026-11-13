"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, contasLigadas } from "./config";

let cliente: SupabaseClient | null = null;

/**
 * Cliente do Supabase no navegador (um só por aba). Guarda a sessão em cookies,
 * para o servidor também saber quem está logado, e renova o token sozinho.
 * Devolve null quando as contas estão desligadas.
 */
export function supabaseNavegador(): SupabaseClient | null {
  if (!contasLigadas()) return null;
  cliente ??= createBrowserClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA);
  return cliente;
}
