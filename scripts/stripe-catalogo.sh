#!/usr/bin/env bash
# Cria (uma vez) o produto "Planilhês Pro" e os dois preços no Stripe.
# Pode rodar de novo: se o preço já existe (pelo lookup_key), não cria outro.
#
# Uso (precisa do Stripe CLI: npm i -g @stripe/cli):
#   STRIPE_API_KEY=sk_live_... bash scripts/stripe-catalogo.sh
# Os valores precisam bater com PRECO em src/lib/site.ts (o checkout confere).
set -euo pipefail

existe() { stripe prices list -d "lookup_keys[]=$1" | grep -q "\"lookup_key\": \"$1\""; }

if existe planilhes_pro_mensal && existe planilhes_pro_anual; then
  echo "Catálogo já existe. Nada a fazer."
  exit 0
fi

PRODUTO=$(stripe products create --name "Planilhês Pro" \
  --description "Acesso a todas as lições, testes e certificados do Planilhês." \
  -d "metadata[app]=planilhes" | grep -m1 '"id"' | sed -E 's/.*"(prod_[^"]+)".*/\1/')
echo "Produto: $PRODUTO"

existe planilhes_pro_mensal || stripe prices create --product "$PRODUTO" --currency brl --unit-amount 3490 \
  -d "recurring[interval]=month" --lookup-key planilhes_pro_mensal --nickname "Pro mensal" > /dev/null
existe planilhes_pro_anual || stripe prices create --product "$PRODUTO" --currency brl --unit-amount 23880 \
  --lookup-key planilhes_pro_anual --nickname "Pro anual (12 meses)" > /dev/null
echo "Preços criados: planilhes_pro_mensal (R\$ 34,90/mês) e planilhes_pro_anual (R\$ 238,80)."
