import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/destino";
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, contasLigadas } from "@/lib/supabase/config";

/**
 * Destino do link do e-mail de login (alternativa ao código de 6 dígitos).
 *
 * Como funciona (fluxo "PKCE"): ao pedir o e-mail, o navegador guardou um
 * segredo num cookie. O link traz um `code` de uso único; aqui trocamos
 * code + segredo por uma sessão. Por isso o link só funciona no mesmo
 * navegador em que o e-mail foi pedido: quem interceptar só o link não entra.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  // Só caminhos do próprio site (ver src/lib/destino.ts: "/\\evil.com" levaria para outro).
  const proximo = destinoSeguro(url.searchParams.get("proximo"), url.origin);
  const falhou = NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
  if (!code || !contasLigadas()) return falhou;

  const loja = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (novos) => {
        for (const { name, value, options } of novos) loja.set(name, value, options);
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return falhou;
  return NextResponse.redirect(new URL(proximo, url.origin));
}
