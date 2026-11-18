# Stripe: como ligar os pagamentos

Faça tudo primeiro no **modo teste** (chaves `sk_test_`/`rk_test_`) e repita em produção com as chaves `live`.

## 1. Chave da API
- Developers → API keys → **Create restricted key** (`rk_…`). Permissões que o site usa:
  - Write: Customers, Checkout Sessions, Refunds, Subscriptions, Customer portal
  - Read: Prices, Charges
- Vercel → Settings → Environment Variables: `STRIPE_SECRET_KEY` = a chave restrita.

## 2. Catálogo (produto e preços)
```bash
STRIPE_API_KEY=rk_... bash scripts/stripe-catalogo.sh
```
Cria o produto **Planilhês Pro** com os preços `planilhes_pro_mensal` (R$ 34,90/mês) e
`planilhes_pro_anual` (R$ 238,80). O checkout acha os preços pelo `lookup_key` e confere se
batem com `PRECO` em `src/lib/site.ts`; se não baterem, usa o valor do site e avisa no log
(`preco_stripe_diferente`). **Para mudar o preço:** crie um preço novo no painel, passe o
`lookup_key` para ele ("Transfer lookup key") e mude `PRECO` no código no mesmo deploy.

## 3. Webhook
Developers → Webhooks → Add endpoint → `https://planilhes.com.br/api/stripe/webhook`, com os eventos:

| Evento | O que o site faz |
|---|---|
| `checkout.session.completed` | anual pago no cartão: libera 1 ano |
| `checkout.session.async_payment_succeeded` | anual pago no Pix/boleto: libera 1 ano |
| `invoice.paid` | mensal: libera até o fim do período |
| `invoice.payment_failed` | mensal: marca como atrasado |
| `customer.subscription.updated` | cancelou ou desistiu de cancelar a renovação |
| `customer.subscription.deleted` | assinatura encerrada |
| `charge.refunded` | reembolso total: corta o acesso e para de cobrar |
| `charge.dispute.created` | contestação: corta o acesso e para de cobrar |
| `radar.early_fraud_warning.created` | alerta de fraude: reembolsa na hora (evita a contestação) |

Copie o **Signing secret** (`whsec_…`) para `STRIPE_WEBHOOK_SECRET` na Vercel.

## 4. Marca
- O checkout já sai com as cores do site, a fonte Inter e o nome "Planilhês" (`MARCA_CHECKOUT` em `src/lib/stripe.ts`).
- Ícone e logo valem para a conta inteira (checkout, faturas, recibos, portal e e-mails): Settings → **Branding** →
  Icon = `docs/marca/stripe-icone.png`, Logo = `docs/marca/stripe-logo.png`, Brand color `#16181d`, Accent color `#ffd23f`.
  Faça nos dois modos (teste e produção).
- Settings → Public details: nome público "Planilhês", site `https://planilhes.com.br` e o e-mail de suporte.

## 5. Painel
- Settings → Payment methods: ligar **Pix** e **Boleto** (o código não fixa os meios; o Stripe mostra o que estiver ligado).
- Settings → Billing → **Customer portal**: ativar, permitir trocar o cartão, ver faturas e cancelar.
- Settings → Billing → Subscriptions and emails: ligar as tentativas automáticas de cobrança (Smart Retries) e os e-mails de cartão vencendo.

## 6. Testar
- Cartão aprovado `4242 4242 4242 4242`; recusado `4000 0000 0000 0002`. Qualquer data futura e CVC. Para alerta de fraude e contestação, use os cartões da seção "Disputes" e "Radar" em docs.stripe.com/testing.
- Webhook local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (o CLI mostra o `whsec_` para usar no `.env.local`).
- Depois do deploy: Developers → Webhooks → o endpoint mostra cada aviso e a resposta (tem que ser 200).

## Nota fiscal
O Stripe não emite NFS-e. Para a nota de serviço use um emissor à parte (eNotas, NFE.io, Focus NFe…),
ligado ao mesmo evento de pagamento. Combine com o contador antes de abrir as vendas.
