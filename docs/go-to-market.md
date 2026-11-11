# Go-to-market

Nov 11, 2026

Plano de go-to-market do Planilhês e o que ele exige do produto. As seções 1 a 5 dão o contexto de negócio; a seção 6 é a lista de tarefas para entregar ao Claude Code.

## 1. Preços e planos

O plano anual passa a ser o principal, com desconto grande o bastante para ser a escolha óbvia. Hoje a diferença é de cerca de 10% (27 contra 30 por mês), pequena demais para convencer alguém a se comprometer por um ano.

| Plano | Hoje (por mês) | Proposta (hipótese a testar) | Cobrança |
| --- | --- | --- | --- |
| Mensal | 30,00 | 34,90 | Cartão, recorrente |
| Anual | 27,00 | 19,90 (238,80 por ano) | Pix à vista ou cartão em até 12x |
| Empresas (PME) | não existe | 15,00 a 20,00 por usuário, mínimo de 5, contrato anual | Boleto ou Pix, com nota fiscal |
| Universidades | não existe | Licença por aluno por semestre (valor a definir no primeiro piloto) | Boleto, com nota fiscal |

Valores em reais.

- **Garantia de 7 dias** (direito de arrependimento do CDC para compras online) em destaque na página de preços e no checkout.
- **Comparativo de preço** na página: menos de um lanche por mês, contra cursos de 300 reais ou mais.
- **Mudança de preço só para novos assinantes.** Quem já assina mantém o valor atual.

## 2. Funil e upsell

O aluno experimenta sem cadastro, deixa o e-mail num momento de conquista e recebe o convite para o Pro quando está mais motivado.

**Grátis:** Intro completo, desafio do dia, ofensiva, 1º exercício de cada módulo e o exercício-amostra de cada página de função. **Pro:** do Módulo 1 em diante.

**Onde capturar o e-mail:**

1. Resultado do teste de nível ("crie sua conta para salvar seu nível")
2. Fim do Intro ("salve seu progresso")
3. Ofensiva ("receba um lembrete para não perder sua sequência")

**Pontos de upsell para o Pro:**

1. Fim de cada desafio do dia, ligado à função usada ("este desafio usou SOMASE; pratique mais 15 no Pro")
2. Card fixo na lateral: um componente genérico que lê a campanha do banco (`type` pro ou sponsor, imagem, link, `starts_at`, `ends_at`); hoje promove o Pro, depois pode vender patrocínio
3. Fim do Intro, junto com o convite para o teste de nível

**Sequências de e-mail:**

| Sequência | Gatilho | E-mails |
| --- | --- | --- |
| Boas-vindas | Cadastro | Dia 0: como funciona; dia 2: o desafio do dia; dia 5: depoimento + Pro |
| Fim do Intro | Concluiu o Módulo 0 | Dia 0: parabéns + o que vem no Fundamentos; dia 3: oferta do anual |
| Ofensiva | Sem atividade até as 20h | Lembrete "sua sequência de N dias acaba hoje" |
| Pacote do mês | Publicação do pacote | "Chegou o pacote de X" para assinantes; versão com 1 exercício grátis para os outros |
| Recuperação | Cancelamento ou cobrança recusada | Pesquisa de motivo; oferta de volta ao anual |

Sem anúncio automático (AdSense) por enquanto: paga pouco no Brasil, compete com a venda do Pro e deixa a página mais lenta.

## 3. Programas de indicação

São três programas separados, porque quem indica e o tamanho da venda mudam a recompensa.

| Programa | Quem indica | Recompensa | Como recebe |
| --- | --- | --- | --- |
| Indique um amigo | Qualquer usuário | 1 mês grátis em crédito; o amigo ganha desconto na 1ª assinatura | Desconto automático na próxima cobrança |
| Afiliados | Criadores de conteúdo, professores, influenciadores | % recorrente, ex.: 30% por 12 meses | Repasse mensal por Pix no começo; split automático depois |
| Indicação B2B | Quem apresenta uma empresa ou faculdade | 10–15% do contrato do 1º ano, uma vez, após o pagamento | Repasse |

**Regras:**

- Indique um amigo nunca paga em dinheiro. É o mesmo mecanismo do "presentear exercício" (até 3 exercícios Pro por mês, abertos sem cadastro).
- Afiliado é atribuído por link (`?ref=codigo`, cookie de 30–60 dias) ou por cupom, que funciona melhor em vídeo. Os termos proíbem anúncio pago com o nome da marca, spam e autoindicação.
- Funcionário que indica o próprio empregador recebe como usuário (ex.: 1 ano de Pro) ou a empresa recebe desconto. Nunca dinheiro, por conflito de interesse.
- Setor público nunca recebe em dinheiro. Excluir nos termos.
- Revisar os termos com um advogado antes de lançar o programa B2B.

**Backend:**

1. Ao chegar com `?ref=codigo`, gravar o código num cookie; no cadastro, gravar `referred_by_affiliate` no perfil. Com cupom, o vínculo acontece no checkout.
2. O webhook de cada pagamento confirmado cria uma linha `pendente` em `affiliate_commissions` quando o assinante tem afiliado.
3. Um cron diário aprova as comissões com mais de 7 dias e sem estorno.
4. Pagamento: exportar as aprovadas do mês e pagar por Pix (afiliados com MEI emitem nota). Migrar para split (Asaas, Mercado Pago, Pagar.me ou Stripe Connect) quando o volume crescer.
5. Indicação B2B: formulário "indicar uma empresa" que registra a oportunidade com o nome de quem indicou; a comissão sai manualmente depois que a empresa paga.

Começar enxuto: 3 a 5 micro-criadores de Excel ou de concurso, com cupom e repasse manual. Painel do afiliado e split só quando o programa provar que vende.

## 4. Empresas e universidades

O B2B é onde está o maior valor por cliente, mas só vende com usuários e um resultado medido. O número que fecha contrato vem do teste de nível aplicado antes e depois.

**Universidades:**

- Gancho: **atividades complementares**. O certificado precisa ter carga horária (ex.: "Excel Fundamentos: 20h").
- Quem decide: coordenadores de Administração, Contábeis, Economia e Engenharia de Produção, e o núcleo de carreira. Não a reitoria.
- Caminho: um professor aliado → acesso grátis para uma turma por um semestre → teste de nível no início e no fim → proposta institucional com o resultado.
- Começar pelas particulares. As públicas compram por licitação (a Lei 14.133 permite dispensa para valores baixos; conferir o limite vigente).

**Empresas:**

1. Descoberta: quanto custa o time não saber Excel (retrabalho, erros, onboarding lento)
2. Piloto de 30 dias com 5 a 10 pessoas e teste de nível antes e depois
3. Relatório de resultado para quem aprova o gasto
4. Contrato anual por usuário, com nota fiscal e boleto

**Parcerias que trazem muitos usuários de uma vez:** cursinhos de concurso, escritórios de contabilidade, agentes de estágio e consultorias de RH, escolas técnicas. Formato: licença em volume ou revenda com comissão.

**O que o produto precisa ter para vender B2B:**

| Recurso | Para quê | Prioridade |
| --- | --- | --- |
| Certificado com carga horária e URL de verificação | Atividade complementar e LinkedIn | Alta |
| Teste de nível (antes e depois) | Gerar o número de resultado do piloto | Alta |
| Página "Para empresas" e "Para universidades" com formulário | Receber os contatos | Alta |
| Organizações e membros (`organizations` com `domains`, `memberships`) | Várias pessoas sob um contrato | Média |
| Painel do gestor (convites, progresso, exportar relatório) | Acompanhar o piloto | Média |
| Login Google/Microsoft com entrada automática por domínio | Onboarding sem atrito | Média |
| SAML/SCIM | Só para grandes empresas, quando pedirem | Depois |

Até o painel existir, os primeiros pilotos podem rodar com relatório montado à mão a partir do banco.

## 5. Aquisição

Vídeos curtos, SEO e afiliados agora; anúncio pago só depois de medir conversão e LTV.

| Canal | Quando | O que exige de código |
| --- | --- | --- |
| Vídeos curtos (TikTok, Reels, Shorts): um erro comum + a solução, terminando com "pratique no Planilhês" | Agora | Link com UTM por vídeo; página de destino com o exercício do vídeo |
| SEO + desafio do dia | Agora | Páginas estáticas por função e por desafio resolvido, com exercício-amostra |
| E-mail marketing | Agora | Captura de e-mail e as sequências da seção 2 |
| Afiliados (micro-criadores de Excel e concurso) | Agora, com cupom | Cupom no checkout; depois, link `?ref` e painel |
| Anúncios pagos | Depois | Pixel de conversão e eventos de funil |

**Regra do anúncio pago:** gastar no máximo um terço do que o assinante vale. Se ele fica uns 5 meses a 30 reais (LTV de cerca de 150), o limite é uns 50 reais por assinante. No Meta, um vídeo do simulador funcionando tende a ir melhor que anúncio de busca, que é caro para "curso de Excel".

**Landing pages por público**, todas vendendo o mesmo Pro: emprego (preparação para teste de Excel), concurso, empresas, universidades.

**Eventos a medir (analytics):** visita, primeiro exercício feito, Intro concluído, e-mail capturado, teste de nível feito, início do checkout, assinatura (mensal ou anual), cancelamento. Sempre com origem (UTM, afiliado ou cupom).

## 6. Tarefas para o Claude Code

Onze tarefas em ordem de prioridade; as oito primeiras cabem antes de qualquer venda B2B. Ao enviar, peça que o Claude Code explore o repositório, siga os padrões existentes e entregue um plano em plan mode antes de escrever código, explicando as decisões de backend.

- [ ] **1. Novos preços.** Mensal 34,90 e anual 19,90 por mês (238,80 por ano, Pix ou até 12x), só para novos assinantes; garantia de 7 dias visível no checkout e na página de preços. Pronto quando: o checkout oferece os dois planos com o anual em destaque e quem já assina continua no valor antigo.
- [ ] **2. Eventos de funil e origem.** Registrar os eventos da seção 5, guardando UTM, código de afiliado e cupom desde a primeira visita. Pronto quando: dá para ver a conversão de cada etapa por origem.
- [ ] **3. Captura de e-mail.** Nos três pontos da seção 2 (teste de nível, fim do Intro, ofensiva), sem perder o progresso feito sem cadastro. Pronto quando: o progresso do localStorage é migrado para a conta no cadastro.
- [ ] **4. Upsell no fim do Intro e do desafio do dia.** Mensagem ligada à função usada no exercício. Pronto quando: os dois pontos levam ao checkout com o anual pré-selecionado.
- [ ] **5. Card lateral configurável.** Componente que lê a campanha ativa do banco (`type`, imagem, link, `starts_at`, `ends_at`). Pronto quando: uma campanha cadastrada no banco aparece e sai do ar sozinha na data de fim, sem deploy.
- [ ] **6. Sequências de e-mail.** As cinco sequências da seção 2, com provedor de e-mail transacional e agendamento. Pronto quando: cada gatilho dispara a sequência certa e o usuário consegue se descadastrar.
- [ ] **7. Cupom de afiliado e comissões.** Cupom no checkout; tabelas de afiliados e `affiliate_commissions`; webhook cria comissão pendente; cron aprova após 7 dias sem estorno; exportação mensal das aprovadas. Pronto quando: uma assinatura com cupom gera comissão pendente, aprovada 7 dias depois, e aparece na exportação.
- [ ] **8. Landing pages por público + formulários B2B.** Emprego, concurso, empresas e universidades; formulários "fale com a gente" e "indicar uma empresa" (este com o nome de quem indicou). Pronto quando: as quatro páginas são estáticas e indexadas, e os formulários chegam por e-mail e ficam salvos no banco.
- [ ] **9. Teste de nível com histórico.** \~10 questões, resultado salvo por usuário e por data, para comparar antes e depois. Pronto quando: o resultado direciona para o módulo certo e dois testes do mesmo usuário podem ser comparados.
- [ ] **10. Certificado com carga horária.** Por módulo ou trilha, com URL pública de verificação e botão do LinkedIn. Depende da validação das respostas no servidor. Pronto quando: o certificado só é emitido a partir de resultados validados no servidor e a URL confirma sua autenticidade.
- [ ] **11. Base para empresas (depois).** `organizations` com `domains`, `memberships` com papéis, RLS por organização, painel do gestor e login Google/Microsoft com entrada automática por domínio. Pronto quando: o gestor de uma organização vê só o progresso dos membros dela.
