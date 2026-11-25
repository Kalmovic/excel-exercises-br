"use server";

import { codigoValido, type ResultadoConvite } from "@/lib/empresas";
import { supabaseServidor, usuarioAtual } from "@/lib/supabase/servidor";

const RESULTADOS: ResultadoConvite[] = ["entrou", "ja_membro", "invalido", "inativa", "vencida", "cancelada", "lotada", "outra_organizacao", "sem_login"];

/**
 * "Entrar na equipe": ocupa uma vaga da organização do convite. Quem decide
 * (vaga, validade, uma organização por pessoa) é a função do banco, que roda
 * como o aluno logado e trava a organização enquanto conta as vagas.
 */
export async function entrarNaEquipe(codigo: string): Promise<ResultadoConvite> {
  if (!codigoValido(codigo)) return "invalido";
  const usuario = await usuarioAtual();
  if (!usuario) return "sem_login";
  const supabase = await supabaseServidor();
  if (!supabase) return "erro";
  const { data, error } = await supabase.rpc("entrar_na_organizacao", { p_codigo: codigo });
  if (error) {
    console.error(JSON.stringify({ tipo: "erro_entrar_organizacao", mensagem: error.message }));
    return "erro";
  }
  const resultado = RESULTADOS.includes(data as ResultadoConvite) ? (data as ResultadoConvite) : "erro";
  console.log(JSON.stringify({ tipo: "convite_empresa", resultado }));
  return resultado;
}
