"use server";

import { refresh } from "next/cache";
import { supabaseServidor, usuarioAtual } from "@/lib/supabase/servidor";

export type ResultadoRemover = "removido" | "nao_membro" | "nao_gestor" | "erro";

/**
 * Painel do gestor: tira uma pessoa da equipe (a vaga fica livre para outra).
 * A função do banco só aceita o gestor da organização dessa pessoa.
 */
export async function removerMembro(usuarioId: string): Promise<ResultadoRemover> {
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) return "nao_membro";
  if (!(await usuarioAtual())) return "nao_gestor";
  const supabase = await supabaseServidor();
  if (!supabase) return "erro";
  const { data, error } = await supabase.rpc("remover_membro", { p_usuario: usuarioId });
  if (error) {
    console.error(JSON.stringify({ tipo: "erro_remover_membro", mensagem: error.message }));
    return "erro";
  }
  if (data === "removido") refresh();
  return data === "removido" || data === "nao_membro" || data === "nao_gestor" ? data : "erro";
}
