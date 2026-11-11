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

/**
 * Preços do Pro, em reais (hipótese a testar, ver doc de go-to-market).
 * Mensal: cartão recorrente. Anual: Pix à vista ou cartão em até 12x.
 * Mudança de preço vale só para novos assinantes: no checkout (Fase 3), o
 * valor fica gravado na assinatura, não lido daqui.
 */
export const PRECO = { mensal: 34.9, anualPorMes: 19.9, anual: 238.8, parcelasAnual: 12, garantiaDias: 7 } as const;

/** 19.9 -> "R$ 19,90" */
export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Quanto o anual economiza em relação a 12 meses do mensal, em %. */
export const economiaAnual = () => Math.round((1 - PRECO.anual / (PRECO.mensal * 12)) * 100);

/** Nome da marca. Fica só aqui: se o registro no INPI mudar o nome, troca-se em um lugar. */
export const NOME_SITE = "Planilhês";
/** Nome do desafio diário ("Planilhês do Dia"). */
export const NOME_DESAFIO = `${NOME_SITE} do Dia`;
