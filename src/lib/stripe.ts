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
