/**
 * URL pública do site. Na Vercel, VERCEL_PROJECT_PRODUCTION_URL é preenchida
 * automaticamente com o domínio de produção (sem https://). Um domínio próprio
 * pode ser forçado com NEXT_PUBLIC_SITE_URL.
 */
export const URL_SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const NOME_SITE = "Pratique Excel";
