# Planilhês — Roteiro de exercícios: introduções e soluções

Nov 11, 2026 · @Joseph

## Como usar este roteiro

Este roteiro tem 52 lições em 9 módulos, somando cerca de 300 questões: cada lição tem introdução, solução e explicação, e cada módulo termina com um teste. Ele serve de base para o texto do app, para as dicas automáticas e, no futuro, para as aulas em vídeo.

Cada exercício segue o mesmo formato:

| Campo | Para que serve | Onde aparece |
| --- | --- | --- |
| Intro | Contexto em 1–2 frases: por que essa função importa | Antes do exercício |
| Desafio | O que o aluno precisa fazer, com os dados da planilha | Enunciado |
| Resposta | A fórmula esperada (e alternativas aceitas) | Gabarito do validador |
| Explicação | Como a fórmula funciona, parte por parte | Depois de acertar ou pedir a solução |
| Erros comuns | Os enganos mais prováveis e a dica para cada um | Dicas automáticas (camada de regras do tutor) |
| Vídeo | O gancho e o roteiro curto da aula | Gravação futura (30–90 s) |

**Estrutura de cada lição (5 questões, 3 a 5 minutos):**

1. **Questão principal:** o exercício descrito em cada seção, com intro e explicação completa.
2. **Variação A e Variação B:** a mesma função com outros dados ou outro contexto, para fixar sem decorar a resposta.
3. **Pegadinha:** uma situação montada em cima do erro mais comum da lição. O aluno precisa perceber o problema.
4. **Múltipla escolha:** uma pergunta conceitual que reforça o porquê, e não só o como. Usa o tipo `multiple_choice`.

**Teste do módulo:** 5 questões inéditas no fim de cada módulo, sem dica, misturando as funções do módulo. Aprovação com 4 de 5. Quem não passa recebe de volta as lições das questões que errou (revisão) e pode refazer o teste. O teste aprovado conta para o certificado.

Nas lições, as variações e a pegadinha usam as mesmas dicas dos erros comuns da questão principal. Na múltipla escolha, a alternativa correta está indicada no fim, com o motivo.

**Convenções:** funções e sintaxe do Excel em português do Brasil, com `;` entre argumentos, vírgula decimal e datas em dd/mm/aaaa. Os dados são fictícios e reaproveitados entre módulos sempre que possível, para o aluno reconhecer a planilha.

**Formato sugerido para os vídeos:** abrir com o problema ("você tem 500 produtos e precisa achar um preço"), mostrar o erro mais comum, digitar a fórmula certa devagar e fechar com uma variação. Um vídeo por exercício, sem introdução longa.

**Funções só do Excel 365/2021 em diante:** PROCX, FILTRO, CLASSIFICAR, ÚNICO e SES (esta última desde o 2019). Os exercícios avisam isso, porque muita empresa ainda usa versões antigas.

## Módulo 0 — Intro

**Introdução do módulo:** para quem nunca abriu uma planilha. Em 10 exercícios curtos, o aluno aprende a se localizar (célula, linha, coluna, intervalo), a digitar e editar valores, e escreve a primeira fórmula. No fim, ele sabe a diferença entre o que a célula mostra e o que ela guarda, que é a base de todo o resto.

Planilha usada na maior parte do módulo: uma lista de produtos com preço (A1 "Produto", B1 "Preço"; Caneta 2,5; Caderno 29,9; Mochila 149; Notebook 3200).

### 0.1 — O nome da célula

- **Intro:** toda célula tem um endereço: a letra da coluna mais o número da linha. É assim que as fórmulas "conversam" com as células.
- **Desafio:** a célula ativa (com a borda destacada) é a da coluna E, linha 4. Qual é o nome dela?
- **Resposta:** `E4`
- **Explicação:** primeiro a coluna (letra), depois a linha (número). A caixa de nome, à esquerda da barra de fórmulas, sempre mostra o endereço da célula ativa.
- **Erros comuns:** `4E` (ordem invertida) → "Primeiro a letra da coluna, depois o número da linha."
- **Vídeo:** "Toda célula tem um endereço, como uma casa." Mostrar a caixa de nome mudando ao clicar em células diferentes.

* **Variação A:** a célula ativa está na coluna B, linha 7 → `B7`
* **Variação B:** a célula ativa está na coluna logo depois da Z, linha 3 → `AA3` (depois do Z, as colunas seguem AA, AB, AC…)
* **Pegadinha:** a caixa de nome mostra G12. Em que linha está a célula? → 12 (quem responde G confundiu coluna com linha)
* **Múltipla escolha:** qual é o nome da célula na 3ª coluna e na 5ª linha? (a) 3E · (b) C5 · (c) E3 · (d) 5C. **Resposta: (b)**, porque a 3ª coluna é a C e o endereço é sempre letra + número.

### 0.2 — Clique na célula certa

- **Intro:** antes de escrever qualquer coisa, você precisa saber chegar na célula certa.
- **Desafio:** clique na célula C7.
- **Resposta:** célula ativa = C7.
- **Explicação:** ache a coluna C no topo e desça até a linha 7. A caixa de nome confirma: C7.
- **Erros comuns:** clicar em D7 ou C6 → "Confira a caixa de nome: ela mostra onde você está."
- **Vídeo:** dispensa vídeo; usar o mesmo do 0.1.

* **Variação A:** clique na célula A1 → célula ativa = A1
* **Variação B:** numa planilha com 40 linhas, clique em F32 (é preciso rolar) → célula ativa = F32
* **Pegadinha:** "clique na célula da linha 4, coluna D" (o enunciado traz a linha primeiro) → célula ativa = D4
* **Múltipla escolha:** onde você confere em qual célula está? (a) barra de status · (b) caixa de nome · (c) cabeçalho da coluna · (d) barra de fórmulas. **Resposta: (b)**, a caixa à esquerda da barra de fórmulas sempre mostra o endereço da célula ativa.

### 0.3 — Selecionar um intervalo

- **Intro:** a maioria das funções trabalha com um grupo de células de uma vez, o intervalo.
- **Desafio:** selecione o intervalo B2:D5.
- **Resposta:** seleção = B2:D5 (arrastando o mouse ou com Shift + setas).
- **Explicação:** um intervalo vai do canto superior esquerdo (B2) ao canto inferior direito (D5). O `:` quer dizer "até": B2:D5 tem 3 colunas e 4 linhas, ou 12 células.
- **Erros comuns:** selecionar só até D4 → "O intervalo vai até a linha 5."
- **Vídeo:** mostrar os dois jeitos de selecionar: arrastando e com Shift + setas.

* **Variação A:** selecione A1:A10 (uma coluna) → seleção = A1:A10
* **Variação B:** selecione C3:E3 (uma linha) → seleção = C3:E3
* **Pegadinha:** selecione o intervalo D5:B2 → é o mesmo que B2:D5; aceitar a seleção em qualquer direção
* **Múltipla escolha:** quantas células tem o intervalo A1:C4? (a) 7 · (b) 10 · (c) 12 · (d) 4. **Resposta: (c)**, são 3 colunas (A, B, C) vezes 4 linhas.

### 0.4 — Digitar um valor

- **Intro:** digitar é simples, mas existe uma regra: o valor só entra na célula quando você confirma.
- **Desafio:** digite 150 na célula B3.
- **Resposta:** B3 = 150.
- **Explicação:** clique em B3, digite e aperte Enter (ou Tab). Sem confirmar, o valor não é gravado.
- **Erros comuns:** digitar "R$ 150" → aceitar, mas explicar que o formato de moeda se aplica depois (exercício 0.9).
- **Vídeo:** Enter desce, Tab vai para a direita, Esc cancela.

* **Variação A:** digite o texto Mochila em A4 → A4 = "Mochila"
* **Variação B:** digite 29,90 em B3 → B3 = 29,9 (número)
* **Pegadinha:** digite 29.90 em B4 → com ponto, o Excel em português não entende como número. Dica: "No Brasil, a casa decimal é a vírgula: 29,90."
* **Múltipla escolha:** depois de digitar, qual tecla grava o valor e desce para a célula de baixo? (a) Tab · (b) Esc · (c) Enter · (d) F2. **Resposta: (c)**; Tab grava e vai para a direita, Esc cancela.

### 0.5 — Editar uma célula

- **Intro:** errou um valor? Dá para corrigir sem apagar tudo.
- **Desafio:** corrija o valor de C2 de 100 para 120.
- **Resposta:** C2 = 120.
- **Explicação:** F2 ou duplo clique entra no modo de edição, com o cursor dentro da célula. Digitar direto, sem F2, substitui o conteúdo inteiro, o que também funciona para um número curto.
- **Erros comuns:** apertar Esc no fim → "Esc cancela a edição. Use Enter para confirmar."
- **Vídeo:** F2 é o atalho mais subestimado do Excel.

* **Variação A:** corrija "Cadreno" para "Caderno" em A3 usando F2 → A3 = "Caderno"
* **Variação B:** apague o conteúdo de B5 → B5 vazia (tecla Delete)
* **Pegadinha:** D2 tem `=B2*2`. Mude para multiplicar por 3, sem apagar a fórmula → `=B2*3`. Quem digita só "3" troca a fórmula por um número fixo.
* **Múltipla escolha:** o que o Esc faz durante a edição? (a) confirma · (b) cancela e mantém o valor antigo · (c) apaga a célula · (d) vai para a próxima célula. **Resposta: (b)**.

### 0.6 — O que a célula mostra e o que ela guarda

- **Intro:** uma célula pode mostrar 300 e guardar uma fórmula. Entender isso evita muita confusão.
- **Desafio:** D4 mostra 300. Clique nela: o que aparece na barra de fórmulas?
- **Resposta:** `=B4+C4` (comparação sem diferenciar maiúsculas nem espaços).
- **Explicação:** a célula mostra o resultado; a barra de fórmulas mostra a receita. Se B4 ou C4 mudar, D4 muda junto.
- **Erros comuns:** responder "300" → "Esse é o resultado. Olhe a barra de fórmulas, acima da planilha."
- **Vídeo:** alterar B4 ao vivo e mostrar D4 se atualizando sozinha.

* **Variação A:** E2 mostra 450, C2 tem 150 e D2 tem 3. O que está na barra de fórmulas de E2? → `=C2*D2`
* **Variação B:** C6 mostra 1.050 logo abaixo de quatro valores. O que está na barra? → `=SOMA(C2:C5)`
* **Pegadinha:** B3 aparece como moeda, com 29,90. Que valor está guardado? → 29,9. O formato muda só a aparência.
* **Múltipla escolha:** D4 tem `=B4+C4`. Você muda B4 de 100 para 200. O que acontece com D4? (a) nada · (b) atualiza sozinha · (c) dá erro · (d) precisa redigitar a fórmula. **Resposta: (b)**.

### 0.7 — Navegar pelo teclado

- **Intro:** quem usa o teclado trabalha muito mais rápido do que quem vive no mouse.
- **Desafio:** partindo de A1, chegue em C3 usando só o teclado.
- **Resposta:** célula ativa = C3, sem nenhum clique.
- **Explicação:** duas vezes → e duas vezes ↓. Dica extra: Ctrl + seta pula até o fim dos dados.
- **Erros comuns:** usar o mouse → "Desta vez, só o teclado. Use as setas."
- **Vídeo:** mostrar Ctrl + seta numa planilha com 1.000 linhas.

* **Variação A:** de A1 até E1, só com o teclado → célula ativa = E1 (quatro vezes →)
* **Variação B:** de A1 até a última linha com dados da coluna A (A40), com um atalho só → Ctrl + ↓
* **Pegadinha:** você está em C3. Volte para A1 com um atalho só, sem setas → Ctrl + Home
* **Múltipla escolha:** qual atalho leva até o fim dos dados de uma coluna? (a) Ctrl + ↓ · (b) Shift + ↓ · (c) Alt + ↓ · (d) Tab. **Resposta: (a)**; Shift + ↓ seleciona, não pula.

### 0.8 — A primeira fórmula

- **Intro:** toda fórmula começa com `=`. É assim que o Excel sabe que deve calcular, e não só mostrar o texto.
- **Desafio:** em C1, some os valores de A1 e B1.
- **Resposta:** `=A1+B1` (aceitar também `=SOMA(A1;B1)` e `=SOMA(A1:B1)`).
- **Explicação:** usar os endereços, e não os números, faz a fórmula se atualizar quando os valores mudarem.
- **Erros comuns:** `A1+B1` sem `=` → "Toda fórmula começa com =."; digitar o resultado à mão → "Use uma fórmula, para ela se atualizar sozinha."
- **Vídeo:** o momento "mágico": mudar A1 e ver C1 mudar.

* **Variação A:** em C2, subtraia B2 de A2 → `=A2-B2`
* **Variação B:** em C3, multiplique A3 por B3 → `=A3*B3`
* **Pegadinha:** C4 mostra o texto da fórmula em vez do resultado. Por quê? → há um espaço antes do `=`. Dica: "A fórmula precisa começar exatamente com =, sem nada antes."
* **Múltipla escolha:** qual destas é uma fórmula válida? (a) A1+B1 · (b) `=A1+B1` · (c) SOMA A1 B1 · (d) =A1 mais B1. **Resposta: (b)**.

### 0.9 — Formatar como moeda

- **Intro:** formatar muda só a aparência. O valor guardado continua o mesmo.
- **Desafio:** formate B2:B5 como moeda (R$).
- **Resposta:** formato de B2:B5 = moeda BRL.
- **Explicação:** 29,9 passa a aparecer como R$ 29,90, mas continua valendo 29,9 nas contas. No Excel, fica em Página Inicial › Número; atalho Ctrl + Shift + 4.
- **Erros comuns:** formatar só B2 → "Selecione o intervalo inteiro antes de formatar."
- **Vídeo:** mostrar a barra de fórmulas com 29,9 enquanto a célula mostra R$ 29,90.

* **Variação A:** formate C2:C5 (os fretes) como moeda → formato de C2:C5 = moeda
* **Variação B:** volte B2:B5 para o formato Geral → formato de B2:B5 = geral
* **Pegadinha:** em B6, some 1 ao valor de B3, que está formatado como moeda → `=B3+1` dá 30,9. O formato não atrapalha a conta.
* **Múltipla escolha:** B2 guarda 29,9 e está formatada como moeda. Quanto dá `=B2*2`? (a) erro · (b) 59,8 · (c) 29,929,9 · (d) 0. **Resposta: (b)**, a conta usa o valor guardado.

### 0.10 — Formatar como porcentagem

- **Intro:** 0,05 e 5% são o mesmo número escrito de jeitos diferentes.
- **Desafio:** formate C2 (que contém 0,05) como porcentagem.
- **Resposta:** formato de C2 = porcentagem, exibindo 5%.
- **Explicação:** o formato de porcentagem multiplica a exibição por 100. Se a célula tivesse 5, apareceria 500%, um erro clássico.
- **Erros comuns:** digitar 5 e formatar → explicar por que vira 500%.
- **Vídeo:** o caso dos 500% e como evitar: digite 5% direto, ou 0,05.

* **Variação A:** formate D2:D5 (0,1; 0,25; 0,5; 1) como porcentagem → 10%, 25%, 50%, 100%
* **Variação B:** digite 15% direto em E2 → E2 guarda 0,15 e já aparece como porcentagem
* **Pegadinha:** F2 tem 20 e, formatada como porcentagem, mostra 2000%. Corrija para mostrar 20% → F2 = 0,2 (ou digitar 20%)
* **Múltipla escolha:** você digita 0,3 e formata como porcentagem. O que aparece? (a) 0,3% · (b) 3% · (c) 30% · (d) 300%. **Resposta: (c)**.

### Teste do Módulo 0

Cinco questões, sem dica. Aprovação com 4 de 5.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Qual é o nome da célula na coluna F, linha 9? | `text_answer` | F9 |
| 2 | Selecione o intervalo A2:C6. | `select_range` | A2:C6 |
| 3 | Em D2, some B2 e C2. | `formula` | `=B2+C2` |
| 4 | Formate D2:D6 como moeda. | `format_cell` | Moeda em D2:D6 |
| 5 | C2 guarda 0,05. Formatada como porcentagem, mostra: (a) 0,05% · (b) 5% · (c) 50% · (d) 500% | `multiple_choice` | (b) |

## Módulo 1 — Fundamentos

**Introdução do módulo:** as funções que você vai usar todo dia. Somar, tirar média, achar o maior e o menor valor, calcular variação percentual e, principalmente, entender o cifrão, que separa quem copia fórmulas sem medo de quem refaz tudo à mão.

Planilha base: vendas do semestre (A1 "Mês", B1 "Vendas"; Jan 1.200 · Fev 950 · Mar 1.430 · Abr 1.100 · Mai 1.675 · Jun 1.320, nas linhas 2 a 7).

### 1.1 — SOMA

- **Intro:** somar uma coluna inteira com uma fórmula só, em vez de célula por célula.
- **Desafio:** em B8, calcule o total de vendas do semestre.
- **Resposta:** `=SOMA(B2:B7)` → 7.675
- **Explicação:** SOMA recebe um intervalo e soma tudo que está nele. Se uma linha for inserida no meio do intervalo, a fórmula se ajusta sozinha.
- **Erros comuns:** `=SUM(B2:B7)` → "No Excel em português, é SOMA."; `=SOMA(B2;B7)` → "Com ponto e vírgula, você somou só B2 e B7. Para o intervalo inteiro, use dois-pontos."
- **Vídeo:** a diferença entre `;` ("e") e `:` ("até"), o erro mais comum de quem começa.

* **Variação A:** some só o 1º trimestre (Jan a Mar) → `=SOMA(B2:B4)` → 3.580
* **Variação B:** some o 2º trimestre (Abr a Jun) → `=SOMA(B5:B7)` → 4.095
* **Pegadinha:** `=SOMA(B2;B7)` deu 2.520. O que está errado? → o ponto e vírgula somou só Jan e Jun; o certo é `=SOMA(B2:B7)`
* **Múltipla escolha:** o que quer dizer B2:B7? (a) B2 e B7 · (b) de B2 até B7 · (c) B2 dividido por B7 · (d) B2 menos B7. **Resposta: (b)**.

### 1.2 — MÉDIA

- **Intro:** a média responde "quanto vendemos num mês típico?".
- **Desafio:** em B9, calcule a média mensal de vendas.
- **Resposta:** `=MÉDIA(B2:B7)` → 1.279,17
- **Explicação:** MÉDIA soma os valores e divide pela quantidade de células com número. Células vazias são ignoradas; células com zero entram na conta.
- **Erros comuns:** `=SOMA(B2:B7)/7` → "São 6 meses, não 7. A MÉDIA conta sozinha."; esquecer o acento (`MEDIA`) → "A função é MÉDIA, com acento."
- **Vídeo:** o cuidado com zero vs. vazio.

* **Variação A:** média do 1º trimestre → `=MÉDIA(B2:B4)` → 1.193,33
* **Variação B:** notas 8, 6, 9 e 7 em D2:D5; calcule a média → `=MÉDIA(D2:D5)` → 7,5
* **Pegadinha:** E2:E5 tem 10, vazio, 0 e 20. Quanto dá `=MÉDIA(E2:E5)`? → 10 (30 ÷ 3: a vazia é ignorada, o zero conta)
* **Múltipla escolha:** uma célula vazia no intervalo da MÉDIA… (a) conta como zero · (b) é ignorada · (c) dá erro · (d) conta como 1. **Resposta: (b)**.

### 1.3 — MÍNIMO e MÁXIMO

- **Intro:** qual foi o pior e o melhor mês? Em 500 linhas, ninguém acha isso no olho.
- **Desafio:** em B10, o menor valor de vendas; em B11, o maior.
- **Resposta:** `=MÍNIMO(B2:B7)` → 950; `=MÁXIMO(B2:B7)` → 1.675
- **Explicação:** as duas funcionam igual à SOMA: recebem um intervalo e devolvem um número.
- **Erros comuns:** `MIN`/`MAX` → "Em português: MÍNIMO e MÁXIMO."
- **Vídeo:** bônus rápido: MÁXIMO − MÍNIMO dá a amplitude.

* **Variação A:** menor venda do 2º trimestre → `=MÍNIMO(B5:B7)` → 1.100
* **Variação B:** diferença entre o melhor e o pior mês → `=MÁXIMO(B2:B7)-MÍNIMO(B2:B7)` → 725
* **Pegadinha:** temperaturas −3, 2, −8 e 5. Qual é a mínima? → −8 (número negativo maior em valor absoluto é menor)
* **Múltipla escolha:** quanto dá o MÁXIMO de 5, −10 e 3? (a) −10 · (b) 5 · (c) 10 · (d) 3. **Resposta: (b)**.

### 1.4 — Operadores e ordem das contas

- **Intro:** o Excel segue a mesma ordem da matemática da escola: multiplicação antes de soma.
- **Desafio:** preço unitário em B2 (50), quantidade em C2 (3), frete em D2 (20). Em E2, calcule o total do pedido: preço × quantidade + frete.
- **Resposta:** `=B2*C2+D2` → 170
- **Explicação:** o Excel faz B2\*C2 primeiro (150) e depois soma o frete. Parênteses mudam a ordem: `=B2*(C2+D2)` daria 1.150, um erro.
- **Erros comuns:** `=B2*(C2+D2)` → "Os parênteses fizeram o frete ser multiplicado pela quantidade."; usar `x` em vez de `*` → "No Excel, a multiplicação é o asterisco (\*)."
- **Vídeo:** mostrar as duas versões lado a lado e a diferença de R$ 980.

* **Variação A:** preço 80 (B3), quantidade 2 (C3), desconto de 10 em dinheiro (D3); total → `=B3*C3-D3` → 150
* **Variação B:** média de duas notas, 8 (B4) e 6 (C4) → `=(B4+C4)/2` → 7; sem parênteses daria 11
* **Pegadinha:** quanto dá `=10+5*2`? → 20, e não 30: a multiplicação vem primeiro
* **Múltipla escolha:** qual é o resultado de `=2+3*4`? (a) 20 · (b) 14 · (c) 24 · (d) 9. **Resposta: (b)**.

### 1.5 — Variação percentual

- **Intro:** "as vendas caíram quanto de janeiro para fevereiro?" é uma das perguntas mais comuns no trabalho.
- **Desafio:** em C3, calcule a variação de Fev (B3) em relação a Jan (B2) e formate como porcentagem.
- **Resposta:** `=(B3-B2)/B2` → −20,83%
- **Explicação:** a regra é (novo − antigo) / antigo. O parêntese garante que a subtração acontece antes da divisão. Resultado negativo = queda.
- **Erros comuns:** `=B3-B2/B2` → "Sem parênteses, o Excel divide antes de subtrair."; dividir pelo mês novo (`/B3`) → "A base é sempre o valor antigo."
- **Vídeo:** a fórmula que todo analista usa todo dia, e o erro de dividir pelo valor errado.

* **Variação A:** variação de Mar em relação a Fev → `=(B4-B3)/B3` → 50,53%
* **Variação B:** variação de Jun em relação a Jan → `=(B7-B2)/B2` → 10%
* **Pegadinha:** alguém calculou a variação de Fev para Mar como 33,57%. Onde errou? → dividiu pelo valor novo (1.430); a base é o antigo (950)
* **Múltipla escolha:** as vendas foram de 200 para 300. Qual foi a variação? (a) 33% · (b) 50% · (c) 100% · (d) 150%. **Resposta: (b)**, 100 ÷ 200.

### 1.6 — Referência absoluta (cifrão)

- **Intro:** quando você arrasta uma fórmula, as referências andam junto. Às vezes, uma delas precisa ficar parada.
- **Desafio:** a taxa de comissão (5%) está em F1. Em C2, calcule a comissão sobre B2 de um jeito que funcione ao arrastar até C7.
- **Resposta:** `=B2*$F$1` → 60 em C2 (e 47,50 em C3 ao arrastar)
- **Explicação:** o cifrão trava a coluna e a linha. Ao arrastar, B2 vira B3, B4 e assim por diante, mas a referência travada continua apontando para F1. Atalho: F4 coloca os cifrões.
- **Erros comuns:** `=B2*F1` → funciona em C2, mas em C3 vira B3\*F2 (vazio = 0). Dica: "Arraste e veja o que acontece com F1. Ela precisa ficar travada."
- **Vídeo:** arrastar a versão errada, mostrar os zeros e corrigir com F4. É o vídeo mais importante do módulo.

* **Variação A:** imposto de 10% em F2 sobre cada venda, numa fórmula arrastável → `=B2*$F$2` → 120 na primeira linha
* **Variação B:** converter cada venda para dólar, com a cotação (5,00) em F3 → `=B2/$F$3` → 240 na primeira linha
* **Pegadinha:** `=B2*$F1` arrastada para baixo dá zeros a partir da segunda linha. Por quê? → o cifrão só travou a coluna; a linha andou para F2, F3… Falta travar a linha.
* **Múltipla escolha:** na referência `$F$1`, o cifrão antes do 1 trava o quê? (a) a coluna · (b) a linha · (c) a planilha · (d) o valor. **Resposta: (b)**.

### 1.7 — Referência mista

- **Intro:** às vezes você precisa travar só a coluna, ou só a linha. É o que faz uma tabela de preços × quantidades funcionar com uma única fórmula.
- **Desafio:** quantidades 1 a 5 em A3:A7; preços em B2:E2. Escreva em B3 uma fórmula que, arrastada para todo B3:E7, calcule preço × quantidade.
- **Resposta:** `=$A3*B$2`
- **Explicação:** a primeira parte trava a coluna A (a quantidade está sempre ali) e deixa a linha andar. A segunda trava a linha 2 (o preço está sempre ali) e deixa a coluna andar. F4 repetido alterna entre os tipos de trava.
- **Erros comuns:** travar tudo, com cifrão nas duas partes de cada referência → "Travou demais: a tabela inteira fica com o mesmo valor."; `=A3*B2` → "Ao arrastar, as referências saem do lugar."
- **Vídeo:** apertar F4 quatro vezes e mostrar os quatro estados.

* **Variação A:** tabuada com 1 a 10 em A2:A11 e em B1:K1; uma fórmula em B2 para toda a tabela → `=$A2*B$1`
* **Variação B:** preços em A3:A7 e percentuais de reajuste em B2:D2; preço reajustado em B3, arrastável → `=$A3*(1+B$2)`
* **Pegadinha:** `=A$3*$B2` arrastada para a tabela dá valores errados. O que houve? → as travas estão trocadas: a quantidade precisa travar a coluna, e o preço, a linha
* **Múltipla escolha:** com `$A3`, ao arrastar a fórmula para a direita, a referência… (a) vira B3 · (b) continua A3 · (c) vira A4 · (d) dá erro. **Resposta: (b)**, a coluna está travada.

### Teste do Módulo 1

Cinco questões, sem dica. Aprovação com 4 de 5. Planilha nova: despesas de 5 meses em C2:C6 (800, 950, 700, 1.100, 900) e taxa de 3% em F1.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Em C7, o total das despesas. | `formula` | `=SOMA(C2:C6)` → 4.450 |
| 2 | Em C8, a média mensal. | `formula` | `=MÉDIA(C2:C6)` → 890 |
| 3 | Em D3, a variação de C3 em relação a C2. | `formula` | `=(C3-C2)/C2` → 18,75% |
| 4 | Em E2, a taxa de F1 sobre C2, numa fórmula arrastável até E6. | `formula` | `=C2*$F$1` → 24 |
| 5 | Quanto dá `=(2+3)*4`? (a) 14 · (b) 20 · (c) 24 · (d) 9 | `multiple_choice` | (b) |

## Módulo 2 — Lógica

**Introdução do módulo:** até aqui, a planilha só fazia contas. Agora ela começa a tomar decisões: aprovado ou reprovado, tem bônus ou não, qual faixa. O SE é a função mais usada depois da SOMA, e o módulo termina com o SEERRO, que deixa a planilha apresentável quando algo dá errado.

Planilha base: notas e vendedores (A "Nome", B "Nota" ou "Vendas", C "Faltas").

### 2.1 — SE

- **Intro:** o SE faz uma pergunta e devolve uma coisa se a resposta for sim, e outra se for não.
- **Desafio:** a nota está em B2 (7,5). Em C2, mostre "Aprovado" se a nota for 7 ou mais, e "Reprovado" caso contrário.
- **Resposta:** `=SE(B2>=7;"Aprovado";"Reprovado")` → Aprovado
- **Explicação:** a estrutura é SE(teste; valor se verdadeiro; valor se falso). Texto vai entre aspas; número e referência, não.
- **Erros comuns:** `B2>7` → "Quem tirou exatamente 7 também é aprovado: use >=."; texto sem aspas → "Textos vão entre aspas duplas."; vírgula entre os argumentos → "Use ponto e vírgula."
- **Vídeo:** ler a fórmula em voz alta: "SE a nota for maior ou igual a 7, então Aprovado, senão Reprovado".

* **Variação A:** idade em B3 (17); em C3, "Maior" se 18 ou mais, senão "Menor" → `=SE(B3>=18;"Maior";"Menor")` → Menor
* **Variação B:** compra em B4 (180); em C4, frete 0 se a compra for de pelo menos 200, senão 15 → `=SE(B4>=200;0;15)` → 15 (números sem aspas)
* **Pegadinha:** `=SE(B2>=7;Aprovado;Reprovado)` dá `#NOME?`. Por quê? → os textos estão sem aspas, e o Excel acha que são nomes de função
* **Múltipla escolha:** em SE(teste; A; B), quando o teste é falso, o resultado é… (a) A · (b) B · (c) erro · (d) 0. **Resposta: (b)**.

### 2.2 — SE aninhado

- **Intro:** e quando há mais de duas respostas possíveis? Você coloca um SE dentro do outro.
- **Desafio:** em C2, mostre "Ótimo" para nota 9 ou mais, "Bom" para 7 ou mais, e "Recuperação" para o resto.
- **Resposta:** `=SE(B2>=9;"Ótimo";SE(B2>=7;"Bom";"Recuperação"))` → Bom (para 7,5)
- **Explicação:** o segundo SE é o "senão" do primeiro. A ordem importa: testa-se do maior para o menor. Se testasse >=7 primeiro, quem tirou 9,5 também cairia em "Bom".
- **Erros comuns:** ordem invertida → "Teste a faixa mais alta primeiro."; parênteses faltando no fim → "Cada SE aberto precisa ser fechado."
- **Vídeo:** desenhar a árvore de decisão antes de escrever a fórmula.

* **Variação A:** peso em B3 (3 kg); frete 10 até 1 kg, 20 até 5 kg e 35 acima disso → `=SE(B3<=1;10;SE(B3<=5;20;35))` → 20
* **Variação B:** vendas em B4 (8.500); "Meta batida" a partir de 10.000, "Perto" a partir de 8.000, senão "Abaixo" → `=SE(B4>=10000;"Meta batida";SE(B4>=8000;"Perto";"Abaixo"))` → Perto
* **Pegadinha:** `=SE(B2>=7;"Bom";SE(B2>=9;"Ótimo";"Recuperação"))` dá "Bom" para nota 9,5. Por quê? → o teste >=7 vem primeiro e captura o 9,5 antes de chegar no >=9
* **Múltipla escolha:** num SE aninhado com faixas "maior ou igual", por onde começar? (a) pela menor faixa · (b) pela maior faixa · (c) tanto faz · (d) pela do meio. **Resposta: (b)**.

### 2.3 — E e OU

- **Intro:** às vezes a decisão depende de duas condições ao mesmo tempo.
- **Desafio:** vendas em B2 (12.000) e faltas em C2 (0). Em D2, mostre "Bônus" se as vendas forem de pelo menos 10.000 E não houver faltas; senão, "Sem bônus".
- **Resposta:** `=SE(E(B2>=10000;C2=0);"Bônus";"Sem bônus")` → Bônus
- **Explicação:** E só é verdadeiro se todas as condições forem verdadeiras. OU é verdadeiro se pelo menos uma for. Elas vivem dentro do teste do SE.
- **Erros comuns:** usar OU → "Com OU, quem vendeu muito mas faltou também ganharia."; escrever `10.000` com ponto → "Dentro da fórmula, números vão sem separador de milhar."
- **Vídeo:** a mesma fórmula com E e com OU, e quem ganha bônus em cada caso.

* **Variação A:** desconto se o cliente (C3) for "VIP" OU a compra (B3) for de pelo menos 500; C3 = Comum, B3 = 600 → `=SE(OU(C3="VIP";B3>=500);"Desconto";"Sem desconto")` → Desconto
* **Variação B:** aprovado se nota (B4) for 7 ou mais E frequência (C4) for 75% ou mais; B4 = 8, C4 = 70% → `=SE(E(B4>=7;C4>=75%);"Aprovado";"Reprovado")` → Reprovado
* **Pegadinha:** `=SE(B2>=10000 E C2=0;"Bônus";"Sem bônus")` dá erro. Por quê? → E é uma função, não uma palavra: `E(B2>=10000;C2=0)`
* **Múltipla escolha:** OU(VERDADEIRO; FALSO) resulta em… (a) VERDADEIRO · (b) FALSO · (c) erro · (d) 1. **Resposta: (a)**, basta uma condição verdadeira.

### 2.4 — SES

- **Intro:** o SES faz o mesmo que vários SEs aninhados, mas em linha reta e mais fácil de ler. Disponível a partir do Excel 2019.
- **Desafio:** refaça o exercício 2.2 usando SES.
- **Resposta:** `=SES(B2>=9;"Ótimo";B2>=7;"Bom";VERDADEIRO;"Recuperação")`
- **Explicação:** SES recebe pares de teste e resultado e devolve o primeiro par verdadeiro. O último teste, `VERDADEIRO`, funciona como "para todo o resto".
- **Erros comuns:** esquecer o par final → notas abaixo de 7 dão `#N/D`. Dica: "Adicione um último par com VERDADEIRO para cobrir o resto."
- **Vídeo:** comparar a fórmula aninhada e a SES lado a lado.

* **Variação A:** refaça o frete por peso da Variação A do 2.2 com SES → `=SES(B3<=1;10;B3<=5;20;VERDADEIRO;35)` → 20
* **Variação B:** conceito por nota em B4 (5,5): A a partir de 9, B a partir de 7, C a partir de 5, D no resto → `=SES(B4>=9;"A";B4>=7;"B";B4>=5;"C";VERDADEIRO;"D")` → C
* **Pegadinha:** `=SES(B2>=9;"Ótimo";B2>=7;"Bom")` dá `#N/D` para nota 4. Por quê? → nenhum teste foi verdadeiro; faltou o par final com VERDADEIRO
* **Múltipla escolha:** para que serve o VERDADEIRO no último par do SES? (a) encerrar a fórmula · (b) cobrir todos os outros casos · (c) converter em texto · (d) nada, é opcional. **Resposta: (b)**.

### 2.5 — SEERRO

- **Intro:** erros como `#DIV/0!` assustam quem lê a planilha. O SEERRO troca o erro por algo apresentável.
- **Desafio:** em D2, calcule o preço médio (total em B2 ÷ quantidade em C2). Algumas linhas têm quantidade 0. Quando der erro, mostre 0.
- **Resposta:** `=SEERRO(B2/C2;0)`
- **Explicação:** SEERRO(valor; o que mostrar se der erro). Se a conta funcionar, aparece o resultado; se der qualquer erro, aparece o segundo argumento.
- **Erros comuns:** `=SEERRO(0;B2/C2)` → "A conta vem primeiro; o valor alternativo, depois."
- **Vídeo:** o alerta: SEERRO esconde todos os erros, inclusive os que você precisaria ver. Use com critério.

* **Variação A:** taxa de conversão = compras (C3) ÷ visitas (B3); quando não houver visitas, mostre um traço → `=SEERRO(C3/B3;"-")`
* **Variação B:** média de D2:D5, que ainda está vazio; mostre "Sem dados" em vez do erro → `=SEERRO(MÉDIA(D2:D5);"Sem dados")`
* **Pegadinha:** `=SEERRO(B2/C2;0)` mostra 0, mas C2 não é zero: alguém digitou "dez" por extenso. O que o SEERRO escondeu? → um erro de digitação (`#VALOR!`), que precisava ser corrigido em C2
* **Múltipla escolha:** qual erro aparece ao dividir por zero? (a) `#N/D` · (b) `#DIV/0!` · (c) `#VALOR!` · (d) `#REF!`. **Resposta: (b)**.

### Teste do Módulo 2

Cinco questões, sem dica. Aprovação com 4 de 5. Planilha nova: vendas em B2 (9.000), faltas em C2 (1), H2 vazio.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Em D2, "Meta" se B2 for 8.000 ou mais, senão "Abaixo". | `formula` | `=SE(B2>=8000;"Meta";"Abaixo")` → Meta |
| 2 | Em E2, "Bônus" se B2 for 8.000 ou mais E não houver faltas, senão "Sem bônus". | `formula` | `=SE(E(B2>=8000;C2=0);"Bônus";"Sem bônus")` → Sem bônus |
| 3 | Em F2, "Ouro" a partir de 10.000, "Prata" a partir de 8.000, senão "Bronze". | `formula` | SE aninhado ou SES → Prata |
| 4 | Em G2, B2 ÷ H2, mostrando 0 se der erro. | `formula` | `=SEERRO(B2/H2;0)` → 0 |
| 5 | E(VERDADEIRO; FALSO) resulta em: (a) VERDADEIRO · (b) FALSO · (c) erro · (d) 0 | `multiple_choice` | (b) |

## Módulo 3 — Contar e somar com condição

**Introdução do módulo:** quantas vendas a Ana fez? Quanto entrou da região Sul? Perguntas assim aparecem toda semana no trabalho. Este módulo ensina a responder sem filtrar e somar à mão, e prepara o terreno para as tabelas dinâmicas.

Planilha base (usada também no Módulo 7): A "Vendedor", B "Região", C "Valor", D "Status".

| Linha | Vendedor | Região | Valor | Status |
| --- | --- | --- | --- | --- |
| 2 | Ana | Sul | 500 | Pago |
| 3 | Bruno | Norte | 300 | Pendente |
| 4 | Ana | Norte | 450 | Pago |
| 5 | Carla | Sul | 200 | Pago |
| 6 | Bruno | Sul | 700 | Pago |
| 7 | Ana | Sul | 150 | Pendente |
| 8 | Carla | Norte | 600 | Pago |

### 3.1 — CONT.VALORES

- **Intro:** quantas linhas têm dados? CONT.VALORES conta células que não estão vazias.
- **Desafio:** a coluna A vai até a linha 12, mas só algumas têm vendedor. Em F1, conte quantas vendas foram registradas.
- **Resposta:** `=CONT.VALORES(A2:A12)` → 7
- **Explicação:** conta qualquer célula preenchida, seja texto ou número. Para contar só números, existe o CONT.NÚM.
- **Erros comuns:** `=CONT.NÚM(A2:A12)` → "A coluna A tem texto (nomes). CONT.NÚM só conta números."; incluir o cabeçalho (A1) → "O título da coluna também seria contado."
- **Vídeo:** a diferença entre CONT.VALORES, CONT.NÚM e CONTAR.VAZIO numa tabela só.

* **Variação A:** conte quantos status estão preenchidos em D2:D12 → `=CONT.VALORES(D2:D12)` → 7
* **Variação B:** conte só as células com número em C2:C12 → `=CONT.NÚM(C2:C12)` → 7
* **Pegadinha:** `=CONT.VALORES(A1:A12)` deu 8, mas são 7 vendas. Por quê? → o intervalo incluiu o cabeçalho "Vendedor"
* **Múltipla escolha:** o que o CONT.VALORES conta? (a) só números · (b) células preenchidas · (c) células vazias · (d) só textos. **Resposta: (b)**.

### 3.2 — CONT.SE

- **Intro:** contar só o que atende a uma condição.
- **Desafio:** em F2, conte quantas vendas a Ana fez.
- **Resposta:** `=CONT.SE(A2:A8;"Ana")` → 3
- **Explicação:** CONT.SE(onde procurar; o que procurar). O critério pode ser texto ("Ana"), número (500), comparação (">400") ou uma célula (H1, onde está escrito Ana).
- **Erros comuns:** `Ana` sem aspas → "Texto no critério vai entre aspas."; procurar na coluna errada → "Os nomes estão na coluna A."
- **Vídeo:** usar uma célula como critério, para trocar o vendedor sem mexer na fórmula.

* **Variação A:** quantas vendas estão pendentes? → `=CONT.SE(D2:D8;"Pendente")` → 2
* **Variação B:** quantas vendas passaram de 400? → `=CONT.SE(C2:C8;">400")` → 4
* **Pegadinha:** `=CONT.SE(C2:C8;>400)` não funciona. Por quê? → critério com operador vai entre aspas: ">400"
* **Múltipla escolha:** como escrever "maior que 400" no critério do CONT.SE? (a) >400 · (b) ">400" · (c) (>400) · (d) \[>400\]. **Resposta: (b)**.

### 3.3 — CONT.SES

- **Intro:** e se forem duas condições? CONT.SES aceita quantas você precisar.
- **Desafio:** em F3, conte quantas vendas a Ana fez na região Sul.
- **Resposta:** `=CONT.SES(A2:A8;"Ana";B2:B8;"Sul")` → 2
- **Explicação:** os argumentos vêm em pares: intervalo, critério; intervalo, critério. Todas as condições precisam ser verdadeiras na mesma linha.
- **Erros comuns:** intervalos de tamanhos diferentes (A2:A8 com B2:B9) → "Os intervalos precisam ter o mesmo tamanho."
- **Vídeo:** destacar as duas linhas que contam e a terceira venda da Ana, que não conta.

* **Variação A:** quantas vendas o Bruno fez no Sul? → `=CONT.SES(A2:A8;"Bruno";B2:B8;"Sul")` → 1
* **Variação B:** quantas vendas pagas passaram de 400? → `=CONT.SES(D2:D8;"Pago";C2:C8;">400")` → 4
* **Pegadinha:** para contar as vendas da Ana OU do Bruno, alguém usou `=CONT.SES(A2:A8;"Ana";A2:A8;"Bruno")` e deu 0. Por quê? → o CONT.SES exige as duas condições na mesma linha, e ninguém é Ana e Bruno ao mesmo tempo. O certo é somar dois CONT.SE → 5
* **Múltipla escolha:** no CONT.SES, as condições são combinadas com… (a) E · (b) OU · (c) tanto faz · (d) só a primeira conta. **Resposta: (a)**.

### 3.4 — SOMASE

- **Intro:** em vez de contar, somar os valores de quem atende à condição.
- **Desafio:** em F4, some o valor total vendido pela Ana.
- **Resposta:** `=SOMASE(A2:A8;"Ana";C2:C8)` → 1.100
- **Explicação:** SOMASE(onde procurar; o que procurar; o que somar). O Excel acha "Ana" na coluna A e soma o valor da mesma linha na coluna C.
- **Erros comuns:** esquecer o terceiro argumento → resultado 0, porque tenta somar os nomes. Dica: "Diga ao Excel qual coluna somar: a dos valores."
- **Vídeo:** comparar com filtrar e somar à mão, e mostrar a fórmula se atualizando quando entra uma venda nova.

* **Variação A:** total vendido pelo Bruno → `=SOMASE(A2:A8;"Bruno";C2:C8)` → 1.000
* **Variação B:** total da região Norte → `=SOMASE(B2:B8;"Norte";C2:C8)` → 1.350
* **Pegadinha:** some só as vendas acima de 400. Precisa do terceiro argumento? → não: o critério está na própria coluna somada, então `=SOMASE(C2:C8;">400")` → 2.250
* **Múltipla escolha:** em `=SOMASE(A2:A8;"Ana";C2:C8)`, o que é C2:C8? (a) onde procurar · (b) o critério · (c) o que somar · (d) onde mostrar o resultado. **Resposta: (c)**.

### 3.5 — SOMASES

- **Intro:** somar com várias condições. Atenção: a ordem dos argumentos é diferente da SOMASE.
- **Desafio:** em F5, some o valor das vendas da região Sul que já estão pagas.
- **Resposta:** `=SOMASES(C2:C8;B2:B8;"Sul";D2:D8;"Pago")` → 1.400
- **Explicação:** na SOMASES, o que somar vem primeiro, e depois os pares de intervalo e critério. A venda de 150 da Ana (Sul, Pendente) fica de fora.
- **Erros comuns:** ordem da SOMASE (`=SOMASES(B2:B8;"Sul";C2:C8…)`) → "Na SOMASES, o intervalo a somar vem primeiro."
- **Vídeo:** SOMASE e SOMASES lado a lado, com o primeiro argumento destacado: a pegadinha preferida das provas.

* **Variação A:** total da Ana com status Pago → `=SOMASES(C2:C8;A2:A8;"Ana";D2:D8;"Pago")` → 950
* **Variação B:** total do Norte só com vendas de pelo menos 400 → `=SOMASES(C2:C8;B2:B8;"Norte";C2:C8;">=400")` → 1.050
* **Pegadinha:** o critério foi digitado como "pago", em minúsculas. Funciona? → sim, os critérios não diferenciam maiúsculas de minúsculas; o resultado continua 1.400
* **Múltipla escolha:** na SOMASES, o primeiro argumento é… (a) o critério · (b) o intervalo a somar · (c) o intervalo do critério · (d) a condição. **Resposta: (b)**.

### 3.6 — MÉDIASE

- **Intro:** a média de só uma parte dos dados.
- **Desafio:** em F6, calcule o valor médio das vendas da região Norte.
- **Resposta:** `=MÉDIASE(B2:B8;"Norte";C2:C8)` → 450
- **Explicação:** mesma estrutura da SOMASE, mas devolve a média. Norte tem 300, 450 e 600: soma 1.350, dividida por 3.
- **Erros comuns:** `=SOMASE(…)/7` → "Dividir por 7 usa todas as vendas. São só 3 do Norte; a MÉDIASE conta sozinha."
- **Vídeo:** fechar o módulo com um mini-relatório por região usando as três funções.

* **Variação A:** valor médio das vendas da Ana → `=MÉDIASE(A2:A8;"Ana";C2:C8)` → 366,67
* **Variação B:** valor médio das vendas pagas → `=MÉDIASE(D2:D8;"Pago";C2:C8)` → 490
* **Pegadinha:** a média da "Daniela" dá `#DIV/0!`. Por quê? → ela não tem nenhuma venda, então não há o que dividir. Para exibir 0, envolva com SEERRO.
* **Múltipla escolha:** a MÉDIASE de um vendedor sem nenhuma venda resulta em… (a) 0 · (b) `#DIV/0!` · (c) `#N/D` · (d) célula vazia. **Resposta: (b)**.

### Teste do Módulo 3

Cinco questões, sem dica. Aprovação com 4 de 5. Mesma tabela de vendas do módulo.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Quantas vendas a Carla fez? | `formula` | `=CONT.SE(A2:A8;"Carla")` → 2 |
| 2 | Qual o total vendido na região Sul? | `formula` | `=SOMASE(B2:B8;"Sul";C2:C8)` → 1.550 |
| 3 | Quantas vendas do Norte estão pagas? | `formula` | `=CONT.SES(B2:B8;"Norte";D2:D8;"Pago")` → 2 |
| 4 | Qual o total ainda pendente? | `formula` | `=SOMASE(D2:D8;"Pendente";C2:C8)` → 450 |
| 5 | Qual fórmula está escrita corretamente? (a) `=SOMASES(B2:B8;"Sul";C2:C8)` · (b) `=SOMASES(C2:C8;B2:B8;"Sul")` · (c) `=SOMASE(C2:C8;B2:B8;"Sul")` · (d) `=SOMASE("Sul";B2:B8;C2:C8)` | `multiple_choice` | (b) |

## Módulo 4 — Busca

**Introdução do módulo:** o PROCV é a função mais famosa do Brasil, e a que mais aparece em teste de emprego. Aqui o aluno aprende a buscar um valor numa tabela, a usar faixas (comissão, frete), e conhece as alternativas mais modernas: ÍNDICE + CORRESP e PROCX.

Planilha base: catálogo de produtos em A1:C6.

| Linha | Código | Produto | Preço |
| --- | --- | --- | --- |
| 2 | P01 | Caneta | 2,50 |
| 3 | P02 | Caderno | 29,90 |
| 4 | P03 | Mochila | 149,00 |
| 5 | P04 | Notebook | 3.200,00 |
| 6 | P05 | Mouse | 59,90 |

### 4.1 — PROCV (busca exata)

- **Intro:** você tem o código do produto e precisa do preço. Em 5 linhas, dá para olhar. Em 5.000, só com PROCV.
- **Desafio:** o código está em F2 (P03). Em G2, traga o preço.
- **Resposta:** `=PROCV(F2;A2:C6;3;FALSO)` → 149,00
- **Explicação:** PROCV(o que procurar; onde; qual coluna devolver; tipo de busca). Ele procura na primeira coluna da tabela e devolve a coluna pedida, contando a partir da primeira (o preço é a 3ª). FALSO quer dizer busca exata.
- **Erros comuns:** omitir o FALSO → pode trazer o valor errado sem avisar. Dica: "Sem FALSO, o PROCV faz busca aproximada."; coluna 4 → `#REF!`, "A tabela só tem 3 colunas."; `#N/D` → "O código não foi encontrado. Confira se não há espaço sobrando."
- **Vídeo:** o vídeo-chave da trilha. Mostrar o perigo de esquecer o FALSO, com um resultado errado que parece certo.

* **Variação A:** com P05 em F2, traga o preço → `=PROCV(F2;A2:C6;3;FALSO)` → 59,90
* **Variação B:** com P02 em F3, traga o nome do produto → `=PROCV(F3;A2:C6;2;FALSO)` → Caderno
* **Pegadinha:** `=PROCV(F2;B2:C6;2;FALSO)`, com P03 em F2, deu `#N/D`. Por quê? → o intervalo começa na coluna B (produto), e o PROCV procura sempre na primeira coluna do intervalo; o código está na A
* **Múltipla escolha:** onde o PROCV procura o valor? (a) em qualquer coluna · (b) na primeira coluna da tabela · (c) na última coluna · (d) na coluna indicada no 3º argumento. **Resposta: (b)**.

### 4.2 — PROCV (busca por faixa)

- **Intro:** a comissão muda conforme a faixa de venda. Em vez de um SE gigante, uma tabela de faixas e um PROCV.
- **Desafio:** tabela de faixas em E2:F5 (0 → 2%; 5.000 → 3%; 10.000 → 5%; 20.000 → 7%). A venda está em B2 (12.500). Em C2, traga a taxa de comissão.
- **Resposta:** `=PROCV(B2;$E$2:$F$5;2;VERDADEIRO)` → 5%
- **Explicação:** com VERDADEIRO, o PROCV procura o maior valor que seja menor ou igual ao procurado. 12.500 não existe na tabela, então ele para no 10.000. Regra de ouro: a primeira coluna precisa estar em ordem crescente.
- **Erros comuns:** usar FALSO → `#N/D`, "12.500 não está na tabela. Para faixas, use VERDADEIRO."; tabela fora de ordem → "Ordene as faixas do menor para o maior."; esquecer de travar a tabela → "Ao arrastar, a tabela de faixas sai do lugar."
- **Vídeo:** desenhar as faixas numa régua e mostrar onde o 12.500 cai.

* **Variação A:** venda de 4.000 → 2%
* **Variação B:** venda de exatamente 20.000 → 7% (o valor igual ao limite entra na faixa)
* **Pegadinha:** a tabela de faixas foi digitada do maior para o menor (20.000 em cima) e o PROCV passou a errar. Por quê? → a busca aproximada exige a primeira coluna em ordem crescente
* **Múltipla escolha:** com VERDADEIRO, quando o valor fica entre duas faixas, o PROCV devolve… (a) a maior faixa que não passa do valor · (b) a faixa mais próxima · (c) a primeira da tabela · (d) um erro. **Resposta: (a)**.

### 4.3 — PROCH

- **Intro:** o PROCH é o PROCV deitado: procura numa linha, em vez de numa coluna.
- **Desafio:** meses de Jan a Jun em B1:G1; metas na linha 2 (10.000, 11.000, 12.000, 13.000, 14.000, 15.000). Em B5, traga a meta de "Mar".
- **Resposta:** `=PROCH("Mar";B1:G2;2;FALSO)` → 12.000
- **Explicação:** procura "Mar" na primeira linha do intervalo e devolve o valor da linha 2. Fora isso, funciona igual ao PROCV.
- **Erros comuns:** usar PROCV → "Os meses estão numa linha, não numa coluna."
- **Vídeo:** curto. A mensagem principal é que o PROCX substitui os dois.

* **Variação A:** meta de "Jun" → `=PROCH("Jun";B1:G2;2;FALSO)` → 15.000
* **Variação B:** a linha 3 tem o realizado (9.500; 11.200; 12.800; 12.900; 14.100; 15.600). Traga o realizado de "Abr" → `=PROCH("Abr";B1:G3;3;FALSO)` → 12.900
* **Pegadinha:** `=PROCH("Mar";B1:G2;2)`, sem FALSO, trouxe a meta errada. Por quê? → sem FALSO a busca é aproximada e exige ordem; os meses não estão em ordem alfabética
* **Múltipla escolha:** o PROCH procura o valor na… (a) primeira coluna · (b) primeira linha · (c) última linha · (d) qualquer linha. **Resposta: (b)**.

### 4.4 — ÍNDICE + CORRESP

- **Intro:** o PROCV só olha para a direita. Se você tem o nome do produto e quer o código, que está à esquerda, ele não resolve.
- **Desafio:** em G3, traga o código da "Mochila".
- **Resposta:** `=ÍNDICE(A2:A6;CORRESP("Mochila";B2:B6;0))` → P03
- **Explicação:** CORRESP descobre em que posição a Mochila está na coluna B (3ª). ÍNDICE pega a 3ª posição da coluna A. O 0 no CORRESP significa busca exata.
- **Erros comuns:** esquecer o 0 → resultado imprevisível. Dica: "Use 0 no CORRESP para busca exata."; intervalos de tamanhos diferentes → "As duas colunas precisam ter as mesmas linhas."
- **Vídeo:** montar a fórmula em duas etapas, primeiro o CORRESP sozinho (devolve 3) e depois o ÍNDICE em volta.

* **Variação A:** código do "Notebook" → `=ÍNDICE(A2:A6;CORRESP("Notebook";B2:B6;0))` → P04
* **Variação B:** preço do "Caderno" com ÍNDICE + CORRESP → `=ÍNDICE(C2:C6;CORRESP("Caderno";B2:B6;0))` → 29,90
* **Pegadinha:** `=CORRESP("Mochila";B2:B6;0)` devolveu 3, e não o código. Por quê? → o CORRESP devolve a posição no intervalo; quem busca o valor é o ÍNDICE
* **Múltipla escolha:** o que o CORRESP devolve? (a) o valor encontrado · (b) a posição do valor dentro do intervalo · (c) o número da linha na planilha · (d) VERDADEIRO ou FALSO. **Resposta: (b)**; a Mochila está na linha 4 da planilha, mas na posição 3 do intervalo.

### 4.5 — PROCX

- **Intro:** o PROCX junta o melhor do PROCV, do PROCH e do ÍNDICE + CORRESP numa função só. Disponível no Excel 365 e no 2021 em diante.
- **Desafio:** o nome do produto está em F4 (Mouse). Em G4, traga o preço; se o produto não existir, mostre "Não encontrado".
- **Resposta:** `=PROCX(F4;B2:B6;C2:C6;"Não encontrado")` → 59,90
- **Explicação:** PROCX(o que procurar; onde procurar; o que devolver; se não achar). Busca exata por padrão, olha para qualquer lado e já trata o "não encontrado" sem SEERRO.
- **Erros comuns:** devolver a coluna inteira da tabela (B2:C6) → "O terceiro argumento é só a coluna que você quer: C2:C6."; `#NOME?` → "Sua versão do Excel pode não ter PROCX. Use ÍNDICE + CORRESP."
- **Vídeo:** "esqueça o número da coluna": o PROCX e o PROCV resolvendo o mesmo problema.

* **Variação A:** código do "Notebook", que está à esquerda, com PROCX → `=PROCX("Notebook";B2:B6;A2:A6)` → P04
* **Variação B:** preço do "Teclado", que não está no catálogo → `=PROCX("Teclado";B2:B6;C2:C6;"Não encontrado")` → Não encontrado
* **Pegadinha:** `=PROCX(F4;B2:B6;C2:C7)` dá erro. Por quê? → os intervalos de busca e de retorno têm tamanhos diferentes (5 e 6 linhas)
* **Múltipla escolha:** diferente do PROCV, o PROCX… (a) só busca para a direita · (b) precisa do número da coluna · (c) busca para qualquer lado · (d) não faz busca exata. **Resposta: (c)**.

### Teste do Módulo 4

Cinco questões, sem dica. Aprovação com 4 de 5. Mesmo catálogo e mesma tabela de faixas de comissão do módulo.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Com P04 em F2, traga o preço. | `formula` | `=PROCV(F2;A2:C6;3;FALSO)` → 3.200 |
| 2 | Traga o código da "Caneta". | `formula` | ÍNDICE + CORRESP ou PROCX → P01 |
| 3 | Venda de 7.500: traga a taxa de comissão. | `formula` | `=PROCV(7500;$E$2:$F$5;2;VERDADEIRO)` → 3% |
| 4 | Traga o preço da "Régua"; se não existir, mostre "Não encontrado". | `formula` | `=PROCX("Régua";B2:B6;C2:C6;"Não encontrado")` |
| 5 | Para busca exata no PROCV, o 4º argumento deve ser: (a) VERDADEIRO · (b) FALSO · (c) 1 · (d) vazio | `multiple_choice` | (b) |

## Módulo 5 — Texto

**Introdução do módulo:** dados chegam bagunçados: nomes com espaço sobrando, tudo em maiúsculas, códigos que misturam informações. Este módulo ensina a juntar, cortar e limpar textos, o tipo de tarefa que costuma tomar horas e passa a levar segundos.

### 5.1 — Juntar textos (& e CONCAT)

- **Intro:** nome numa coluna, sobrenome em outra, e você precisa do nome completo.
- **Desafio:** nome em A2 (Maria), sobrenome em B2 (Souza). Em C2, monte "Maria Souza".
- **Resposta:** `=A2&" "&B2` (aceitar também `=CONCAT(A2;" ";B2)`)
- **Explicação:** o `&` cola textos. O espaço entre aspas (" ") é um texto também, e sem ele sairia "MariaSouza".
- **Erros comuns:** `=A2&B2` → "Faltou o espaço entre o nome e o sobrenome."; `=A2+B2` → `#VALOR!`, "O + soma números. Para juntar textos, use &."
- **Vídeo:** juntar três colunas (rua, número, bairro) num endereço completo.

* **Variação A:** rua em A3 (Rua das Flores) e número em B3 (120); monte "Rua das Flores, 120" → `=A3&", "&B3`
* **Variação B:** cidade em A4 (Rio de Janeiro) e UF em B4 (RJ); monte "Rio de Janeiro/RJ" → `=A4&"/"&B4`
* **Pegadinha:** `=A5&" "&B5` saiu com dois espaços entre nome e sobrenome. Por quê? → A5 já tinha um espaço no fim ("Maria "); a solução é o ARRUMAR, do exercício 5.4
* **Múltipla escolha:** qual operador junta textos? (a) + · (b) & · (c) \* · (d) ;. **Resposta: (b)**.

### 5.2 — ESQUERDA e DIREITA

- **Intro:** pegar só o começo ou só o fim de um texto.
- **Desafio:** o código do pedido está em A2 (SP-2026-0042). Em B2, extraia o estado (SP); em C2, o número do pedido (0042).
- **Resposta:** `=ESQUERDA(A2;2)` → SP; `=DIREITA(A2;4)` → 0042
- **Explicação:** ESQUERDA(texto; quantos caracteres) pega do início; DIREITA pega do fim. O resultado é texto, por isso o 0042 mantém os zeros.
- **Erros comuns:** trocar as funções → "ESQUERDA pega do começo; DIREITA, do fim."; contar errado os caracteres → "O número do pedido tem 4 dígitos."
- **Vídeo:** por que o resultado é texto, e como transformar em número quando precisar (`=VALOR(...)`).

* **Variação A:** do código RJ-2025-1187 (A3), extraia o número do pedido → `=DIREITA(A3;4)` → 1187
* **Variação B:** do CEP 20040-020 (A4), extraia os 5 primeiros dígitos → `=ESQUERDA(A4;5)` → 20040
* **Pegadinha:** `=DIREITA(A5;4)` deu "6-42" para o código SP-2026-42. Por quê? → este número tem 2 dígitos, e não 4. ESQUERDA e DIREITA contam uma quantidade fixa; para tamanhos variáveis, use LOCALIZAR (exercício 5.6)
* **Múltipla escolha:** quanto dá `=ESQUERDA("Planilha";4)`? (a) Plan · (b) ilha · (c) lanh · (d) Planilha. **Resposta: (a)**.

### 5.3 — EXT.TEXTO

- **Intro:** e quando a informação está no meio?
- **Desafio:** do mesmo código (SP-2026-0042), extraia o ano em D2.
- **Resposta:** `=EXT.TEXTO(A2;4;4)` → 2026
- **Explicação:** EXT.TEXTO(texto; posição inicial; quantos caracteres). O ano começa no 4º caractere (S, P e o hífen vêm antes) e tem 4 dígitos.
- **Erros comuns:** começar na posição 3 → "-202". Dica: "Conte o hífen também: o ano começa na posição 4."
- **Vídeo:** numerar os caracteres em cima do código, um por um.

* **Variação A:** do código RJ-2025-1187 (A3), extraia o ano → `=EXT.TEXTO(A3;4;4)` → 2025
* **Variação B:** do código PRD-ABC-77 (A4), extraia a categoria → `=EXT.TEXTO(A4;5;3)` → ABC
* **Pegadinha:** `=EXT.TEXTO(A2;4;10)` trouxe "2026-0042". Por quê? → o terceiro argumento é a quantidade de caracteres; pedir 10 a partir da posição 4 vai até o fim do texto
* **Múltipla escolha:** em EXT.TEXTO(texto; 4; 2), o 2 significa… (a) a posição final · (b) a quantidade de caracteres · (c) a ocorrência · (d) a segunda palavra. **Resposta: (b)**.

### 5.4 — ARRUMAR

- **Intro:** espaços sobrando quebram o PROCV e a comparação de textos, e você nem vê.
- **Desafio:** A2 tem "  João   Silva " (com espaços extras). Em B2, deixe "João Silva".
- **Resposta:** `=ARRUMAR(A2)`
- **Explicação:** ARRUMAR tira os espaços do início e do fim, e reduz espaços repetidos no meio a um só.
- **Erros comuns:** usar SUBSTITUIR para tirar todos os espaços → "JoãoSilva". Dica: "Você quer manter um espaço entre as palavras."
- **Vídeo:** o caso real: um PROCV que dá `#N/D` por causa de um espaço invisível, resolvido com ARRUMAR.

* **Variação A:** A3 tem "  Rio   de Janeiro". Limpe em B3 → `=ARRUMAR(A3)` → Rio de Janeiro
* **Variação B:** A4 tem " P03" (espaço no início). Confira se, limpo, é igual a "P03" → `=ARRUMAR(A4)="P03"` → VERDADEIRO
* **Pegadinha:** um PROCV pelo código em F2 dá `#N/D`, mas o código existe na tabela. O que fazer? → provavelmente há espaço sobrando em F2: `=PROCV(ARRUMAR(F2);A2:C6;3;FALSO)`
* **Múltipla escolha:** o que ARRUMAR devolve para "  a   b  "? (a) "ab" · (b) "a b" · (c) "a   b" · (d) " a b ". **Resposta: (b)**.

### 5.5 — PRI.MAIÚSCULA

- **Intro:** nomes digitados de qualquer jeito, todos em maiúsculas ou misturados.
- **Desafio:** A2 tem "mARIA sOUZA". Em B2, deixe "Maria Souza".
- **Resposta:** `=PRI.MAIÚSCULA(A2)`
- **Explicação:** põe a primeira letra de cada palavra em maiúscula e o resto em minúscula. Primas: MAIÚSCULA e MINÚSCULA.
- **Erros comuns:** usar MAIÚSCULA → "MARIA SOUZA": "Essa deixa tudo em maiúscula."
- **Vídeo:** mostrar a limitação: "maria da silva" vira "Maria Da Silva". Vale avisar o aluno.

* **Variação A:** A3 tem "JOÃO DA SILVA" → `=PRI.MAIÚSCULA(A3)` → João Da Silva
* **Variação B:** A4 tem a UF "rj"; deixe em maiúsculas → `=MAIÚSCULA(A4)` → RJ
* **Pegadinha:** A5 tem o e-mail "Ana.Lima@Empresa.com". Alguém usou PRI.MAIÚSCULA e saiu "Ana.Lima@Empresa.Com". Qual é a função certa? → e-mail fica todo em minúsculas: `=MINÚSCULA(A5)`
* **Múltipla escolha:** qual função transforma "rio de janeiro" em "RIO DE JANEIRO"? (a) PRI.MAIÚSCULA · (b) MAIÚSCULA · (c) MINÚSCULA · (d) ARRUMAR. **Resposta: (b)**.

### 5.6 — LOCALIZAR

- **Intro:** em que posição está um caractere? Parece inútil sozinho, mas é a peça que faltava para cortar textos de tamanho variável.
- **Desafio:** e-mail em A2 (ana.lima@empresa.com.br). Em B2, ache a posição do @. Bônus: em C2, extraia o usuário (ana.lima).
- **Resposta:** `=LOCALIZAR("@";A2)` → 9; bônus: `=ESQUERDA(A2;LOCALIZAR("@";A2)-1)` → ana.lima
- **Explicação:** LOCALIZAR devolve a posição do texto procurado. O usuário vai até uma posição antes do @, daí o -1. Funciona para qualquer e-mail, de qualquer tamanho.
- **Erros comuns:** argumentos invertidos (`=LOCALIZAR(A2;"@")`) → "Primeiro o que procurar, depois onde."; esquecer o -1 no bônus → "ana.lima@": "Assim o @ vem junto."
- **Vídeo:** a combinação ESQUERDA + LOCALIZAR, que resolve metade dos problemas de texto do dia a dia.

* **Variação A:** posição do primeiro hífen em SP-2026-0042 (A3) → `=LOCALIZAR("-";A3)` → 3
* **Variação B:** do e-mail em A2, extraia o domínio (empresa.com.br) → `=EXT.TEXTO(A2;LOCALIZAR("@";A2)+1;100)` → empresa.com.br
* **Pegadinha:** `=LOCALIZAR("@";A4)` dá `#VALOR!`. Por quê? → o texto em A4 não tem @ (é um e-mail digitado errado). LOCALIZAR dá erro quando não acha; SEERRO pode tratar.
* **Múltipla escolha:** quanto dá `=LOCALIZAR("a";"Banana")`? (a) 1 · (b) 2 · (c) 3 · (d) 6. **Resposta: (b)**, a primeira ocorrência.

### 5.7 — SUBSTITUIR

- **Intro:** trocar um pedaço de texto por outro, em todas as linhas de uma vez.
- **Desafio:** códigos em A2 (PED\_2026\_001). Em B2, troque os underlines por hífens: PED-2026-001.
- **Resposta:** `=SUBSTITUIR(A2;"_";"-")`
- **Explicação:** SUBSTITUIR(texto; o que sai; o que entra). Troca todas as ocorrências; um quarto argumento opcional troca só uma delas (1ª, 2ª…).
- **Erros comuns:** usar MUDAR → "MUDAR troca por posição. Para trocar por conteúdo, use SUBSTITUIR."
- **Vídeo:** limpar uma coluna de telefones, tirando parênteses, espaços e hífens com SUBSTITUIR encadeado.

* **Variação A:** telefone (21) 99876-5432 em A3; tire o hífen → `=SUBSTITUIR(A3;"-";"")` → (21) 998765432
* **Variação B:** em PED\_2026\_001, troque só o segundo underline por barra → `=SUBSTITUIR(A2;"_";"/";2)` → PED\_2026/001
* **Pegadinha:** `=SUBSTITUIR(A2;"ped";"PEDIDO")` não mudou nada em PED\_2026\_001. Por quê? → o SUBSTITUIR diferencia maiúsculas de minúsculas; "ped" é diferente de "PED"
* **Múltipla escolha:** quanto dá `=SUBSTITUIR("a-b-c";"-";"")`? (a) a-b-c · (b) abc · (c) a b c · (d) erro. **Resposta: (b)**.

### Teste do Módulo 5

Cinco questões, sem dica. Aprovação com 4 de 5. Planilha nova: A2 "Ana", B2 "Lima", C2 "MG-2024-0318", D2 "  carlos   souza ".

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Em E2, monte "Ana Lima". | `formula` | `=A2&" "&B2` |
| 2 | Em F2, extraia a UF do código em C2. | `formula` | `=ESQUERDA(C2;2)` → MG |
| 3 | Em G2, extraia o ano do código em C2. | `formula` | `=EXT.TEXTO(C2;4;4)` → 2024 |
| 4 | Em H2, deixe o nome em D2 como "Carlos Souza". | `formula` | `=PRI.MAIÚSCULA(ARRUMAR(D2))` |
| 5 | Qual função encontra a posição de um caractere num texto? (a) EXT.TEXTO · (b) LOCALIZAR · (c) SUBSTITUIR · (d) ARRUMAR | `multiple_choice` | (b) |

## Módulo 6 — Datas

**Introdução do módulo:** para o Excel, uma data é um número: a quantidade de dias desde 1900. Entendendo isso, fica fácil calcular prazos, idades, tempo de empresa e dias úteis. Este módulo é o mais pedido por quem trabalha com RH, financeiro e logística.

### 6.1 — HOJE e dias até o vencimento

- **Intro:** HOJE() devolve a data de hoje e se atualiza sozinha todo dia.
- **Desafio:** o vencimento de uma conta está em B2. Em C2, calcule quantos dias faltam para ele.
- **Resposta:** `=B2-HOJE()` (o validador compara com o resultado calculado no dia)
- **Explicação:** como datas são números, subtrair uma da outra dá a diferença em dias. Resultado negativo = vencido. HOJE não tem argumentos, mas os parênteses são obrigatórios.
- **Erros comuns:** digitar a data de hoje à mão → "Amanhã a conta estará errada. Use HOJE()."; resultado aparecendo como data → "Mude o formato da célula para Número."
- **Vídeo:** mostrar que a data é um número, formatando uma data como Número.

* **Variação A:** data da compra em A3; em B3, quantos dias se passaram desde ela → `=HOJE()-A3`
* **Variação B:** vencimento em B4; em C4, "Vencida" se já passou, senão "Em dia" → `=SE(B4<HOJE();"Vencida";"Em dia")`
* **Pegadinha:** `=B2-HOJE` dá `#NOME?`. Por quê? → faltaram os parênteses: `HOJE()`
* **Múltipla escolha:** quando o valor de HOJE() muda? (a) nunca · (b) todo dia, quando a planilha recalcula · (c) só quando você redigita · (d) a cada hora. **Resposta: (b)**.

### 6.2 — ANO e MÊS

- **Intro:** separar o ano e o mês de uma data, para agrupar vendas ou contratos.
- **Desafio:** a data de uma venda está em A2 (15/03/2026). Em B2, extraia o ano; em C2, o mês.
- **Resposta:** `=ANO(A2)` → 2026; `=MÊS(A2)` → 3
- **Explicação:** as duas devolvem números. Combinadas com SOMASES, permitem um resumo de vendas por mês.
- **Erros comuns:** `=ESQUERDA(A2;2)` → "Datas não são texto. Use as funções de data."; `MES` sem acento → "A função é MÊS, com acento."
- **Vídeo:** bônus DIA() e DIA.DA.SEMANA().

* **Variação A:** data 02/11/2026 em A3; extraia o mês → `=MÊS(A3)` → 11
* **Variação B:** data 25/12/2026 em A4; extraia o dia → `=DIA(A4)` → 25
* **Pegadinha:** `=ANO(A5)` dá `#VALOR!`, e A5 mostra 15.03.2026. Por quê? → com pontos, o Excel em português guardou como texto, não como data; o formato reconhecido é 15/03/2026
* **Múltipla escolha:** em 2026, quanto dá `=ANO(HOJE())`? (a) 26 · (b) 2026 · (c) a data de hoje · (d) erro. **Resposta: (b)**.

### 6.3 — DATADIF

- **Intro:** quantos anos completos alguém tem de empresa? A função que resolve isso não aparece no menu do Excel, mas funciona.
- **Desafio:** admissão em A2 (10/02/2020), data de referência em B2 (01/11/2026). Em C2, calcule os anos completos de empresa.
- **Resposta:** `=DATADIF(A2;B2;"Y")` → 6
- **Explicação:** DATADIF(início; fim; unidade). "Y" = anos completos, "M" = meses completos (80 aqui), "D" = dias. "YM" dá os meses que sobram depois dos anos (8).
- **Erros comuns:** datas invertidas → `#NÚM!`, "A data inicial vem primeiro."; `=(B2-A2)/365` → 6,73: "Assim você ganha anos quebrados e erra com anos bissextos."
- **Vídeo:** montar "6 anos e 8 meses" juntando dois DATADIF com &.

* **Variação A:** nascimento em A3 (20/05/1995), referência em B3 (01/11/2026); calcule a idade → `=DATADIF(A3;B3;"Y")` → 31
* **Variação B:** contrato de 15/01/2026 (A4) a 01/11/2026 (B4); meses completos → `=DATADIF(A4;B4;"M")` → 9
* **Pegadinha:** admissão em 01/12/2020; em 30/11/2026, o DATADIF com "Y" dá 5, e não 6. Está errado? → não: o 6º ano só se completa em 01/12/2026
* **Múltipla escolha:** a unidade "M" no DATADIF devolve… (a) meses completos · (b) o mês da data · (c) minutos · (d) meses arredondados. **Resposta: (a)**.

### 6.4 — DIATRABALHOTOTAL

- **Intro:** prazo em dias úteis, sem contar fins de semana e feriados.
- **Desafio:** início em A2 (01/12/2026), fim em B2 (31/12/2026), feriado em E2 (25/12/2026). Em C2, conte os dias úteis.
- **Resposta:** `=DIATRABALHOTOTAL(A2;B2;E2)` → 22
- **Explicação:** conta de segunda a sexta entre as duas datas (inclusive) e desconta os feriados informados. Dezembro de 2026 tem 23 dias de semana; tirando o Natal, ficam 22.
- **Erros comuns:** esquecer o feriado → 23, "Faltou informar o feriado no terceiro argumento."; `=B2-A2` → 30, "Isso conta todos os dias, inclusive fins de semana."
- **Vídeo:** montar uma lista de feriados nacionais numa aba e usar em todas as fórmulas.

* **Variação A:** dias úteis de 01/11/2026 a 30/11/2026, com os feriados 02/11, 15/11 e 20/11 em E2:E4 → `=DIATRABALHOTOTAL(A3;B3;E2:E4)` → 19
* **Variação B:** entrega em 10 dias úteis a partir de 01/12/2026 (A4) → `=DIATRABALHO(A4;10;E2:E4)` → 15/12/2026 (DIATRABALHO devolve a data; DIATRABALHOTOTAL conta os dias)
* **Pegadinha:** incluir 15/11/2026 na lista de feriados não mudou o resultado. Por quê? → em 2026, 15/11 cai num domingo, que já não era contado
* **Múltipla escolha:** o que o DIATRABALHOTOTAL conta? (a) todos os dias · (b) segunda a sexta, menos os feriados informados · (c) segunda a sábado · (d) só os feriados. **Resposta: (b)**.

### 6.5 — FIMMÊS

- **Intro:** vencimento no último dia do mês seguinte, fechamento mensal: o FIMMÊS resolve sem calendário na mão.
- **Desafio:** compra em A2 (15/01/2026). Em B2, calcule o vencimento: último dia do mês seguinte.
- **Resposta:** `=FIMMÊS(A2;1)` → 28/02/2026
- **Explicação:** FIMMÊS(data; quantos meses à frente). 0 = fim do próprio mês; 1 = fim do mês seguinte. Ele já sabe que fevereiro de 2026 tem 28 dias.
- **Erros comuns:** resultado aparecendo como 46081 → "É a data em formato de número. Formate a célula como Data."; `=A2+30` → "Somar 30 dias não cai no fim do mês."
- **Vídeo:** o truque: `=FIMMÊS(A2;-1)+1` dá o primeiro dia do mês.

* **Variação A:** último dia do próprio mês de 10/04/2026 (A3) → `=FIMMÊS(A3;0)` → 30/04/2026
* **Variação B:** compra em 15/11/2026 (A4), vencimento no fim do mês, 3 meses depois → `=FIMMÊS(A4;3)` → 28/02/2027
* **Pegadinha:** para "um mês depois de 31/01/2026", alguém usou `=A5+30` e deu 02/03/2026. O que houve? → somar 30 dias pulou fevereiro, que tem 28; para fim de mês, use FIMMÊS
* **Múltipla escolha:** `=FIMMÊS(data;0)` devolve… (a) o primeiro dia do mês · (b) o último dia do mesmo mês · (c) o último dia do mês seguinte · (d) a própria data. **Resposta: (b)**.

### Teste do Módulo 6

Cinco questões, sem dica. Aprovação com 4 de 5. Planilha nova: A2 = 18/07/2026, B2 = 03/03/2015, C2 = 01/11/2026.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Em D2, o ano da data em A2. | `formula` | `=ANO(A2)` → 2026 |
| 2 | Em E2, os anos completos entre B2 e C2. | `formula` | `=DATADIF(B2;C2;"Y")` → 11 |
| 3 | Dias úteis de 01/10/2026 a 31/10/2026, com o feriado de 12/10. | `formula` | `=DIATRABALHOTOTAL(…)` → 21 |
| 4 | Em F2, o último dia do mês seguinte a A2. | `formula` | `=FIMMÊS(A2;1)` → 31/08/2026 |
| 5 | Para o Excel, uma data é: (a) um texto · (b) um número de dias · (c) uma fórmula · (d) uma imagem | `multiple_choice` | (b) |

## Módulo 7 — Arrays dinâmicos

**Introdução do módulo:** até aqui, cada fórmula devolvia um valor só. As funções deste módulo devolvem uma tabela inteira, que "transborda" para as células vizinhas e se atualiza sozinha quando os dados mudam. Disponíveis no Excel 365 e no 2021 em diante.

Planilha base: a mesma tabela de vendas do Módulo 3 (A2:D8: Vendedor, Região, Valor, Status).

### 7.1 — FILTRO

- **Intro:** um filtro que vira fórmula: os dados filtrados aparecem em outro lugar e se atualizam sozinhos.
- **Desafio:** em F2, mostre todas as vendas da região Sul.
- **Resposta:** `=FILTRO(A2:D8;B2:B8="Sul")` → 4 linhas (Ana 500, Carla 200, Bruno 700, Ana 150)
- **Explicação:** FILTRO(o que mostrar; a condição). A condição compara cada linha da coluna B com "Sul" e mantém as verdadeiras. Um terceiro argumento opcional define o que mostrar se nada for encontrado.
- **Erros comuns:** `#DESPEJAR!` → "Tem algo ocupando as células onde o resultado vai aparecer. Libere o espaço."; `#CALC!` → "Nenhuma linha atende à condição. Use o terceiro argumento para mostrar uma mensagem."
- **Vídeo:** adicionar uma venda nova no Sul e ver o resultado crescer sozinho.

* **Variação A:** mostre todas as vendas da Ana → `=FILTRO(A2:D8;A2:A8="Ana")` → 3 linhas
* **Variação B:** mostre as vendas acima de 400 → `=FILTRO(A2:D8;C2:C8>400)` → 4 linhas
* **Pegadinha:** `=FILTRO(A2:D8;B2:B8="Leste")` dá `#CALC!`. Por quê? → não existe região Leste; use o terceiro argumento: `=FILTRO(A2:D8;B2:B8="Leste";"Nenhuma venda")`
* **Múltipla escolha:** uma venda nova do Sul é adicionada dentro do intervalo. O que acontece com o FILTRO? (a) nada · (b) o resultado se atualiza sozinho · (c) dá erro · (d) é preciso refazer a fórmula. **Resposta: (b)**.

### 7.2 — CLASSIFICAR

- **Intro:** ordenar dados sem mexer na tabela original.
- **Desafio:** em F2, mostre a tabela de vendas ordenada do maior valor para o menor.
- **Resposta:** `=CLASSIFICAR(A2:D8;3;-1)` → começa em Bruno 700 e termina em Ana 150
- **Explicação:** CLASSIFICAR(dados; por qual coluna; ordem). A 3ª coluna é o Valor; 1 = crescente, -1 = decrescente.
- **Erros comuns:** usar a letra da coluna (C) → "Informe o número da coluna dentro do intervalo: Valor é a 3ª."; esquecer o -1 → "Sem o -1, a ordem é crescente."
- **Vídeo:** combinar com FILTRO: as vendas do Sul, da maior para a menor, numa fórmula só.

* **Variação A:** a tabela em ordem alfabética de vendedor → `=CLASSIFICAR(A2:D8;1;1)`
* **Variação B:** só as vendas do Sul, da maior para a menor → `=CLASSIFICAR(FILTRO(A2:D8;B2:B8="Sul");3;-1)` → Bruno 700, Ana 500, Carla 200, Ana 150
* **Pegadinha:** `=CLASSIFICAR(A2:D8;3)` começou pela venda de 150, e a ideia era ver as maiores primeiro. O que faltou? → o terceiro argumento -1; sem ele, a ordem é crescente
* **Múltipla escolha:** em `=CLASSIFICAR(dados;2;1)`, o 2 indica… (a) a segunda linha · (b) a segunda coluna do intervalo · (c) ordem decrescente · (d) dois resultados. **Resposta: (b)**.

### 7.3 — ÚNICO

- **Intro:** tirar repetidos de uma lista, sem "remover duplicatas" à mão.
- **Desafio:** em F2, liste os vendedores sem repetição, em ordem alfabética.
- **Resposta:** `=CLASSIFICAR(ÚNICO(A2:A8))` → Ana, Bruno, Carla
- **Explicação:** ÚNICO devolve cada valor uma vez só; CLASSIFICAR em volta coloca em ordem. É o primeiro passo de qualquer resumo por vendedor.
- **Erros comuns:** só `=ÚNICO(A2:A8)` → aceitar, mas avisar: "Certo! Para ordem alfabética, coloque CLASSIFICAR em volta."
- **Vídeo:** fechar o módulo montando um relatório dinâmico: ÚNICO para os vendedores e SOMASE ao lado, usando a referência de transbordamento (F2#).

* **Variação A:** liste as regiões sem repetição → `=ÚNICO(B2:B8)` → Sul, Norte
* **Variação B:** conte quantos vendedores diferentes existem → `=CONT.VALORES(ÚNICO(A2:A8))` → 3
* **Pegadinha:** o ÚNICO listou "Ana" duas vezes. Por quê? → uma das células tem "Ana " com espaço no fim, e para o Excel são textos diferentes. Solução: `=ÚNICO(ARRUMAR(A2:A8))`
* **Múltipla escolha:** o que `=ÚNICO(A2:A8)` devolve? (a) a quantidade de nomes · (b) cada valor uma vez · (c) só os valores que aparecem uma única vez · (d) o primeiro valor. **Resposta: (b)**.

### Teste do Módulo 7

Cinco questões, sem dica. Aprovação com 4 de 5. Mesma tabela de vendas do módulo.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Mostre só as vendas pagas. | `formula` | `=FILTRO(A2:D8;D2:D8="Pago")` → 5 linhas |
| 2 | Mostre a tabela do menor valor para o maior. | `formula` | `=CLASSIFICAR(A2:D8;3;1)` |
| 3 | Liste os status sem repetição. | `formula` | `=ÚNICO(D2:D8)` → Pago, Pendente |
| 4 | Mostre as vendas do Norte, da maior para a menor. | `formula` | `=CLASSIFICAR(FILTRO(A2:D8;B2:B8="Norte");3;-1)` → Carla 600, Ana 450, Bruno 300 |
| 5 | O erro `#DESPEJAR!` significa: (a) divisão por zero · (b) há algo ocupando as células onde o resultado iria aparecer · (c) a fórmula não achou nada · (d) nome de função errado | `multiple_choice` | (b) |

## Módulo 8 — Casos reais

**Introdução do módulo:** no trabalho, ninguém pede "use o PROCV". Pedem "calcula a comissão do time". Aqui o aluno junta o que aprendeu em situações inteiras, e precisa decidir sozinho quais funções usar. É o módulo mais próximo de um teste de emprego.

### 8.1 — Comissão por faixa

- **Intro:** a mesma tabela de faixas do exercício 4.2, agora para chegar ao valor final da comissão.
- **Desafio:** venda em B2 (12.500); faixas em E2:F5 (0 → 2%; 5.000 → 3%; 10.000 → 5%; 20.000 → 7%). Em C2, calcule o valor da comissão, numa fórmula que possa ser arrastada para os outros vendedores.
- **Resposta:** `=B2*PROCV(B2;$E$2:$F$5;2;VERDADEIRO)` → 625
- **Explicação:** o PROCV acha a taxa (5%) e a multiplicação aplica sobre a venda. A tabela de faixas fica travada com cifrão para a fórmula poder ser arrastada.
- **Erros comuns:** devolver só a taxa → "Isso é a taxa. Multiplique pela venda para chegar ao valor."; tabela sem trava → "Arraste a fórmula: a tabela de faixas precisa ficar travada."
- **Vídeo:** mudar a tabela de faixas (por exemplo, 5% vira 6%) e ver todas as comissões mudarem juntas.

* **Variação A:** venda de 3.000 → 60 (faixa de 2%)
* **Variação B:** venda de 25.000 → 1.750 (faixa de 7%)
* **Pegadinha:** por que uma venda de 9.999 rende 299,97 de comissão, e uma de 10.000 rende 500? → aos 10.000 a venda muda de faixa (3% para 5%), e a nova taxa vale para o valor inteiro
* **Múltipla escolha:** para arrastar a fórmula para os outros vendedores, o que precisa estar travado? (a) a venda · (b) a tabela de faixas · (c) o resultado · (d) nada. **Resposta: (b)**.

### 8.2 — Controle de estoque

- **Intro:** uma das planilhas mais comuns em pequenas empresas: quanto tenho e quando preciso repor.
- **Desafio:** estoque inicial em B2 (50), entradas em C2 (20), saídas em D2 (45), estoque mínimo em F2 (30). Em E2, calcule o estoque atual; em G2, mostre "Repor" se ele estiver no mínimo ou abaixo, senão "OK".
- **Resposta:** `=B2+C2-D2` → 25; `=SE(E2<=F2;"Repor";"OK")` → Repor
- **Explicação:** o estoque atual é o que havia, mais o que entrou, menos o que saiu. O SE compara com o mínimo. Com formatação condicional, o "Repor" pode ficar vermelho.
- **Erros comuns:** `<` em vez de `<=` → "No mínimo exato também precisa repor."; somar as saídas → "Saídas diminuem o estoque."
- **Vídeo:** montar a planilha completa de estoque em 90 segundos.

* **Variação A:** inicial 100, entradas 0, saídas 30, mínimo 40 → estoque 70 → OK
* **Variação B:** inicial 10, entradas 5, saídas 20. Mostre "Erro de lançamento" se o estoque ficar negativo; senão, "Repor" ou "OK" → `=SE(E5<0;"Erro de lançamento";SE(E5<=F5;"Repor";"OK"))` → Erro de lançamento
* **Pegadinha:** as saídas foram lançadas como número negativo (−45) e o estoque deu 115, em vez de 25. Por quê? → a fórmula já subtrai as saídas; subtrair um negativo vira soma
* **Múltipla escolha:** qual fórmula calcula o estoque atual? (a) inicial + entradas + saídas · (b) inicial + entradas − saídas · (c) inicial − entradas + saídas · (d) entradas − saídas. **Resposta: (b)**.

### 8.3 — Parcelamento com PGTO

- **Intro:** "12x com juros" — quanto fica cada parcela, e quanto você paga a mais?
- **Desafio:** valor de 3.200 em B1, juros de 2% ao mês em B2, 12 parcelas em B3. Em B4, calcule a parcela.
- **Resposta:** `=PGTO(B2;B3;-B1)` → 302,59 (aceitar também `=-PGTO(B2;B3;B1)`)
- **Explicação:** PGTO(taxa; número de parcelas; valor presente). O Excel trata dinheiro que sai como negativo, por isso o sinal de menos. No total, são 3.631,08 pagos, ou 431,08 só de juros.
- **Erros comuns:** resultado negativo → "O PGTO devolve negativo porque é dinheiro saindo. Coloque um menos na frente do valor."; usar 2 em vez de 2% → "A taxa precisa estar em porcentagem: 2%, ou 0,02."; taxa anual com parcelas mensais → "Taxa e parcelas precisam estar no mesmo período."
- **Vídeo:** comparar à vista vs. parcelado e mostrar quanto custam os juros. Gancho forte para redes sociais.

* **Variação A:** 1.200 em 6 parcelas, com juros de 1,5% ao mês → `=PGTO(1,5%;6;-1200)` → 210,63
* **Variação B:** os mesmos 1.200 em 6 parcelas sem juros → `=PGTO(0;6;-1200)` → 200
* **Pegadinha:** com juros de 24% ao ano e 12 parcelas mensais, `=PGTO(24%;12;-3200)` deu cerca de 830 por mês. O que está errado? → a taxa é anual e as parcelas são mensais; a taxa precisa ser mensal
* **Múltipla escolha:** por que o PGTO devolve um valor negativo? (a) erro de conta · (b) na convenção do Excel, dinheiro que sai é negativo · (c) os juros são negativos · (d) formato da célula. **Resposta: (b)**.

### 8.4 — Desconto do INSS (tabela 2026)

- **Intro:** o desconto do INSS na folha de pagamento, do jeito que o departamento pessoal calcula: progressivo por faixas e limitado ao teto.
- **Desafio:** salário em B2 (3.500). Tabela do INSS 2026 em E2:G5, com o início de cada faixa, a alíquota e a parcela a deduzir: 0 | 7,5% | 0; 1.621,01 | 9% | 24,32; 2.902,85 | 12% | 111,40; 4.354,28 | 14% | 198,49. Teto em H2 (8.475,55). Em C2, calcule a base (o salário limitado ao teto); em D2, o desconto do INSS.
- **Resposta:** `=MÍNIMO(B2;$H$2)` → 3.500; `=C2*PROCV(C2;$E$2:$G$5;2;VERDADEIRO)-PROCV(C2;$E$2:$G$5;3;VERDADEIRO)` → 308,60
- **Explicação:** o cálculo oficial é progressivo: cada alíquota incide só sobre a parte do salário dentro da sua faixa (7,5% sobre os primeiros 1.621,00, 9% sobre o trecho seguinte, e assim por diante). A parcela a deduzir é o atalho que dá o mesmo resultado: base × alíquota da faixa − parcela. Para 3.500: 3.500 × 12% − 111,40 = 308,60. O MÍNIMO aplica o teto: acima de 8.475,55, o desconto para em 988,09.
- **Erros comuns:** aplicar 12% sobre o salário inteiro (420) → "Assim você cobra 12% até da parte que está nas faixas de 7,5% e 9%. Subtraia a parcela a deduzir."; esquecer o teto → "Um salário de 10.000 descontaria 1.201,51, acima do máximo de 988,09. Limite a base ao teto com MÍNIMO."; tabela sem trava → "Trave a tabela com cifrão para poder arrastar."
- **Aviso no app:** valores da tabela do INSS de 2026 para empregados, domésticos e avulsos, fixos por enquanto. A tabela muda todo janeiro: atualizar o exercício e o validador quando sair a de 2027.
- **Vídeo:** desenhar as quatro faixas e mostrar por que quem ganha 3.500 paga 8,8% de INSS, e não 12% (a alíquota efetiva).

* **Variação A:** salário de 1.500 → 112,50 (só a 1ª faixa: 1.500 × 7,5%)
* **Variação B:** salário de 10.000 → a base para no teto (8.475,55) e o desconto é o máximo: 988,09
* **Pegadinha:** quem ganha 3.000 está "na faixa de 12%". Quanto do salário vai, de fato, para o INSS? → o desconto é 248,60, ou 8,29% do salário (`=D2/B2`): essa é a alíquota efetiva
* **Múltipla escolha:** no INSS progressivo, a alíquota de 14%… (a) incide sobre o salário todo · (b) incide só sobre a parte acima de 4.354,27 · (c) é a média das faixas · (d) só vale acima do teto. **Resposta: (b)**.
* **Arredondamento:** na 2ª faixa, o cálculo faixa a faixa pode diferir em 1 centavo do cálculo com parcela a deduzir (24,32). O validador deve aceitar diferença de até 0,01.

### Teste do Módulo 8

Cinco questões, sem dica. Aprovação com 4 de 5. Mesmas tabelas de faixas (comissão e INSS 2026) do módulo.

| # | Questão | Tipo | Resposta |
| --- | --- | --- | --- |
| 1 | Comissão de uma venda de 15.000. | `formula` | `=B2*PROCV(B2;$E$2:$F$5;2;VERDADEIRO)` → 750 |
| 2 | Estoque: inicial 80, entradas 10, saídas 60, mínimo 25. Mostre "Repor" ou "OK". | `formula` | estoque 30 → OK |
| 3 | Parcela de 2.400 em 10 vezes, com juros de 1% ao mês. | `formula` | `=PGTO(1%;10;-2400)` → 253,40 |
| 4 | Desconto do INSS para um salário de 5.000. | `formula` | 5.000 × 14% − 198,49 → 501,51 |
| 5 | Quem ganha 5.000 paga 501,51 de INSS. A alíquota efetiva é: (a) 14% · (b) cerca de 10% · (c) 7,5% · (d) 12% | `multiple_choice` | (b) |
