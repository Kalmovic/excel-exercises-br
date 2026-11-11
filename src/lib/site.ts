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

/**
 * Enquanto o site está em teste, fica fora dos buscadores (meta robots e
 * cabeçalho X-Robots-Tag). Para liberar no lançamento: INDEXAR_SITE=1 na Vercel.
 */
export const INDEXAR_SITE = process.env.INDEXAR_SITE === "1";

/** Preços do Pro, em reais. O anual é cobrado de uma vez (10% de desconto). */
export const PRECO = { mensal: 30, anualPorMes: 27, anual: 27 * 12 } as const;

/** Nome da marca. Fica só aqui: se o registro no INPI mudar o nome, troca-se em um lugar. */
export const NOME_SITE = "Planilhês";
/** Nome do desafio diário ("Planilhês do Dia"). */
export const NOME_DESAFIO = `${NOME_SITE} do Dia`;
