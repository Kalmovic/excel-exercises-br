# Teste de usabilidade: persona "Marta" (advogada, 46, não técnica)

Ambiente: build de produção já existente (`next start -p 3301`), Playwright/Chromium. Desktop 1280x800 e iPhone 13 (só toques), deviceScaleFactor 1, perfis novos (localStorage vazio). Paywall desligado; sem Supabase (login, pagamento e certificado limitados, como esperado).
Screenshots: `/tmp/claude-0/-home-user-excel-exercises-br/4fb5383a-9cc7-5eb2-9dd1-c4d53f82e443/scratchpad/revisao/persona/` (abaixo, `<S>/` = esse diretório). Prefixo `d` = desktop, `m` = celular.

Jornadas feitas: home + demonstração; Intro 1 a 10 (desktop) e 1, 2, 3, 7 (celular); lição 1 completa (5 etapas) de Fundamentos, Busca/PROCV, Organizar dados, Tabela dinâmica, Formatação condicional, Gráficos; principal + pegadinha de Validação e Várias abas; teste do módulo Intro (aprovada 4/5, refeito) e Gráficos (3/5); caminho do certificado; /pro com as 3 lições embutidas (desktop e celular); reload, voltar e avançar; Tabela dinâmica e Gráfico no celular.

---

## Veredito (na voz da Marta)

> "A ideia é ótima e é exatamente o que eu preciso: fazer na planilha em vez de assistir vídeo. Tabela dinâmica, gráfico, lista suspensa, tudo funcionou no navegador e na maioria das vezes o site me disse o que eu errei. Mas tropecei em coisas que me deixam desconfiada. O PROCV deu 'Correto!' sem o FALSO, e a própria explicação dizia que o FALSO era obrigatório. Numa pegadinha o site disse ao mesmo tempo que as regiões estavam e não estavam em ordem. Fiz exatamente o que a explicação mandava na aba Jan e ele reclamou de parêntese. No 'teste sem dica, uma tentativa' ele me deu dica e me deixou tentar de novo. No celular nem achei a célula que a primeira pergunta pedia. E o certificado, que é o que eu mostraria no RH, não aparece em lugar nenhum. Pagaria R$ 19,90 no anual? **Talvez, depois de testar mais umas semanas no grátis.** Hoje não, porque o botão diz 'Em breve' e porque ainda não confio 100% na correção."

---

## Reclamações

Formato: **severidade** · página · aparelho · passos · esperado × aconteceu · fala da Marta · screenshot · (técnico) causa provável.

### P1: ela fica travada ou é enganada

**1. P1 · /exercicios/nome-da-celula · celular**
- Passos: Home → Começar grátis → Começar pelo básico. A pergunta é "Qual é o nome da célula ativa? (borda verde)".
- Esperado: ver a célula com borda verde.
- Aconteceu: a célula ativa é E4, mas a grade do celular mostra só A–C (e um pedaço de D). E4 fica fora da área visível (x=445 numa grade que vai até 374) e a grade não rola até ela. Só o cabeçalho da linha 4 fica destacado.
- Marta: "Que borda verde? Não tem borda verde nenhuma na minha tela. Primeira pergunta e já não consigo responder."
- Screenshots: `<S>/m07_intro1_full.png`, `<S>/m38_intro1_grade.png`
- Técnico: falta rolar até `inicio.celulaAtiva` (scrollIntoView) na montagem quando a grade é mais larga que a tela.

**2. P1 · /exercicios/procv-preco-pelo-codigo-exato · desktop**
- Passos: depois da 1ª dica (`=PROCV(o que procurar;onde;qual coluna devolver;tipo de busca)`), digitar `=PROCV(F2;A2:C6;3)` em G2 → Verificar.
- Esperado: o aviso de "faltou o FALSO", que o próprio conteúdo prevê ("Sem o último argumento, o PROCV faz busca aproximada e pode trazer o valor errado sem avisar").
- Aconteceu: "Correto! Acertou de primeira!". Logo abaixo, a explicação mostra `=PROCV(F2;A2:C6;3;FALSO)` e diz que "FALSO quer dizer busca exata". A pegadinha e o vídeo do módulo são justamente sobre esquecer o FALSO.
- Marta: "Ele diz que eu acertei, e a explicação mostra outra fórmula. Então o FALSO é obrigatório ou não? No teste da vaga vou errar isso."
- Screenshot: `<S>/d42_procv_semfalso.png`
- Técnico: `errosComuns` só é avaliado quando o valor está errado. Como a tabela está ordenada, a busca aproximada acerta o valor. Faltam uma regra de "forma da fórmula" (4º argumento obrigatório) ou dados de teste alternativos que façam a busca aproximada falhar.

**3. P1 · /exercicios/dados-classificar-maior-valor-pegadinha · desktop**
- Passos: clicar em B2 (Região) → A→Z → Verificar (tentativa 1). Depois clicar em C2 (Valor) → Z→A → Verificar (tentativa 2).
- Esperado: um retorno coerente com o que está na tela.
- Aconteceu: na tentativa 2 aparecem as duas frases juntas: "As regiões ainda não estão em ordem alfabética." e "As regiões estão em ordem, mas dentro de cada uma os valores não vão do maior para o menor." Elas se contradizem, e a segunda nem é verdadeira, porque a tabela está toda em ordem decrescente de valor.
- Marta: "Está ou não está em ordem? O site discorda dele mesmo."
- Screenshot: `<S>/d61_dados_peg_naive2.png`
- Técnico: as mensagens das verificações de "regiões em ordem" e "valor dentro do grupo" são independentes. A segunda deveria ficar suprimida quando a primeira falha.

**4. P1 · /exercicios/abas-total-de-outra-aba (e qualquer fórmula) · desktop**
- Passos: em B2 digitar `=SOMA(`, clicar na aba Jan, arrastar B2:B6, apertar Enter. É exatamente o que a explicação ensina ("Comece a fórmula em B2, clique na aba Jan, selecione as vendas e aperte Enter").
- Esperado: como no Excel, o parêntese fecha sozinho e a fórmula é gravada.
- Aconteceu: a fórmula fica presa em edição com "Faltou fechar um parêntese." em vermelho. Clicar em Verificar não mostra nenhum resultado (silêncio). O mesmo acontece com `=SOMA(B2:B7` em Fundamentos.
- Marta: "Fiz igualzinho ao que está escrito e não funcionou. E o Verificar não faz nada."
- Screenshots: `<S>/d115_abas_verif.png`, `<S>/d120_noparen_verif.png`
- Técnico: o parser recusa parênteses desbalanceados no fim. O Excel completa os `)` faltantes ao confirmar. O Verificar também deveria mostrar uma mensagem no painel de resultado quando a célula ainda está em edição e é inválida.

**5. P1 · /exercicios/dinamica-total-por-regiao · celular**
- Passos: tocar numa célula da tabela → Tabela dinâmica → OK → marcar Região e Valor no painel → Verificar.
- Esperado: ver a tabela dinâmica que montou.
- Aconteceu: a tabela dinâmica é criada em G1, que no celular fica fora da tela (a grade tem 1063px de largura numa área de 356px). A grade não rola até G1. Ela recebe "Correto!" sem nunca ver o resultado. No desktop, a área de G1 mostra "Tabela dinâmica: escolha os campos no painel abaix…" (texto cortado).
- Marta: "Ganhei 'Correto', mas cadê a tabela? Não vi nada mudar."
- Screenshots: `<S>/m17_din_after_ok.png`, `<S>/m20_din_grade.png`, `<S>/m21_din_verif.png`
- Técnico: rolar a grade até o destino da tabela dinâmica ao criá-la (o gráfico já faz isso: `scrollIntoView` em `grafico-N`).

### P2: confuso ou irritante

**6. P2 · /teste/intro, /teste/graficos · desktop** (teste "sem dica e com uma tentativa cada")
- Ao errar aparece "Ainda não. Tentativa 1." e "Releia a pergunta e tente outra alternativa". Às vezes vem uma dica explícita ("As séries e as categorias estão trocadas. Use Alternar Linha/Coluna no Design do Gráfico"). Ela pode corrigir e ganhar "Correto! Exatamente isso.", mas a nota conta a 1ª tentativa (o resultado mostra ✗ nessa questão).
- Além disso, depois de TODA questão, inclusive a 1ª, aparece "Este foi o último exercício do módulo. Voltar para a lista".
- Marta: "Disse que era sem dica e uma chance só. Me deu dica, me deixou tentar de novo, disse 'Correto' e depois marcou errado no resultado. E já na primeira pergunta falou que era a última."
- Screenshots: `<S>/d123_t_q1.png`, `<S>/d127_t_q5.png`, `<S>/d130_t_q1_wrong.png`, `<S>/d131_t_q1_retry.png`, `<S>/d154_tg_q4.png`, `<S>/d132_t_result_retry.png`
- Técnico: o painel de feedback das lições é reaproveitado no teste sem um modo de teste. O texto de "último exercício" é fixo.

**7. P2 · caminho do certificado · desktop**
- Passos: passar no teste Intro (4/5).
- Aconteceu: a tela de aprovação não fala de certificado (o /pro e a home prometem "Certificado"). Em /certificado/emitir aparece "Não encontramos uma aprovação guardada neste navegador. Faça o teste… e emita o certificado na tela do resultado", embora a chave `excel-br:certificado-pendente:intro` exista no localStorage. Em /certificado/emitir?modulo=intro a página só tem o título "Emitir certificado", sem nada embaixo.
- Marta: "Passei! E o certificado? A página diz para emitir na tela do resultado, mas lá não tem botão. E aqui diz que eu não passei."
- Screenshots: `<S>/d128_t_result.png`, `<S>/d133_cert_emitir.png`, `<S>/d138_cert_emitir_mod.png`
- Técnico: `EmitirCertificado` retorna `null` quando a conta está "desligada" (sem Supabase). Isso é aceitável sem backend, mas a página /emitir deveria dizer "certificados chegam em breve" em vez de negar a aprovação ou ficar em branco.

**8. P2 · /teste/intro · desktop · reload**
- Recarregar a tela de resultado (aprovado) volta para "Questão 1 de 5": o resultado some da tela.
- Marta: "Atualizei para mostrar ao meu marido e o resultado sumiu."
- Screenshot: `<S>/d129_teste_reopen.png`

**9. P2 · novos módulos (Organizar dados, Tabela dinâmica, Formatação condicional, Gráficos) · todos os aparelhos**
- Asteriscos aparecem literais no texto: "*Classificar do Maior para o Menor*", "*estável*", "*Continuar com a seleção atual*" (no enunciado do conceito), "*Soma de Valor*", "*Preenchimento Verde e Texto Verde Escuro*", "*É Maior do que*", "*Média de Valor*"…
- Marta: "Por que tem estrelinha no meio do texto? Parece erro de digitação."
- Screenshots: `<S>/d54_dados_ok.png`, `<S>/d64b_dados_conc.png`, `<S>/d74_din_verif.png`, `<S>/d83_cf_ok.png`, `<S>/d86b_cf_peg_dicas.png`
- Técnico: `TextoRico` só entende `**negrito**` e `` `código` ``. Há 22 ocorrências de `*itálico*` em dados/destaque/dinamica/graficos.json. Falta suporte a itálico ou trocar por `**`.

**10. P2 · "Acertou de primeira!" depois de errar · desktop e celular**
- Errar → Recomeçar → acertar mostra "Acertou de primeira!" (aconteceu em Intro teclado, pegadinha de classificação, pegadinha de formatação condicional e no intervalo pelo celular).
- Marta: "Errei duas vezes e ele diz que acertei de primeira? Então não sei se esses elogios valem alguma coisa."
- Screenshots: `<S>/d18_intro7_setas.png`, `<S>/d63_dados_peg_ok.png`, `<S>/d87_cf_peg_999.png`, `<S>/m37_intervalo_ok.png`
- Técnico: Recomeçar zera o contador de tentativas usado pela mensagem.

**11. P2 · /exercicios/dinamica-total-por-regiao-pegadinha · desktop**
- O retorno diz: "Mude em Configurações do Campo de Valor." Nenhum botão tem esse nome. O controle é um seletor "Soma" no campo de Valores.
- Marta: "Procurei 'Configurações do Campo de Valor' na tela inteira e não achei."
- Screenshot: `<S>/d77_din_peg_soma.png`

**12. P2 · /exercicios/destaque-vendas-baixas-variacao-a · desktop**
- Na principal, abrir o menu direto funcionou porque a célula ativa inicial era C2 e "Aplica-se a" veio como C2:C11. Na variação A ela repetiu o mesmo gesto, mas a célula inicial era A1: a regra foi aplicada a "A1" (Vendedor) sem aviso, e o resultado foi "Nenhuma célula… está destacada".
- Marta: "Fiz igual ao anterior e agora não deu? Só mudou o número."
- Screenshot: `<S>/d84_cf_va.png` (o retorno pelo menos explica o que fazer)

**13. P2 · retornos que dizem o quê, mas não o porquê · desktop**
- Classificar clicando Z→A com a célula A1 ativa: "Os dados em A2:A10 ainda não estão na ordem pedida. Os dados em C2:C10…". Não diz que ela classificou pela coluna errada (`<S>/d52_dados_err.png`).
- PROCV com coluna além da tabela: "retornou #REF!: a fórmula aponta para uma célula que não existe" (`<S>/d48_procv_peg_err.png`).
- Marta: "Que célula não existe? Eu só mudei o número da coluna."

**14. P2 · números e promessas inconsistentes · home, /trilha, /pro · todos**
- A home mostra 9 módulos (0–8) com "Casos reais = Módulo 8" e nenhum dos módulos novos. A trilha tem 15 módulos: "Organizar dados = Módulo 8", "Casos reais = Módulo 14".
- O /pro diz "300 exercícios" no topo, "230 questões de lição" no card logo abaixo e "300 questões" na tabela. Diz "Passe no teste de cada um dos 15 módulos" e ao mesmo tempo "14 módulos / 14 testes".
- Na tabela do /pro, a coluna Grátis marca ✓ em "Progresso salvo na conta, em qualquer aparelho", mas /entrar diz "Contas chegam em breve" e a home diz "Progresso salvo no seu navegador".
- A home fala em "1º exercício de cada módulo", e o /pro em "1ª lição de cada módulo".
- Marta: "Afinal são 230 ou 300? 14 ou 15? Como advogada eu leio as letras miúdas, e isso me faz desconfiar do resto."
- Screenshots: `<S>/d01_home_full.png`, `<S>/d26_trilha_full.png`, `<S>/d139_pro.png`, `<S>/d139_pro_full.png`

**15. P2 · barra de progresso da lição · desktop**
- Depois de fazer 4 das 5 etapas da lição 1 a barra continua "0 de 7" (ou "0 de 3"). Ela só anda quando a lição inteira termina.
- Marta: "Fiz quatro exercícios e continuo no zero?"
- Screenshots: `<S>/d32_fund1_step2.png`, `<S>/d61_dados_peg_naive2.png`

**16. P2 · painel da tabela dinâmica · desktop 1280x800**
- O painel de campos fica abaixo da grade. Enquanto marca os campos ela não vê a tabela em G1 nem o botão Verificar, e precisa ficar rolando para cima e para baixo.
- Screenshots: `<S>/d70_din_painel.png`, `<S>/d72_din_campos_marcados.png`

**17. P2 · mapa da trilha · desktop e celular**
- A página tem cerca de 9.800px de altura e não tem índice nem "pular para módulo". Clicar no cartão do módulo ("Tabela dinâmica") não faz nada: só as bolinhas numeradas abrem a lição. Ao abrir, a página já vem rolada, e no celular o "Começar pelo básico" fica parcialmente fora da tela.
- Marta: "Quero a tabela dinâmica. Rolei, rolei, cliquei no nome e nada aconteceu."
- Screenshots: `<S>/d27_trilha_dinamica.png`, `<S>/d27b_after_card_click.png`, `<S>/m06_trilha.png`

**18. P2 · textos de desktop no celular**
- Ao errar a seleção de intervalo no celular: "Arraste o mouse ou use Shift + setas". O exercício de teclado continua dizendo "usando só as setas do teclado… clique em A1… mouse" (no celular o toque é aceito, ainda bem). A barra de atalhos "Enter confirma · F2 edita · Ctrl+C…" aparece embaixo de toda grade no celular. O enunciado da seleção de intervalo, por outro lado, já foi adaptado ("toque em ▦ Selecionar intervalo").
- Marta: "Que mouse? Estou no celular."
- Screenshots: `<S>/m34_intervalo_2taps.png`, `<S>/m11_intro_teclado_full.png`

**19. P2 · demonstração da home · celular**
- Ao tocar em B6, a grade rola para a direita e esconde a coluna A (os rótulos "Mercado, Luz… Total") e os números das linhas. Ela fica vendo só valores soltos.
- Screenshots: `<S>/m03_demo_before.png`, `<S>/m02_demo_tap.png`

**20. P2 · /pro, lição embutida PROCV · desktop**
- A coluna G (Preço), onde está a resposta, aparece cortada na borda direita do quadro. G2 quase não se vê sem rolar a grade.
- Screenshot: `<S>/d140_pro_embed_procv.png`

### P3: acabamento

**21. P3** · modal "Módulo concluído" (Intro 10) · desktop: o fundo escuro cobre só até 784px de 800. A faixa amarela "Teste do Módulo 0" aparece nítida e clicável embaixo do modal. `<S>/d25_modal_settled.png`. Técnico: o overlay `fixed inset-0` mede 784px; provavelmente o containing block é um ancestral com transform/filter.

**22. P3** · /pro, quem já fez a lição de PROCV: a lição embutida mostra a explicação (a resposta) com a planilha vazia e sem o "Correto!". `<S>/d146_pro_embed_returning.png`

**23. P3** · confete continua caindo enquanto ela rola até os preços no /pro (celular) e na página seguinte depois de um acerto. `<S>/m31_pro_planos.png`, `<S>/d32_fund1_step2.png`

**24. P3** · pegadinha de Várias abas: a fórmula `Vendas 2025!B2:B6` (de outra aba) pinta B2:B6 na aba Resumo, que é a aba errada. `<S>/d118b.png`

**25. P3** · Validação, pegadinha: o enunciado diz "Pago antecipado?" e o cabeçalho da coluna é "Antecipado". `<S>/d109_val_peg.png`

**26. P3** · os links "Funções de A a Z" e "Termos" do rodapé abrem páginas "Em breve". A home mostra "Planilhês do Dia #12" (ilustração), e o desafio real é o #8.

**27. P3** · gráfico no celular: o gráfico inserido fica cortado na borda direita da grade (a prévia no painel "Design do Gráfico" compensa). `<S>/m23b_graf_full.png`

---

## Erros de console e de página

Tudo foi monitorado (console error/warning, pageerror, respostas >= 400) em cerca de 70 URLs distintas, no desktop e no celular.
- **Nenhum pageerror, erro de React/hidratação ou falha de JS.**
- Em todas as páginas: `GET /_vercel/insights/script.js` → 404, com "Failed to load resource: 404 (Not Found)" e `net::ERR_ABORTED` no console (o Vercel Analytics é injetado fora da Vercel). Ruído, mas aparece em todas as páginas.
- `/naoexiste` → 404 esperado (página "#REF!" bem feita).
- Log bruto: `<S>/errors.log`

## O que funcionou bem

- A demonstração da home é excelente: o "Use uma fórmula (começando com =)" ao digitar 1050 ensina na hora.
- Muitos retornos de erro são ótimos e em linguagem de gente: `;` × `:` na SOMA, "Você quis dizer MÉDIA? O nome da função leva acento", a lista com vírgula ("No Excel em português, os itens são separados por ponto e vírgula"), o gráfico com a linha de Total ("uma categoria a mais"), a aba com espaço ("vai entre aspas simples"), "Faltam 8 células" na validação, "Você chegou lá, mas usou o mouse".
- Tabela dinâmica, gráficos, formatação condicional, validação, classificação e várias abas funcionam de verdade, com clique no desktop e com toque no celular (a tabela dinâmica tem caixas de seleção, então não precisa arrastar).
- As dicas são graduais (1/2, 2/3) e ajudam sem entregar a resposta.
- O trabalho confirmado (fórmulas, tabela dinâmica, gráfico) persiste após recarregar a página e ao usar voltar e avançar do navegador.
- A estrutura principal → variações → pegadinha → conceito é clara, e as pegadinhas são bem escolhidas (o Total no gráfico, o "maior que" que exclui o 1000, o espaço no nome da aba).
- O resultado do teste é claro (3/5 com "Revisar a lição"), e a página 404 tem personalidade.
- Não há rolagem horizontal da página no celular (scrollWidth = 390), e o /pro é claro sobre preço (R$ 19,90/mês no anual, R$ 238,80; R$ 34,90 no mensal) e sobre a garantia de 7 dias.
