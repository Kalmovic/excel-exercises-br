import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { PRECO } from "@/lib/site";
import { clienteStripe, IDENTIFICADOR_CHECKOUT, MARCA_CHECKOUT, precosDoCatalogo, stripeConfigurado } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

const pedido = z.object({ plano: z.enum(["mensal", "anual"]) });
const centavos = (reais: number) => Math.round(reais * 100);

type Linha = { status: string; acesso_ate: string | null; stripe_cliente_id: string | null };

/**
 * Checkout: cria a sessão de pagamento no Stripe e devolve o link dela.
 *
 * O aluno NÃO vira Pro aqui: só fica "pendente". Quem libera o acesso é o
 * webhook, quando o Stripe avisa que o pagamento foi confirmado.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Entre na sua conta para assinar.");
  if (!stripeConfigurado() || !process.env.SUPABASE_SECRET_KEY) return erro(503, "Pagamentos ainda não estão ligados.");
  const dados = pedido.safeParse(await request.json().catch(() => null));
  if (!dados.success) return erro(400, "Plano inválido.");
  const { plano } = dados.data;

  const admin = supabaseAdmin();
  const { data: atual } = await admin.from("assinaturas").select("status, acesso_ate, stripe_cliente_id").eq("usuario_id", usuario.id).maybeSingle<Linha>();
  if (atual?.acesso_ate && new Date(atual.acesso_ate) > new Date())
    return erro(409, `Você já é Pro até ${new Date(atual.acesso_ate).toLocaleDateString("pt-BR")}.`);

  try {
    const stripe = clienteStripe();
    // Um cliente no Stripe por aluno: os avisos chegam com esse id, e é por ele que achamos o aluno.
    //
    // Corrida: dois checkouts ao mesmo tempo, sem linha ainda, criariam dois clientes
    // (o último upsert ganha, e a fatura do outro chegaria sem aluno). A chave de
    // idempotência faz o Stripe devolver o MESMO cliente para o mesmo aluno por 24 h.
    // Depois disso a linha já existe. E, de todo jeito, a fatura do mensal traz o
    // aluno nos metadados da assinatura (src/lib/pagamento-stripe.ts).
    const cliente =
      atual?.stripe_cliente_id ??
      (
        await stripe.customers.create(
          { email: usuario.email, metadata: { usuario_id: usuario.id } },
          { idempotencyKey: `cliente-${usuario.id}-${usuario.email ?? ""}`.slice(0, 255) },
        )
      ).id;
    // Preço do catálogo do Stripe (produto "Planilhês Pro"); sem ele, ou se não bater
    // com o site, o preço é montado na hora com o valor do site.
    const catalogo = await precosDoCatalogo(stripe, {
      mensal: { centavos: centavos(PRECO.mensal), recorrente: true },
      anual: { centavos: centavos(PRECO.anual), recorrente: false },
    }).catch((e) => {
      console.error(JSON.stringify({ tipo: "erro_catalogo_stripe", mensagem: String(e) }));
      return {} as Awaited<ReturnType<typeof precosDoCatalogo>>;
    });
    const origem = new URL(request.url).origin;
    const comum: Stripe.Checkout.SessionCreateParams = {
      customer: cliente,
      client_reference_id: usuario.id,
      locale: "pt-BR",
      allow_promotion_codes: true, // cupons (afiliados, campanhas) criados no painel do Stripe
      success_url: `${origem}/conta?pagamento=ok`,
      cancel_url: `${origem}/pro`,
      metadata: { usuario_id: usuario.id, plano },
      integration_identifier: IDENTIFICADOR_CHECKOUT,
      branding_settings: MARCA_CHECKOUT,
    };
    const sessao = await stripe.checkout.sessions.create(
      plano === "mensal"
        ? {
            ...comum,
            mode: "subscription",
            line_items: [
              catalogo.mensal
                ? { quantity: 1, price: catalogo.mensal }
                : { quantity: 1, price_data: { currency: "brl", unit_amount: centavos(PRECO.mensal), recurring: { interval: "month" }, product_data: { name: "Planilhês Pro mensal" } } },
            ],
            subscription_data: { metadata: { usuario_id: usuario.id } },
          }
        : {
            ...comum,
            mode: "payment",
            line_items: [
              catalogo.anual
                ? { quantity: 1, price: catalogo.anual }
                : { quantity: 1, price_data: { currency: "brl", unit_amount: centavos(PRECO.anual), product_data: { name: "Planilhês Pro anual (12 meses de acesso)" } } },
            ],
            payment_method_options: { card: { installments: { enabled: true } } }, // parcelado no cartão
            payment_intent_data: { metadata: { usuario_id: usuario.id } },
          },
    );

    // Com a chave secreta: o aluno não pode escrever na própria assinatura.
    const { error } = await admin.from("assinaturas").upsert({
      usuario_id: usuario.id,
      plano,
      status: "pendente",
      stripe_cliente_id: cliente,
      fatura_url: sessao.url,
      atualizado_em: new Date().toISOString(),
    });
    if (error) throw new Error(`gravar assinatura: ${error.message}`);
    console.log(JSON.stringify({ tipo: "checkout_criado", plano, usuario: usuario.id }));
    return NextResponse.json({ url: sessao.url });
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_checkout", mensagem: String(e) }));
    return erro(502, "Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.");
  }
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
