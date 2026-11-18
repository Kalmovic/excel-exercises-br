import "server-only";
import Stripe from "stripe";

/**
 * Cliente do Stripe. Só no servidor.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 * - STRIPE_SECRET_KEY: chave secreta (sk_test_... no modo de teste, sk_live_... em produção).
 * - STRIPE_WEBHOOK_SECRET: segredo do endpoint de webhook (whsec_...), usado
 *   para conferir a assinatura de cada aviso.
 */
export const stripeConfigurado = () => Boolean(process.env.STRIPE_SECRET_KEY);

let cliente: Stripe | null = null;
export function clienteStripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) throw new Error("STRIPE_SECRET_KEY não configurada");
  cliente ??= new Stripe(chave, { appInfo: { name: "planilhes" } });
  return cliente;
}

/** Nome fixo de cada preço no catálogo do Stripe (o mesmo no modo teste e em produção). */
export const LOOKUP_PRECO = { mensal: "planilhes_pro_mensal", anual: "planilhes_pro_anual" } as const;
export type Plano = keyof typeof LOOKUP_PRECO;

/**
 * Visual do checkout com as cores do site (tokens de globals.css). Ícone e logo
 * vêm da marca da conta (painel do Stripe → Settings → Branding; PNGs em docs/marca/).
 */
export const MARCA_CHECKOUT = {
  display_name: "Planilhês",
  background_color: "#f7f7f2", // --color-bg
  button_color: "#16181d", // --color-ink
  font_family: "inter",
  border_style: "rounded",
} as const;

/** Etiqueta dos checkouts no painel do Stripe (sufixo de 8 letras, como o Stripe recomenda). */
export const IDENTIFICADOR_CHECKOUT = "planilhes-pro-qkvmrzta";

type PrecoEsperado = { centavos: number; recorrente: boolean };
let cachePrecos: { ate: number; ids: Partial<Record<Plano, string>> } | null = null;

/**
 * Acha no catálogo do Stripe o preço de cada plano (pelo `lookup_key`) e confere
 * se ele bate com o preço mostrado no site. Se não bater (alguém mudou só um dos
 * lados), devolve null para esse plano: o checkout cai no preço montado na hora,
 * e o aluno nunca paga um valor diferente do que viu. Cache de 10 minutos.
 */
export async function precosDoCatalogo(stripe: Stripe, esperado: Record<Plano, PrecoEsperado>) {
  if (cachePrecos && cachePrecos.ate > Date.now()) return cachePrecos.ids;
  const ids: Partial<Record<Plano, string>> = {};
  const lista = await stripe.prices.list({ lookup_keys: Object.values(LOOKUP_PRECO), active: true, limit: 10 });
  for (const plano of Object.keys(LOOKUP_PRECO) as Plano[]) {
    const p = lista.data.find((x) => x.lookup_key === LOOKUP_PRECO[plano]);
    if (!p) continue;
    const ok =
      p.currency === "brl" &&
      p.unit_amount === esperado[plano].centavos &&
      (esperado[plano].recorrente ? p.recurring?.interval === "month" && p.recurring.interval_count === 1 : p.type === "one_time");
    if (ok) ids[plano] = p.id;
    else console.error(JSON.stringify({ tipo: "preco_stripe_diferente", plano, preco: p.id, valor: p.unit_amount, esperado: esperado[plano].centavos }));
  }
  cachePrecos = { ate: Date.now() + 10 * 60 * 1000, ids };
  return ids;
}

/** Só para os testes. */
export const limparCachePrecos = () => {
  cachePrecos = null;
};
