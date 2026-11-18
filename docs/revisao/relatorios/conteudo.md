# Revisão de conteúdo — Planilhês

**Escopo lido:** módulos novos na íntegra: `dados` (21 itens, incluindo `agregar-ignorar-erro`), `dinamica` (20), `destaque` (20), `graficos` (20), `validacao` (20) e `abas` (20). Também as 13 extras recentes (`correspx-*` ×2, `unirtexto-*`, `dividirtexto-*`, `pegar-top-3`, `escolhercols-*`, `let-*`, `vp-*`, `vf-*`, `nper-*`, `taxa-*`, `marred-*`, `numsemana-*`). Na trilha antiga, amostra de cerca de 150 itens: `fundamentos` inteiro, `logica` inteiro, `condicionais` inteiro, e em `busca`, `texto`, `datas`, `arrays` e `casos` só as lições principal, pegadinha, conceito e teste. Também as 30 questões de `concurso/questoes.json`.

**Método:** refiz as contas de todos os valores esperados e de todos os números citados nas explicações. Isso incluiu financeiro (VP, VF, NPER, TAXA), dias úteis, NÚMSEMANA, INSS, somas de tabela dinâmica e listas de destaque. Também passei um script que compara os números escritos depois de "→" nas explicações com os `esperado`. As planilhas intermediárias estão em `revisao/conteudo/`. A CI (`conteudo.test.ts`) confere `esperado` × `solucaoReferencia`, mas **não confere os números escritos nas explicações**. Foi justamente aí que apareceram os erros mais graves.

**Contagem:** P0 = 5 · P1 = 7 · P2 = 15 · P3 = 13 · lacunas de cobertura = 20

---

## P0 — fato errado ou impossível de resolver como está

### P0-1 · `modulos/dinamica.json` · `dinamica-regiao-por-canal` · `explicacao[1]`
- **Atual:** "As células vazias são combinações que não aconteceram (o Leste nunca vendeu pelo canal Site, por exemplo). Os totais aparecem dos dois lados."
- **Problema:** é falso com estes dados. A linha 13 é *Site | Daniel | Leste | Mouse | 160*. As 9 combinações região × canal existem (Sul: Loja, Site e Telefone; Norte: Site, Loja e Telefone; Leste: Telefone, Loja e Site), então a tabela cruzada **não tem nenhuma célula vazia**. O aluno vai procurar a célula vazia e não vai achar.
- **Proposta:** "Cada célula do meio responde a uma combinação: o Sul vendeu R$ 3.480,00 pelo Site, por exemplo. Se uma combinação nunca tivesse acontecido, a célula ficaria vazia. Os totais aparecem dos dois lados: Total Geral na última linha e na última coluna."

### P0-2 · `modulos/validacao.json` · `validacao-lista-status` · `verificacoes[0].aceita` (e o motor da validação)
- **Atual:** `"aceita": ["Pago", "Cancelado", "pendente"]` com `fonte: "Pago;Pendente;Cancelado"`, ou seja, itens digitados na caixa Fonte.
- **Problema:** no Excel, uma lista com os itens **digitados na caixa Fonte** diferencia maiúsculas de minúsculas. Digitar "pendente" mostra o alerta de erro. Só a lista que vem de um **intervalo** (`=$F$2:$F$5`) aceita qualquer caixa. O exercício (e o simulador) ensina o contrário do Excel. Fontes: fóruns MrExcel e ExcelForum, além de tutoriais (tutorialspoint e extendoffice) que usam justamente a lista digitada para conseguir validação sensível à caixa. Confiança alta, mas vale testar num Excel 365 pt-BR antes de mexer no motor.
- **Proposta:** mover "pendente" para `recusa`, ou seja, `"aceita": ["Pago", "Cancelado", "Pendente"], "recusa": ["Pg", "Aprovado", "pendente"]`. Ajustar o motor: lista com fonte digitada compara exato; lista com fonte em intervalo compara sem caixa. Com isso, a frase da explicação "Acaba o 'pago', 'PG' e 'Pago.' misturados" passa a ser verdadeira.

### P0-3 · `modulos/validacao.json` · `validacao-dados-antigos-variacao-a` · `explicacao[1]`
- **Atual:** "Repare que \"pendente\" em minúsculas não foi marcado: a lista não diferencia maiúsculas."
- **Problema:** a fonte é `Pago;Pendente;Cancelado`, digitada. No Excel, **Circular Dados Inválidos marca "pendente"** (C6). Do jeito que está, o exercício só tem 2 respostas certas (C3 e C8), mas no Excel são 3.
- **Proposta (escolha uma):**
  - (a) Manter a fonte digitada, incluir C6 na correção (`"valores", "intervalo": "C6", "esperado": [["Pendente"]]`) e trocar o texto por: "Circular Dados Inválidos marca **Pgo** (C3), **pendente** (C6) e **Cancelad** (C8). Com os itens digitados na Fonte, a lista diferencia maiúsculas: \"pendente\" não é \"Pendente\"."
  - (b) Trocar a fonte por um intervalo (`=$F$2:$F$4`, com os três status em F2:F4) e escrever: "Repare que \"pendente\" em minúsculas não foi marcado: com a lista vinda de um intervalo, o Excel não diferencia maiúsculas. Com os itens digitados na Fonte, diferenciaria."

### P0-4 · `extras/casos.json` · `vf-reserva-de-emergencia` · `explicacao[0]`
- **Atual:** "`=VF(B2;B3;-B1)` → cerca de R$ 7.940."
- **Problema:** o resultado é **R$ 7.902,95** (300 × ((1,008^24 − 1)/0,008)). O próprio `esperado` é 7902,95.
- **Proposta:** "`=VF(B2;B3;-B1)` → cerca de R$ 7.903."

### P0-5 · `extras/casos.json` · `nper-quantos-meses` e `taxa-juros-escondidos` · `explicacao[0]`
- **Atual (NPER):** "`=NPER(B2;-B3;B1)` → cerca de 13,9 meses: na prática, 14 parcelas."
- **Problema:** o resultado é **13,73**, e o esperado também é 13,7322.
- **Proposta:** "`=NPER(B2;-B3;B1)` → cerca de 13,7 meses: na prática, 14 parcelas (a última, menor)."
- **Atual (TAXA):** "`=TAXA(B2;-B3;B1)` → cerca de 2,9% ao mês."
- **Problema:** o resultado é **2,84%** (esperado 0,028392). Arredondado com uma casa, dá 2,8%, não 2,9%.
- **Proposta:** "`=TAXA(B2;-B3;B1)` → cerca de 2,84% ao mês."

---

## P1 — enganoso ou ambíguo

### P1-1 · `modulos/fundamentos.json` · `teste-fundamentos-4` · `enunciado[0]` e cabeçalho `D1`
- **Atual:** "Em **D2**, aplique a taxa de **F1** sobre C2, numa fórmula que funcione copiada até **D6**." O cabeçalho de D1 é "Com taxa".
- **Problema:** "Com taxa" leva a `=C2*(1+$F$1)` (824). A correção espera só o valor da taxa, `=C2*$F$1` (24). Num teste sem dicas, o aluno que entende certo leva erro.
- **Proposta:** trocar D1 para "Valor da taxa" e o enunciado para "Em **D2**, calcule o **valor da taxa** de **F1** sobre a despesa de C2, numa fórmula que funcione copiada até **D6**."

### P1-2 · `modulos/casos.json` · `pgto-parcelamento-pegadinha` · `enunciado` e `explicacao`
- **Atual:** "Os juros em B2 são de 24% ao ano… Com parcelas mensais, a taxa precisa ser mensal: `=PGTO(B2/12;B3;-B1)`."
- **Problema:** dividir por 12 só vale para **taxa nominal** com capitalização mensal. Para 24% a.a. *efetivos*, a taxa mensal equivalente é (1,24)^(1/12) − 1 ≈ 1,81%. Quem estuda matemática financeira para concurso (Cesgranrio e FCC cobram isso) vai estranhar.
- **Proposta (enunciado):** "Os juros em **B2** são de **24% ao ano, com capitalização mensal** (taxa nominal), mas as 12 parcelas são mensais. A fórmula em B4 deu cerca de 830. Corrija-a."
- **Proposta (explicação, acrescentar):** "Atenção: dividir por 12 vale para taxa *nominal*. Se os 24% fossem a taxa efetiva do ano, a mensal equivalente seria `=(1+B2)^(1/12)-1`, cerca de 1,81%."

### P1-3 · `modulos/condicionais.json` · `teste-condicionais-5` · `enunciado[0]`
- **Atual:** "Qual fórmula está escrita corretamente?"
- **Problema:** a opção 2, `=SOMASE(C2:C8;B2:B8;"Sul")`, também é sintaticamente válida (intervalo; critério; intervalo_soma), e o Excel aceita. A pergunta não diz o que a fórmula deveria fazer.
- **Proposta:** "Qual fórmula soma os valores de **C2:C8** só das linhas em que **B2:B8** é **Sul**?"

### P1-4 · `modulos/graficos.json` · `grafico-duas-series-variacao-b` ("Ranking pronto para apresentar") · `explicacao`
- **Problema:** no gráfico de **barras**, o Excel desenha a primeira categoria **embaixo**. Com a tabela em ordem decrescente, o "Mais vendidos" fica de cabeça para baixo: o Notebook (186) vai para a base. O título diz "pronto para apresentar", mas no Excel real não fica.
- **Proposta (acrescentar à explicação):** "No Excel, as barras saem de baixo para cima: o primeiro da tabela fica embaixo. Para o campeão ficar no topo, classifique a tabela do menor para o maior ou marque **Categorias em ordem inversa** em Formatar Eixo."

### P1-5 · `modulos/abas.json` · `abas-procv-tabela-de-precos-variacao-a` · `dicas[0]`
- **Atual:** "SOMASE recebe três intervalos e critérios; os dois intervalos da soma estão na outra aba."
- **Problema:** a frase é confusa e errada. SOMASE recebe **dois** intervalos e **um** critério.
- **Proposta:** "SOMASE recebe três partes: onde procurar, o critério e o que somar. Os dois intervalos estão na aba Lançamentos; o critério está aqui no Resumo."

### P1-6 · `modulos/destaque.json` · `destaque-vendas-baixas-variacao-a` · `explicacao[1]`
- **Atual:** "O valor da regra aceita o número como você escreveria na célula: 3000, 3.000 ou R$ 3.000."
- **Problema:** não confirmei que a caixa de *É Maior do que* do Excel converte "R$ 3.000" em número. Se ela guardar como texto, a regra não destaca nada e nenhum erro aparece. Ensinar isso como regra geral é arriscado.
- **Proposta:** "No Excel, digite só o número (3000) na caixa da regra: é o jeito que nunca falha. O formato R$ da célula não muda a comparação."

### P1-7 · `modulos/dados.json` · `dados-classificar-maior-valor-pegadinha` · `dicas` e `explicacao`
- **Problema:** a lição ensina como caminho principal o truque de classificar duas vezes, aproveitando a classificação estável. Em teste prático de vaga, o esperado é **Classificar** com dois níveis. Pelo schema (`chaves` até 3, "Classificar personalizado"), o simulador já suporta isso. A frase "No Excel de verdade, Dados → Classificar também deixa…" passa a impressão de que o caminho padrão é o secundário.
- **Proposta (explicacao[0]):** "Use **Dados → Classificar**: primeiro nível **Região** (A a Z) e **Adicionar Nível** com **Valor** (Do Maior para o Menor)."
- **Proposta (explicacao[1]):** "Outro caminho é classificar duas vezes, primeiro pelo critério de desempate (Valor) e depois pelo principal (Região). Funciona porque a classificação do Excel é *estável*: nos empates de Região, as linhas ficam na ordem em que já estavam."
- **Proposta (dicas[1]):** "Na janela Classificar, cada critério é um nível. O de cima manda; o de baixo desempata."

---

## P2 — qualidade de dica e explicação

### P2-1 · sistêmico · alternativas erradas sem `dica` nas questões de múltipla escolha da trilha antiga
Das 65 questões de múltipla escolha fora dos testes, **44** têm pelo menos uma alternativa errada sem `dica`. Todas são dos módulos antigos; os módulos novos estão completos. Exemplos e textos prontos:
- `fundamentos` · `media-mensal-de-vendas-conceito` · opção "Conta como 1": "Célula vazia não vale nada: nem 0 nem 1. A MÉDIA simplesmente a deixa de fora."
- `fundamentos` · `ordem-das-contas-conceito` · "24": "Não há conta aqui que dê 24: confira a multiplicação 3*4 e some o 2 depois." · "9": "Isso seria só a soma 2+3+4; o * é multiplicação."
- `fundamentos` · `comissao-com-cifrao-conceito` · "A planilha": "Para apontar outra aba usa-se o nome da aba e !, não o $."
- `logica` · `se-aprovado-conceito` · "Erro": "Teste falso não é erro: o SE simplesmente devolve o 3º argumento." · "0": "O SE só devolve 0 se o 3º argumento for 0. Aqui ele é B."
- `logica` · `ses-otimo-bom-conceito` · "Encerrar a fórmula": "Quem encerra a fórmula é o parêntese. O VERDADEIRO é um teste que sempre passa." · "Converter em texto": "O VERDADEIRO não converte nada: ele faz o último par valer para todo o resto."
- `busca` · `procv-preco-pelo-codigo-exato-conceito` · "Em qualquer coluna": "Quem procura em qualquer coluna é o PROCX. O PROCV só procura na primeira." · "Na última coluna": "A última coluna costuma ser o que se devolve, não onde se procura."
- `datas` · `diatrabalhototal-dezembro-conceito` · "Segunda a sábado": "Sábado também fica de fora. Para mudar o fim de semana, existe o DIATRABALHOTOTAL.INTL." · "Todos os dias": "Isso é `=fim-início+1`. O DIATRABALHOTOTAL tira sábados, domingos e feriados." · "Só os feriados": "Os feriados são descontados, não contados."
- Lista completa (arquivo, slug e alternativas sem dica): `/tmp/claude-0/-home-user-excel-exercises-br/4fb5383a-9cc7-5eb2-9dd1-c4d53f82e443/scratchpad/revisao/conteudo/mc-sem-dica.txt`. Os mais urgentes, por terem 3 alternativas sem dica: `casos/comissao-por-faixa-valor-pegadinha`, `casos/pgto-parcelamento-conceito`, `datas/diatrabalhototal-dezembro-pegadinha`, `datas/diatrabalhototal-dezembro-conceito`, `texto/ext-texto-ano-do-codigo-conceito` e `arrays/filtro-vendas-do-sul-conceito`.

### P2-2 · sistêmico · dica genérica "Releia a pergunta com calma: a resposta está na regra da lição."
- **Problema:** aparece em 47 questões. Não ajuda em nada e soa como bronca para um adulto iniciante.
- **Proposta:** uma dica por questão que aponte o conceito. Exemplos:
  - `somases-sul-pago-pegadinha`: "Pense no CONT.SE com "ana" e "Ana": os critérios do Excel diferenciam maiúsculas?"
  - `procv-faixa-de-comissao-conceito`: "Imagine 9.999 numa tabela com 5.000 e 10.000: em qual faixa ele cabe?"
  - `datadif-tempo-de-empresa-pegadinha`: "Conte os aniversários de empresa que já passaram até 30/11/2026."

### P2-3 · `modulos/fundamentos.json` · `errosComuns` copiados de outro contexto
- `ordem-das-contas-variacao-a` (desconto): a mensagem de `^=A2\*\(B2\+C2\)$` fala em "frete". **Proposta:** "Os parênteses fizeram o desconto ser multiplicado pela quantidade."
- `media-mensal-de-vendas-variacao-b` e `-pegadinha` (notas e valores): as mensagens falam em "meses" e em "linha do total", que não existem nesses exercícios. **Proposta:** apagar os dois padrões nesses itens, ou trocar por `^=SOMA\(B2:B5\)/4$` → "Dividindo por 4 você contou a célula vazia. A MÉDIA conta sozinha só as células com número."

### P2-4 · `src/content/index.ts` · `MODULOS` · descrições de `fundamentos` e `arrays`
- **Problema:** "…porcentagem, ARRED e o famoso $" e "…e SEQUÊNCIA". As duas funções só aparecem nas extras (Pro, fora da trilha e do troféu). O aluno free não as encontra.
- **Proposta:** levar uma lição de ARRED e uma de SEQUÊNCIA para a trilha, ou trocar as descrições por: "SOMA, MÉDIA, MÍNIMO/MÁXIMO, operadores, porcentagem e o famoso $." e "FILTRO, CLASSIFICAR e ÚNICO: uma fórmula, muitos resultados."

### P2-5 · `modulos/graficos.json` · `grafico-duas-series-pegadinha` · `explicacao[0]`
- **Problema:** apagar o cabeçalho "Ano" funciona, mas deixa a tabela sem título. Num teste de vaga, o caminho limpo é corrigir a série.
- **Proposta:** "Jeito rápido: apague o cabeçalho **Ano** (A1), e o Excel passa a ler os anos como categorias. Jeito limpo: **Selecionar Dados** → remova a série *Ano* e, em **Rótulos do Eixo Horizontal (Categorias) → Editar**, escolha A2:A6. Outra saída é digitar os anos como texto ('2021)."

### P2-6 · `modulos/graficos.json` · `grafico-duas-series` · `explicacao` (acrescentar)
- **Problema:** os cabeçalhos estão digitados como `'2025` e `'2026` (texto), e isso não é explicado. Com 2025 e 2026 como **números**, o Excel pode achar que a linha 1 também é dado. É a mesma armadilha da pegadinha do "Ano".
- **Proposta:** "Repare que os cabeçalhos 2025 e 2026 estão como texto. Se fossem números, o Excel poderia desenhá-los como dados, a mesma armadilha da pegadinha do Ano."

### P2-7 · `modulos/dados.json` · `agregar-ignorar-erro` · `dicas[0]` e `explicacao[1]`
- **Atual:** "MÁXIMO para no primeiro erro que encontra no intervalo." / "…a opção 7 ignora erros e também as linhas escondidas pelo filtro."
- **Proposta (dica):** "Se houver um erro qualquer no intervalo, o MÁXIMO devolve o erro em vez do resultado."
- **Proposta (expl.):** "Outras combinações úteis: 9 (soma) e 14 (MAIOR, com o k no fim). A opção 7 ignora erros **e** linhas ocultas, tanto pelo filtro quanto à mão."

### P2-8 · `extras/texto.json` · `dividirtexto-endereco` · `explicacao` (acrescentar)
- **Proposta:** "Atenção: o que sai do DIVIDIRTEXTO é sempre texto, até o \"120\". Para fazer conta com o número, use `=VALOR(C2)` ou `--C2`."

### P2-9 · `modulos/datas.json` · `datadif-tempo-de-empresa` · `explicacao` (acrescentar)
- **Proposta:** "O DATADIF não aparece na lista de sugestões nem na ajuda do Excel. É uma função \"escondida\", mas funciona: digite o nome inteiro."

### P2-10 · `modulos/validacao.json` · `validacao-lista-status-variacao-a` · `explicacao[1]`
- **Proposta:** "Com a lista num intervalo, incluir um departamento novo é só escrever na tabela de departamentos. Dica de escritório: transforme F1:F5 numa **Tabela** (Ctrl+Alt+T) ou dê um nome ao intervalo, e a lista cresce sozinha."

### P2-11 · `modulos/dinamica.json` · `teste-dinamica-3` · dados
- **Problema:** todas as vendas do Norte são do Bruno, então a tabela sai com uma linha só (Bruno: 4). Fica fácil acertar por acaso e a questão mede pouco.
- **Proposta:** filtrar **Sul** (Ana: 4, Carla: 3) ou pedir "contagem por produto, só Norte" (Mouse 1, Notebook 2, Monitor 1).

### P2-12 · `modulos/destaque.json` · `destaque-vendas-baixas-pegadinha` · `explicacao[1]`
- **Problema:** "É Maior do que 999,99" só funciona porque os valores são inteiros. Ensinar isso como saída é frágil (999,995 escapa).
- **Proposta:** "Caminhos que funcionam: **Nova Regra** com a fórmula `=C2>=1000` (o mais seguro) ou **Está Entre** 1000 e um valor bem alto (o Entre inclui as pontas). *É Maior do que 999,99* só serve se os valores não tiverem mais de duas casas."

### P2-13 · `modulos/graficos.json` · `grafico-vendas-por-mes-pegadinha` · `explicacao[0]`
- **Atual:** "Se já inseriu, corrija em **Dados** no Design do Gráfico."
- **Proposta:** "Se já inseriu, corrija em **Design do Gráfico → Selecionar Dados**, ou arraste a borda azul do intervalo para tirar a linha do Total."

### P2-14 · `modulos/texto.json` · `arrumar-espacos-sobrando-pegadinha` · `explicacao` (acrescentar)
- **Proposta:** "Atenção: o ARRUMAR não tira o espaço \"não separável\" que vem de páginas da web. Nesse caso, use `=ARRUMAR(SUBSTITUIR(A2;CARACT(160);\" \"))`."

### P2-15 · `extras/casos.json` · `vp-quanto-financiar` · `explicacao[0]`
- **Atual:** "→ cerca de R$ 27.233." O valor exato é 27.234,04.
- **Proposta:** "`=VP(B2;B3;-B1)` → cerca de R$ 27.234."

---

## P3 — polimento de linguagem e nomes da interface

1. `modulos/destaque.json` · `destaque-pedidos-repetidos-variacao-b` · `explicacao[0]`. **Atual:** "**Abaixo da Média…** em amarelo, A média é R$ 1.708,00, e a regra acompanha se os valores mudarem." → "**Abaixo da Média…** em amarelo. A média é R$ 1.708,00, e a regra acompanha se os valores mudarem."
2. `modulos/abas.json` · `teste-abas-5` · `enunciado[0]`. **Atual:** "…da aba **Vendas 2025**." → "…da aba **Vendas 2025**?"
3. `modulos/dinamica.json` · `dinamica-total-por-regiao-conceito` · `explicacao[0]`. **Atual:** "**Analisar Tabela Dinâmica → Atualizar** (Alt+F5)". A Microsoft pt-BR usa "Análise de Tabela Dinâmica" em umas páginas e "Tabela Dinâmica Analisar" em outras, conforme a versão. Não tenho certeza da string atual. **Proposta:** "clique com o botão direito na tabela dinâmica → **Atualizar** (ou a guia **Análise de Tabela Dinâmica → Atualizar**, Alt+F5)". O caminho pelo botão direito não depende do nome da guia.
4. `modulos/dinamica.json` · `dinamica-usar-resultado-conceito` · `explicacao[0]`. A mensagem citada entre aspas ("*Não é possível alterar esta parte de uma tabela dinâmica*") pode não ser literal; não confirmei. **Proposta:** "O Excel recusa e avisa que não é possível alterar essa parte da tabela dinâmica."
5. `modulos/dados.json` · `dados-classificar-maior-valor-variacao-a` · `explicacao[1]`. **Atual:** "Repare que o acento não atrapalha: Íris fica entre Hugo e o fim da lista, como no Excel." → "Repare que o acento não atrapalha: Íris vem logo depois de Hugo, como se fosse Iris."
6. `modulos/dados.json` · `dados-classificar-maior-valor` · `explicacao[1]`. **Atual:** "O Excel percebe que a primeira linha é cabeçalho (está em negrito)…" → "O Excel percebe que a primeira linha é cabeçalho (é texto em cima de números, e costuma estar em negrito)…"
7. `modulos/dados.json` · `dados-classificar-maior-valor-conceito`. A alternativa correta é de longe a mais longa, o que entrega a resposta. **Proposta (opção 0):** "Só a coluna Valor muda de ordem e os valores ficam ao lado do vendedor errado." Também vale alongar a opção 1: "A tabela inteira é classificada junto, como se você tivesse selecionado tudo."
8. `modulos/texto.json` · `pri-maiuscula-nomes` · `explicacao[0]`. **Atual:** "Primas: MAIÚSCULA e MINÚSCULA." → "Funções parecidas: MAIÚSCULA (tudo maiúsculo) e MINÚSCULA (tudo minúsculo)."
9. `modulos/texto.json` · `esquerda-e-direita-do-pedido-pegadinha` · `explicacao[0]`. A referência "(lição 5.6)" depende de uma numeração que a tela pode não mostrar. → "…use LOCALIZAR (lição *LOCALIZAR: a posição do @*)."
10. `modulos/graficos.json` · vários (`grafico-vendas-por-mes` etc.). "**Inserir Gráfico → Colunas**". No Excel pt-BR o caminho é **Inserir → Gráficos → Inserir Gráfico de Colunas ou de Barras**. Sugiro citar o nome real uma vez na lição principal: "No Excel: **Inserir → Inserir Gráfico de Colunas ou de Barras → Colunas Agrupadas**."
11. `modulos/datas.json` · `teste-datas-5`. A alternativa "Uma imagem" não convence ninguém. → "Um valor de hora".
12. `concurso/questoes.json` · `concurso-22-idade-com-datadif` · opção "12775", que é 35 × 365 e não o número real de dias. O número real é **13.144**. Para um distrator mais convincente: "13144", com a dica "Esse é o total de dias (B1−A1); "Y" conta anos completos."
13. Terminologia: os módulos novos usam "aba" de forma consistente, mas `grade.nome` padrão e o schema falam em "Planilha1". O Excel pt-BR chama a aba de "planilha" ("Inserir Planilha", "Renomear"). Sugiro uma frase na lição `abas-total-de-outra-aba`: "No Excel, cada aba também é chamada de *planilha* (Planilha1, Planilha2…)." Assim o aluno reconhece o termo nos menus e nas questões de concurso, que costumam usar "planilha".

---

## O que conferi e está certo (para não mexer)

- **dados:** totais do SUBTOTAL (Sul 1.050, Norte 1.150, Leste 1.350), códigos 1/2/3/4/5/9 e 101–111 e as classificações em dois níveis estão certos. Os termos "Selecionar Tudo", "Expandir a seleção", "Continuar com a seleção atual" e "Classificar do Mais Antigo para o Mais Novo" também.
- **dinamica:** totais Sul 12.500, Norte 7.150, Leste 4.610 e Total 24.260. Participações de 51,5% e 29,5%, e a diferença de 5.350. As células H2–H5 batem com o layout compacto em G1. Também conferem "Configurações do Campo de Valor", INFODADOSTABELADINÂMICA, "Máx.", "Rótulos de Linha", "Total Geral" e a necessidade de Atualizar.
- **destaque:** as listas de células destacadas estão certas (média 1.708, top 3, 2 menores, duplicados e exclusivos com ANA/Ana sem diferenciar caixa). Os nomes de menu também ("Realçar Regras das Células", "É Menor do que…", "Texto que Contém…", "Valores Duplicados…/Exclusivos", "10 Primeiros Itens…", "Abaixo da Média…") e o `$` na regra por fórmula.
- **graficos:** "Alternar Linha/Coluna", "Design do Gráfico", "Rótulos de Dados", a leitura de uma primeira coluna numérica como série, o uso do nome da série como título e a regra da tabela 3×3 (séries pelas colunas) estão corretos.
- **validacao:** separador `;` na Fonte, as abas "Configurações / Mensagem de entrada / Alerta de erro", os operadores e "Circular Dados Inválidos" estão certos. Também está certo que colar por cima substitui a validação e que validação criada depois não confere o que já existia.
- **abas:** `Aba!A1`, aspas simples para nome com espaço, referência 3D `Jan:Mar!`, renomear atualiza a fórmula e excluir gera #REF!. Os totais conferem (6.355, 6.420, 6.860, 19.635, 20.275 e 1.309).
- **extras novas:** MARRED, NÚMSEMANA tipo 2 (semanas 2, 3, 6, 9 e 12 conferidas no calendário de 2026) e tipo 21 = ISO, CORRESPX (exata por padrão; modo −1 sem exigir ordem), UNIRTEXTO, PEGAR, ESCOLHERCOLS e LET estão certos. Nos financeiros, os valores esperados estão certos; o erro está só nos números escritos nas explicações (P0-4, P0-5, P2-15).
- **casos/INSS:** as parcelas a deduzir são coerentes com as faixas (24,32, 111,40 e 198,49) e o teto de 988,09 confere.
- **concurso:** as 30 questões têm o gabarito certo e uma única alternativa correta, e os distratores são plausíveis e têm dica.

---

## Lacunas de cobertura (o que teste de vaga ou concurso cobra e o curso não tem), por prioridade

1. **Atalhos e operação básica cobrados em concurso:** F2 (editar), F4, Ctrl+Enter, Ctrl+D, Alt+= (AutoSoma), Ctrl+; (data de hoje), Ctrl+Shift+; (hora), Ctrl+Z/Y, Ctrl+Page Down (próxima aba), Ctrl+setas e Ctrl+Shift+setas. A FCC, a Vunesp e a FGV perguntam muito isso.
2. **Alça de preenchimento e sequências** (1, 2, 3…; Jan, Fev…; datas; Ctrl ao arrastar), **Preenchimento Relâmpago** (Ctrl+E) e **Colar Especial** (Valores, Transpor, Multiplicar).
3. **Guias e onde fica cada comando:** Página Inicial, Inserir, Layout da Página, Fórmulas, Dados, Revisão e Exibir. É clássico de Cebraspe e FCC.
4. **Mensagens de erro completas:** #REF!, #NOME?, #NÚM!, #NULO!, `####` (coluna estreita), #DESPEJAR! e #CALC!. Só #DIV/0!, #N/D e #VALOR! têm lição própria.
5. **Curingas em critérios:** `CONT.SE(A:A;"Ana*")`, `"*silva*"`, `"?"`, além do operador `<>` (diferente de) e de critério com célula (`">"&F1`).
6. **Horas:** subtrair horários, horas trabalhadas, formato `[h]:mm`, HORA, MINUTO, TEMPO, virada da meia-noite e hora × valor-hora (×24). É muito comum em teste de RH e DP.
7. **Formatar como Tabela** (Ctrl+Alt+T) e referências estruturadas, mais **Segmentação de Dados**.
8. **Remover Duplicatas** e **Texto para Colunas** como ferramentas (hoje só são citados de passagem).
9. **Congelar Painéis**, **Proteger Planilha/Pasta** (bloquear células) e **Ocultar/Reexibir**.
10. **Impressão:** Área de Impressão, Imprimir Títulos, Quebra de Página e Ajustar a uma página.
11. **Validação Personalizada e Comprimento do Texto:** o schema já suporta `comprimento`, mas nenhuma lição usa. Também validação com fórmula (CPF com 11 dígitos, impedir duplicata com `=CONT.SE($A$2:$A$100;A2)=1`) e **lista dependente com INDIRETO**.
12. **Filtros de Número/Texto/Data** (Maior que, Contém, Este mês), filtro por cor e **Filtro Avançado** (é cobrado em concurso).
13. **Dados → Subtotal** (o agrupamento automático com quebras), que costuma ser confundido com a função SUBTOTAL, e **Consolidar**.
14. **Função TEXTO** (`=TEXTO(A1;"dd/mm/aaaa")`, `"R$ #.##0,00"`), **formato de número personalizado** e o efeito do formato × o valor guardado.
15. **INDIRETO** (o curso promete "fica para depois" em `abas-resumo-trimestre`), **Nomes definidos** (Gerenciador de Nomes) e **referência a outra pasta** (`[Pasta.xlsx]Plan1!A1`).
16. **Funções de concurso** ausentes ou fracas: RESTO, INT, ABS, ARREDONDAR.PARA.CIMA e PARA.BAIXO (só citada), PROCURAR × LOCALIZAR, NÃO, ÉCÉL.VAZIA e ÉERROS, CONCATENAR (legado), MED, MODO e DIATRABALHO.INTL.
17. **Gráficos:** gráfico de combinação e eixo secundário, Gráfico Dinâmico, Minigráficos (sparklines) e linha de tendência.
18. **Tabela dinâmica:** agrupar datas por mês ou trimestre, "Mostrar Valores Como → % do Total Geral", classificar a dinâmica, alterar a fonte de dados e Atualizar Tudo.
19. **Teste de Hipóteses:** Atingir Meta (comum em teste de analista).
20. **LibreOffice Calc:** o Cebraspe e bancas municipais cobram com frequência. Vale ao menos uma nota comparando com o Excel (o mesmo `;`, a referência a outra aba com `.` como `$Planilha1.A1`, e os nomes de função iguais ou diferentes).

Extra técnico: o commit `569e89f` cita **DESCARTAR** como função nova no motor, mas nenhum exercício a usa.
