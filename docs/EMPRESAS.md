# Licenças para empresas (B2B)

Venda **só por proposta**: não há checkout de empresa. O dono cria a organização no admin, o Stripe manda a
fatura ao financeiro da empresa e, com o pagamento confirmado, o gestor recebe o link de convite para a equipe.

- Preço padrão: **R$ 15 por pessoa por mês, contrato anual** = R$ 180 por pessoa por ano, mínimo de 5 pessoas
  (`PRECO_EMPRESAS` em `src/lib/site.ts`). Na proposta dá para mudar o preço por pessoa.
- Validade: 12 meses a partir do pagamento + 3 dias de tolerância. Não renova sozinho.
- Membro de organização ativa é Pro (função `tem_acesso_pro`, usada por `usuarioEhPro` em `src/lib/acesso.ts`).

## Antes da primeira venda (uma vez)

1. **Banco**: aplicar a migration `supabase/migrations/20261125120000_empresas.sql` no Supabase e rodar
   `supabase/testes/empresas.sql` no SQL Editor (resultado esperado: o erro "EMPRESAS OK: ...", tudo desfeito).
2. **Stripe** (modo teste e depois produção):
   - Settings → Payment methods: deixar **Boleto** e **Pix** ligados (a fatura não fixa os meios; o Stripe mostra o
     que estiver ligado, e o cartão também).
   - Settings → Billing → Invoices: conferir o e-mail das faturas e o rodapé (razão social e CNPJ do Planilhês).
   - **Webhook**: nenhum evento novo. O endpoint já recebe `invoice.paid`, `charge.refunded` e
     `charge.dispute.created` (docs/STRIPE.md); o webhook reconhece a fatura da empresa por `metadata.organizacao_id`.
   - O produto `planilhes_pro_empresas` ("Planilhês Pro para empresas") é criado sozinho na primeira fatura.
3. **Nota fiscal**: a mesma configuração do Asaas do aluno (docs/STRIPE.md, "Nota fiscal"). A nota da empresa sai
   para o CNPJ e o endereço da proposta, com a descrição "Planilhês Pro para empresas: N licenças, de dd/mm/aaaa a
   dd/mm/aaaa".

## Passo a passo de uma venda

1. **Lead**: o pedido chega pelo formulário "Pedir proposta" de `/empresas` (tabela `contatos` no Supabase).
2. **Criar a proposta**: entre no admin (`/admin`) → **Empresas (licenças)** → "Nova proposta". Preencha razão
   social, CNPJ (o formulário confere os dígitos), e-mail financeiro (recebe a fatura e a nota), **e-mail do gestor**
   (quem vai ver o painel), endereço completo com CEP e bairro, número de pessoas (mínimo 5) e o preço por pessoa por
   ano (vem com R$ 180). A organização fica com status `proposta`: nada foi cobrado ainda.
3. **Mandar a fatura**: na lista, clique em **"Gerar e enviar fatura"**. O site cria o cliente no Stripe (com o CNPJ)
   e uma fatura de N pessoas × preço, vencimento em 15 dias, e o Stripe manda por e-mail ao financeiro. O link da
   fatura aparece na tela, se quiser mandar também. Clicar de novo com a fatura em aberto **não** cria outra: mostra a
   mesma.
4. **Pagamento**: quando a empresa paga (boleto pode levar 1 a 3 dias úteis), o Stripe avisa o webhook e a
   organização fica `ativa`, com validade de 12 meses. A nota fiscal sai sozinha.
5. **Mandar o convite ao gestor**: copie o **link de convite** (`/convite/<código>`, botão "Copiar convite") e mande
   ao e-mail do gestor, explicando:
   - ele entra no site com o **e-mail informado na proposta** e abre `https://planilhes.com.br/empresa` (ou
     "Minha conta" → "Abrir o painel da equipe");
   - ele repassa o link de convite para a equipe; cada pessoa entra com o próprio e-mail e ocupa uma vaga;
   - o gestor só ocupa vaga se também entrar pelo convite.
   O link pode ser mandado antes do pagamento, mas só funciona depois (até lá, a tela diz que a licença ainda não foi
   ativada).
6. **No dia a dia** (o gestor faz sozinho, no painel): vê vagas usadas, quem entrou, lições concluídas, certificados e
   último acesso; remove quem saiu da empresa (a vaga fica livre na hora). Equipe lotada: quem abrir o link vê o aviso.

## Renovar

1. Perto do fim (o admin mostra a validade de cada organização), combine com a empresa.
2. Clique em **"Gerar e enviar fatura"** de novo: com a fatura anterior já paga, sai uma fatura nova.
   - Mais ou menos pessoas, ou outro preço: hoje não há edição no admin. Ajuste `assentos` /
     `preco_por_pessoa_ano` da organização no Table Editor do Supabase **antes** de gerar a fatura.
3. Paga antes do vencimento, os 12 meses novos contam a partir do fim do contrato atual (ninguém perde dias). Paga
   depois, contam do pagamento. O link de convite e os membros continuam os mesmos.

## Casos especiais

- **Trocar o gestor**: no Table Editor, mude `gestor_email` e apague `gestor_id` da organização. O novo gestor vira
  gestor no primeiro acesso dele com aquele e-mail.
- **Cancelar uma fatura enviada por engano**: no painel do Stripe, "Void invoice". Depois disso, "Gerar e enviar
  fatura" cria outra.
- **Reembolso ou contestação** da fatura: a organização fica `cancelada` na hora, a equipe inteira perde o Pro e a
  nota é cancelada. Para voltar, crie uma proposta nova.
- **Uma pessoa em duas empresas**: não pode estar em duas organizações com contrato em vigor ao mesmo tempo; o
  convite da segunda avisa. O gestor da primeira precisa remover a pessoa antes.
- **Fatura paga e organização não ativou**: veja no Stripe (Developers → Webhooks) a resposta do aviso
  `invoice.paid`, e na tabela `eventos_pagamento` o campo `erro`.

## Onde está no código

| O quê | Onde |
|---|---|
| Tabelas e funções do banco | `supabase/migrations/20261125120000_empresas.sql` (testes: `supabase/testes/empresas.sql`) |
| Regras, validação da proposta, textos do convite | `src/lib/empresas.ts` |
| Cliente e fatura no Stripe | `src/lib/fatura-empresa.ts` |
| Admin | `src/app/(app)/admin/empresas/` |
| Webhook (fatura paga, reembolso) | `src/lib/pagamento-stripe.ts`, `src/app/api/stripe/webhook/route.ts` |
| Nota fiscal da empresa | `src/lib/nfse.ts` (`pagamentoDoEvento`) |
| Convite | `src/app/(app)/convite/[codigo]/` |
| Painel do gestor | `src/app/(app)/empresa/`, `src/components/empresa/` |
