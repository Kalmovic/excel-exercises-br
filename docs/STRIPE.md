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

## Nota fiscal (NFS-e pelo Asaas)
O Stripe não emite NFS-e. A cada pagamento confirmado, o webhook do Stripe pede a nota ao Asaas
(`src/lib/nfse.ts`), que registra na prefeitura e manda o PDF por e-mail ao aluno. Reembolso ou
contestação cancelam a nota. Cada nota fica em `notas_fiscais` (status `emitida`, `sem_dados`, `erro`…).

- O checkout pede **CPF/CNPJ e endereço com CEP** (a prefeitura do Rio exige o endereço do tomador).
- Dado recusado pela prefeitura (status `erro` na tabela) não é repetido: corrija e emita pelo painel do Asaas.
  Asaas fora do ar: o webhook responde 500 e o Stripe reenvia (a nota não sai duas vezes).

**Para ligar em produção:**
1. No Asaas (produção): Minha conta → Dados fiscais: inscrição municipal, regime (Simples), série e número
   do RPS e o **certificado digital A1** (a prefeitura do Rio autentica por certificado).
2. Vercel → Environment Variables:
   - `ASAAS_API_KEY` = chave de produção do Asaas
   - `ASAAS_URL` = `https://api.asaas.com/v3`
   - `NFSE_SERVICO_ID` = id do serviço municipal (`GET /v3/invoices/municipalServices?description=...`).
     No Rio: `429606` = 01.05.01.001 Licenciamento de uso de programa de computação (item 01.05,
     confirmado pela Contabilizei para o CNAE 6202-3/00).
   - `NFSE_SERVICO_NOME` = o nome desse serviço
   - `NFSE_ISS` = alíquota de ISS em % (no Simples, a parte do ISS na alíquota efetiva da faixa; o contador informa)
   - `NFSE_NBS` = código NBS do serviço, se o Asaas pedir (o Rio usa o Emissor Nacional, que exige NBS)
4. Confirmar com o suporte do Asaas que, no Rio, as notas saem pelo **Emissor Nacional**: assim a Contabilizei
   importa sozinha. Fora dele, a importação na Contabilizei é manual até o dia 5 do mês seguinte.
5. O certificado A1 vence em **17/03/2027**: renove antes e suba o novo no Asaas, senão a emissão para.
6. Sem essas variáveis, nada muda: o site cobra normalmente e não emite nota.

**Teste de ponta a ponta** (Stripe teste + sandbox do Asaas, assina, emite, espera autorizar, reembolsa e cancela):
```bash
NFSE_INTEGRACAO=1 STRIPE_SECRET_KEY=sk_test_... ASAAS_API_KEY=... NFSE_SERVICO_ID=429606 npx vitest run src/lib/nfse.integracao.test.ts
```
