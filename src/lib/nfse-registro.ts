import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinhaNota, RegistroNotas } from "@/lib/nfse";

/** A tabela notas_fiscais (com a chave secreta: o aluno não lê nem escreve). */
export function registroSupabase(admin: SupabaseClient): RegistroNotas {
  const tabela = () => admin.from("notas_fiscais");
  const falhou = (onde: string, erro: { message: string } | null) => {
    if (erro) throw new Error(`notas_fiscais (${onde}): ${erro.message}`);
  };
  return {
    async buscar(origem) {
      const { data, error } = await tabela().select("*").eq("origem", origem).maybeSingle<LinhaNota>();
      falhou("buscar", error);
      return data;
    },
    async salvar({ origem, ...campos }) {
      const agora = new Date().toISOString();
      // Linha nova (com valor e descrição) entra com insert; o resto é update pela origem.
      // Upsert parcial não serve: o Postgres confere os NOT NULL antes de ver o conflito.
      const { error } =
        campos.valor !== undefined
          ? await tabela().upsert({ origem, ...campos, atualizado_em: agora }, { onConflict: "origem", ignoreDuplicates: true })
          : await tabela().update({ ...campos, atualizado_em: agora }).eq("origem", origem);
      falhou("salvar", error);
    },
    async porPagamento(pagamento) {
      const { data, error } = await tabela().select("*").eq("pagamento", pagamento).returns<LinhaNota[]>();
      falhou("porPagamento", error);
      return data ?? [];
    },
  };
}
