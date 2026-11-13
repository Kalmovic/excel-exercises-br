import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, contasLigadas } from "@/lib/supabase/config";

/**
 * Roda antes de cada página. Função única: renovar o token de login.
 *
 * Por quê: o token do Supabase vence em 1 hora. Server Components não podem
 * gravar cookies, então se o token venceu, a página não saberia quem é o
 * aluno (e um Pro veria o site como grátis). Aqui, antes de renderizar,
 * `getClaims()` renova o token quando precisa e devolvemos o cookie novo.
 *
 * Visitante sem cookie de login (a maioria) passa direto, sem custo.
 */
export async function proxy(request: NextRequest) {
  const temSessao = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!contasLigadas() || !temSessao) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (novos, cabecalhos) => {
        // O cookie novo vale para esta renderização (request) e volta ao navegador (resposta).
        for (const { name, value } of novos) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of novos) resposta.cookies.set(name, value, options);
        // Cabeçalhos anti-cache: uma resposta com cookie de login não pode ir para o CDN.
        for (const [k, v] of Object.entries(cabecalhos ?? {})) resposta.headers.set(k, v);
      },
    },
  });
  await supabase.auth.getClaims();
  return resposta;
}

export const config = {
  // Páginas e APIs; arquivos estáticos ficam de fora.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)"],
};
