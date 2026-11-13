import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, contasLigadas } from "./config";

/**
 * Cliente do Supabase no servidor, agindo COMO o aluno deste request: usa o
 * token do cookie de login, então o RLS vale igual ao navegador. É o cliente
 * certo para quase tudo no servidor.
 *
 * Ler cookies torna a página dependente do request: com Cache Components, quem
 * chama isto precisa estar dentro de um <Suspense>.
 */
export async function supabaseServidor() {
  const loja = await cookies();
  if (!contasLigadas()) return null;
  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (novos) => {
        // Server Components não podem gravar cookies (só Server Actions, Route
        // Handlers e o proxy). A renovação do token acontece no proxy.ts.
        try {
          for (const { name, value, options } of novos) loja.set(name, value, options);
        } catch {}
      },
    },
  });
}

/**
 * Id do aluno logado, ou null. `getClaims` confere a assinatura do token de
 * login (não confia só no cookie): um cookie forjado não passa.
 */
export async function usuarioAtual(): Promise<{ id: string; email?: string } | null> {
  const supabase = await supabaseServidor();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email as string | undefined };
}
