/**
 * Endereço e chave pública do Supabase.
 *
 * A integração da Vercel cria SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY, que só o
 * servidor enxerga. O next.config.ts copia as duas para NEXT_PUBLIC_*, que o Next
 * embute no JavaScript do navegador no build. Isso é seguro: a chave publishable
 * existe para ficar pública, e quem protege os dados é o RLS do banco.
 *
 * Sem as duas (ex.: testes locais), as contas ficam desligadas e o site funciona
 * como antes, só com o progresso no navegador.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_CHAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const contasLigadas = () => SUPABASE_URL !== "" && SUPABASE_CHAVE_PUBLICA !== "";
