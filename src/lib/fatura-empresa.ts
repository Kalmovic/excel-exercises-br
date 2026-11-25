import "server-only";
import type Stripe from "stripe";
import { centavosPorPessoa, descricaoItem, formatarCnpj, type Organizacao } from "./empresas";

/**
 * Fatura da licença de empresa no Stripe (venda por proposta).
 *
 * 1. Cliente no Stripe com a razão social, o e-mail financeiro, o endereço e o
 *    CNPJ (br_cnpj): a NFS-e sai com esses dados (src/lib/nfse.ts). O bairro vai
 *    nos metadados, porque o endereço do Stripe não tem campo para ele.
 * 2. Fatura "send_invoice" com vencimento em 15 dias: o Stripe manda por e-mail
 *    ao financeiro, com a página de pagamento (boleto, Pix ou cartão, conforme os
 *    meios ligados no painel; sem payment_method_types, a escolha é dinâmica).
 * 3. `metadata.organizacao_id`: é por ele que o webhook (invoice.paid) acha a
 *    organização e libera as vagas.
 *
 * Idempotência: chaves fixas por organização e por fatura. Clicar duas vezes,
 * ou o servidor cair no meio, devolve o mesmo cliente e a mesma fatura. Fatura
 * em aberto é reaproveitada; só depois de paga (ou anulada) sai uma nova, que é
 * a renovação.
 */

/** Produto fixo no catálogo do Stripe (criado na primeira fatura). */
export const PRODUTO_EMPRESAS = "planilhes_pro_empresas";

export type FaturaGerada = { cliente: string; fatura: string; url: string | null; reaproveitada: boolean };

function dadosDoCliente(org: Organizacao) {
  return {
    name: org.nome,
    email: org.email_financeiro,
    preferred_locales: ["pt-BR"],
    address: {
      line1: `${org.logradouro}, ${org.numero}`,
      line2: org.complemento ?? "",
      city: org.cidade,
      state: org.uf,
      postal_code: org.cep,
      country: "BR",
    },
    metadata: { organizacao_id: org.id, bairro: org.bairro },
  } satisfies Stripe.CustomerUpdateParams;
}

async function garantirProduto(stripe: Stripe) {
  try {
    await stripe.products.retrieve(PRODUTO_EMPRESAS);
  } catch (e) {
    if ((e as { code?: string }).code !== "resource_missing") throw e;
    await stripe.products
      .create({ id: PRODUTO_EMPRESAS, name: "Planilhês Pro para empresas" }, { idempotencyKey: `produto-${PRODUTO_EMPRESAS}` })
      .catch((erro: { code?: string }) => {
        if (erro.code !== "resource_already_exists") throw erro;
      });
  }
  return PRODUTO_EMPRESAS;
}

export async function gerarFaturaEmpresa(stripe: Stripe, org: Organizacao): Promise<FaturaGerada> {
  const dados = dadosDoCliente(org);
  const cliente = org.stripe_cliente_id
    ? (await stripe.customers.update(org.stripe_cliente_id, dados)).id
    : (
        await stripe.customers.create(
          { ...dados, tax_id_data: [{ type: "br_cnpj", value: formatarCnpj(org.cnpj) }] },
          { idempotencyKey: `empresa-cliente-${org.id}` },
        )
      ).id;

  // Fatura anterior: em aberto, é a mesma (não manda duas cobranças); rascunho, termina de montar.
  let fatura: Stripe.Invoice | null = null;
  if (org.stripe_fatura_id) {
    const anterior = await stripe.invoices.retrieve(org.stripe_fatura_id);
    if (anterior.status === "open") return { cliente, fatura: anterior.id!, url: anterior.hosted_invoice_url ?? null, reaproveitada: true };
    if (anterior.status === "draft") fatura = anterior;
  }

  fatura ??= await stripe.invoices.create(
    {
      customer: cliente,
      collection_method: "send_invoice",
      days_until_due: 15,
      currency: "brl",
      auto_advance: false,
      pending_invoice_items_behavior: "exclude",
      description: `Licenças anuais do Planilhês Pro para ${org.nome}.`,
      metadata: { organizacao_id: org.id, assentos: String(org.assentos) },
    },
    // Nova fatura por "geração": a primeira, ou a seguinte a uma fatura já paga/anulada.
    { idempotencyKey: `empresa-fatura-${org.id}-${org.stripe_fatura_id ?? "primeira"}` },
  );
  const id = fatura.id!;

  if (!fatura.lines?.data.length) {
    await stripe.invoiceItems.create(
      {
        customer: cliente,
        invoice: id,
        quantity: org.assentos,
        price_data: { currency: "brl", product: await garantirProduto(stripe), unit_amount: centavosPorPessoa(org.preco_por_pessoa_ano) },
        description: descricaoItem(org.assentos),
        metadata: { organizacao_id: org.id },
      },
      { idempotencyKey: `empresa-item-${id}` },
    );
  }

  await stripe.invoices.finalizeInvoice(id, { auto_advance: false });
  const enviada = await stripe.invoices.sendInvoice(id);
  return { cliente, fatura: id, url: enviada.hosted_invoice_url ?? null, reaproveitada: false };
}
