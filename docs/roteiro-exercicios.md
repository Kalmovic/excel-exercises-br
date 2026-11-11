# Planilhês — Roteiro de exercícios: introduções e soluções

Nov 11, 2026 · @Joseph

## Como usar este roteiro

Este roteiro tem 52 exercícios em 9 módulos, cada um com introdução, solução e explicação. Ele serve de base para o texto do app, para as dicas automáticas e, no futuro, para as aulas em vídeo.

Cada exercício segue o mesmo formato:

| Campo | Para que serve | Onde aparece |
| --- | --- | --- |
| Intro | Contexto em 1–2 frases: por que essa função importa | Antes do exercício |
| Desafio | O que o aluno precisa fazer, com os dados da planilha | Enunciado |
| Resposta | A fórmula esperada (e alternativas aceitas) | Gabarito do validador |
| Explicação | Como a fórmula funciona, parte por parte | Depois de acertar ou pedir a solução |
| Erros comuns | Os enganos mais prováveis e a dica para cada um | Dicas automáticas (camada de regras do tutor) |
| Vídeo | O gancho e o roteiro curto da aula | Gravação futura (30–90 s) |

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

### 0.2 — Clique na célula certa

- **Intro:** antes de escrever qualquer coisa, você precisa saber chegar na célula certa.
- **Desafio:** clique na célula C7.
- **Resposta:** célula ativa = C7.
- **Explicação:** ache a coluna C no topo e desça até a linha 7. A caixa de nome confirma: C7.
- **Erros comuns:** clicar em D7 ou C6 → "Confira a caixa de nome: ela mostra onde você está."
- **Vídeo:** dispensa vídeo; usar o mesmo do 0.1.

### 0.3 — Selecionar um intervalo

- **Intro:** a maioria das funções trabalha com um grupo de células de uma vez, o intervalo.
- **Desafio:** selecione o intervalo B2:D5.
- **Resposta:** seleção = B2:D5 (arrastando o mouse ou com Shift + setas).
- **Explicação:** um intervalo vai do canto superior esquerdo (B2) ao canto inferior direito (D5). O `:` quer dizer "até": B2:D5 tem 3 colunas e 4 linhas, ou 12 células.
- **Erros comuns:** selecionar só até D4 → "O intervalo vai até a linha 5."
- **Vídeo:** mostrar os dois jeitos de selecionar: arrastando e com Shift + setas.

### 0.4 — Digitar um valor

- **Intro:** digitar é simples, mas existe uma regra: o valor só entra na célula quando você confirma.
- **Desafio:** digite 150 na célula B3.
- **Resposta:** B3 = 150.
- **Explicação:** clique em B3, digite e aperte Enter (ou Tab). Sem confirmar, o valor não é gravado.
- **Erros comuns:** digitar "R$ 150" → aceitar, mas explicar que o formato de moeda se aplica depois (exercício 0.9).
- **Vídeo:** Enter desce, Tab vai para a direita, Esc cancela.

### 0.5 — Editar uma célula

- **Intro:** errou um valor? Dá para corrigir sem apagar tudo.
- **Desafio:** corrija o valor de C2 de 100 para 120.
- **Resposta:** C2 = 120.
- **Explicação:** F2 ou duplo clique entra no modo de edição, com o cursor dentro da célula. Digitar direto, sem F2, substitui o conteúdo inteiro, o que também funciona para um número curto.
- **Erros comuns:** apertar Esc no fim → "Esc cancela a edição. Use Enter para confirmar."
- **Vídeo:** F2 é o atalho mais subestimado do Excel.

### 0.6 — O que a célula mostra e o que ela guarda

- **Intro:** uma célula pode mostrar 300 e guardar uma fórmula. Entender isso evita muita confusão.
- **Desafio:** D4 mostra 300. Clique nela: o que aparece na barra de fórmulas?
- **Resposta:** `=B4+C4` (comparação sem diferenciar maiúsculas nem espaços).
- **Explicação:** a célula mostra o resultado; a barra de fórmulas mostra a receita. Se B4 ou C4 mudar, D4 muda junto.
- **Erros comuns:** responder "300" → "Esse é o resultado. Olhe a barra de fórmulas, acima da planilha."
- **Vídeo:** alterar B4 ao vivo e mostrar D4 se atualizando sozinha.

### 0.7 — Navegar pelo teclado

- **Intro:** quem usa o teclado trabalha muito mais rápido do que quem vive no mouse.
- **Desafio:** partindo de A1, chegue em C3 usando só o teclado.
- **Resposta:** célula ativa = C3, sem nenhum clique.
- **Explicação:** duas vezes → e duas vezes ↓. Dica extra: Ctrl + seta pula até o fim dos dados.
- **Erros comuns:** usar o mouse → "Desta vez, só o teclado. Use as setas."
- **Vídeo:** mostrar Ctrl + seta numa planilha com 1.000 linhas.

### 0.8 — A primeira fórmula

- **Intro:** toda fórmula começa com `=`. É assim que o Excel sabe que deve calcular, e não só mostrar o texto.
- **Desafio:** em C1, some os valores de A1 e B1.
- **Resposta:** `=A1+B1` (aceitar também `=SOMA(A1;B1)` e `=SOMA(A1:B1)`).
- **Explicação:** usar os endereços, e não os números, faz a fórmula se atualizar quando os valores mudarem.
- **Erros comuns:** `A1+B1` sem `=` → "Toda fórmula começa com =."; digitar o resultado à mão → "Use uma fórmula, para ela se atualizar sozinha."
- **Vídeo:** o momento "mágico": mudar A1 e ver C1 mudar.

### 0.9 — Formatar como moeda

- **Intro:** formatar muda só a aparência. O valor guardado continua o mesmo.
- **Desafio:** formate B2:B5 como moeda (R$).
- **Resposta:** formato de B2:B5 = moeda BRL.
- **Explicação:** 29,9 passa a aparecer como R$ 29,90, mas continua valendo 29,9 nas contas. No Excel, fica em Página Inicial › Número; atalho Ctrl + Shift + 4.
- **Erros comuns:** formatar só B2 → "Selecione o intervalo inteiro antes de formatar."
- **Vídeo:** mostrar a barra de fórmulas com 29,9 enquanto a célula mostra R$ 29,90.

### 0.10 — Formatar como porcentagem

- **Intro:** 0,05 e 5% são o mesmo número escrito de jeitos diferentes.
- **Desafio:** formate C2 (que contém 0,05) como porcentagem.
- **Resposta:** formato de C2 = porcentagem, exibindo 5%.
- **Explicação:** o formato de porcentagem multiplica a exibição por 100. Se a célula tivesse 5, apareceria 500%, um erro clássico.
- **Erros comuns:** digitar 5 e formatar → explicar por que vira 500%.
- **Vídeo:** o caso dos 500% e como evitar: digite 5% direto, ou 0,05.

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

### 1.2 — MÉDIA

- **Intro:** a média responde "quanto vendemos num mês típico?".
- **Desafio:** em B9, calcule a média mensal de vendas.
- **Resposta:** `=MÉDIA(B2:B7)` → 1.279,17
- **Explicação:** MÉDIA soma os valores e divide pela quantidade de células com número. Células vazias são ignoradas; células com zero entram na conta.
- **Erros comuns:** `=SOMA(B2:B7)/7` → "São 6 meses, não 7. A MÉDIA conta sozinha."; esquecer o acento (`MEDIA`) → "A função é MÉDIA, com acento."
- **Vídeo:** o cuidado com zero vs. vazio.

### 1.3 — MÍNIMO e MÁXIMO

- **Intro:** qual foi o pior e o melhor mês? Em 500 linhas, ninguém acha isso no olho.
- **Desafio:** em B10, o menor valor de vendas; em B11, o maior.
- **Resposta:** `=MÍNIMO(B2:B7)` → 950; `=MÁXIMO(B2:B7)` → 1.675
- **Explicação:** as duas funcionam igual à SOMA: recebem um intervalo e devolvem um número.
- **Erros comuns:** `MIN`/`MAX` → "Em português: MÍNIMO e MÁXIMO."
- **Vídeo:** bônus rápido: MÁXIMO − MÍNIMO dá a amplitude.

### 1.4 — Operadores e ordem das contas

- **Intro:** o Excel segue a mesma ordem da matemática da escola: multiplicação antes de soma.
- **Desafio:** preço unitário em B2 (50), quantidade em C2 (3), frete em D2 (20). Em E2, calcule o total do pedido: preço × quantidade + frete.
- **Resposta:** `=B2*C2+D2` → 170
- **Explicação:** o Excel faz B2\*C2 primeiro (150) e depois soma o frete. Parênteses mudam a ordem: `=B2*(C2+D2)` daria 1.150, um erro.
- **Erros comuns:** `=B2*(C2+D2)` → "Os parênteses fizeram o frete ser multiplicado pela quantidade."; usar `x` em vez de `*` → "No Excel, a multiplicação é o asterisco (\*)."
- **Vídeo:** mostrar as duas versões lado a lado e a diferença de R$ 980.

### 1.5 — Variação percentual

- **Intro:** "as vendas caíram quanto de janeiro para fevereiro?" é uma das perguntas mais comuns no trabalho.
- **Desafio:** em C3, calcule a variação de Fev (B3) em relação a Jan (B2) e formate como porcentagem.
- **Resposta:** `=(B3-B2)/B2` → −20,83%
- **Explicação:** a regra é (novo − antigo) / antigo. O parêntese garante que a subtração acontece antes da divisão. Resultado negativo = queda.
- **Erros comuns:** `=B3-B2/B2` → "Sem parênteses, o Excel divide antes de subtrair."; dividir pelo mês novo (`/B3`) → "A base é sempre o valor antigo."
- **Vídeo:** a fórmula que todo analista usa todo dia, e o erro de dividir pelo valor errado.

### 1.6 — Referência absoluta (cifrão)

- **Intro:** quando você arrasta uma fórmula, as referências andam junto. Às vezes, uma delas precisa ficar parada.
- **Desafio:** a taxa de comissão (5%) está em F1. Em C2, calcule a comissão sobre B2 de um jeito que funcione ao arrastar até C7.
- **Resposta:** `=B2*$F$1` → 60 em C2 (e 47,50 em C3 ao arrastar)
- **Explicação:** o cifrão trava a coluna e a linha. Ao arrastar, B2 vira B3, B4 e assim por diante, mas a referência travada continua apontando para F1. Atalho: F4 coloca os cifrões.
- **Erros comuns:** `=B2*F1` → funciona em C2, mas em C3 vira B3\*F2 (vazio = 0). Dica: "Arraste e veja o que acontece com F1. Ela precisa ficar travada."
- **Vídeo:** arrastar a versão errada, mostrar os zeros e corrigir com F4. É o vídeo mais importante do módulo.

### 1.7 — Referência mista

- **Intro:** às vezes você precisa travar só a coluna, ou só a linha. É o que faz uma tabela de preços × quantidades funcionar com uma única fórmula.
- **Desafio:** quantidades 1 a 5 em A3:A7; preços em B2:E2. Escreva em B3 uma fórmula que, arrastada para todo B3:E7, calcule preço × quantidade.
- **Resposta:** `=$A3*B$2`
- **Explicação:** a primeira parte trava a coluna A (a quantidade está sempre ali) e deixa a linha andar. A segunda trava a linha 2 (o preço está sempre ali) e deixa a coluna andar. F4 repetido alterna entre os tipos de trava.
- **Erros comuns:** travar tudo, com cifrão nas duas partes de cada referência → "Travou demais: a tabela inteira fica com o mesmo valor."; `=A3*B2` → "Ao arrastar, as referências saem do lugar."
- **Vídeo:** apertar F4 quatro vezes e mostrar os quatro estados.

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

### 2.2 — SE aninhado

- **Intro:** e quando há mais de duas respostas possíveis? Você coloca um SE dentro do outro.
- **Desafio:** em C2, mostre "Ótimo" para nota 9 ou mais, "Bom" para 7 ou mais, e "Recuperação" para o resto.
- **Resposta:** `=SE(B2>=9;"Ótimo";SE(B2>=7;"Bom";"Recuperação"))` → Bom (para 7,5)
- **Explicação:** o segundo SE é o "senão" do primeiro. A ordem importa: testa-se do maior para o menor. Se testasse >=7 primeiro, quem tirou 9,5 também cairia em "Bom".
- **Erros comuns:** ordem invertida → "Teste a faixa mais alta primeiro."; parênteses faltando no fim → "Cada SE aberto precisa ser fechado."
- **Vídeo:** desenhar a árvore de decisão antes de escrever a fórmula.

### 2.3 — E e OU

- **Intro:** às vezes a decisão depende de duas condições ao mesmo tempo.
- **Desafio:** vendas em B2 (12.000) e faltas em C2 (0). Em D2, mostre "Bônus" se as vendas forem de pelo menos 10.000 E não houver faltas; senão, "Sem bônus".
- **Resposta:** `=SE(E(B2>=10000;C2=0);"Bônus";"Sem bônus")` → Bônus
- **Explicação:** E só é verdadeiro se todas as condições forem verdadeiras. OU é verdadeiro se pelo menos uma for. Elas vivem dentro do teste do SE.
- **Erros comuns:** usar OU → "Com OU, quem vendeu muito mas faltou também ganharia."; escrever `10.000` com ponto → "Dentro da fórmula, números vão sem separador de milhar."
- **Vídeo:** a mesma fórmula com E e com OU, e quem ganha bônus em cada caso.

### 2.4 — SES

- **Intro:** o SES faz o mesmo que vários SEs aninhados, mas em linha reta e mais fácil de ler. Disponível a partir do Excel 2019.
- **Desafio:** refaça o exercício 2.2 usando SES.
- **Resposta:** `=SES(B2>=9;"Ótimo";B2>=7;"Bom";VERDADEIRO;"Recuperação")`
- **Explicação:** SES recebe pares de teste e resultado e devolve o primeiro par verdadeiro. O último teste, `VERDADEIRO`, funciona como "para todo o resto".
- **Erros comuns:** esquecer o par final → notas abaixo de 7 dão `#N/D`. Dica: "Adicione um último par com VERDADEIRO para cobrir o resto."
- **Vídeo:** comparar a fórmula aninhada e a SES lado a lado.

### 2.5 — SEERRO

- **Intro:** erros como `#DIV/0!` assustam quem lê a planilha. O SEERRO troca o erro por algo apresentável.
- **Desafio:** em D2, calcule o preço médio (total em B2 ÷ quantidade em C2). Algumas linhas têm quantidade 0. Quando der erro, mostre 0.
- **Resposta:** `=SEERRO(B2/C2;0)`
- **Explicação:** SEERRO(valor; o que mostrar se der erro). Se a conta funcionar, aparece o resultado; se der qualquer erro, aparece o segundo argumento.
- **Erros comuns:** `=SEERRO(0;B2/C2)` → "A conta vem primeiro; o valor alternativo, depois."
- **Vídeo:** o alerta: SEERRO esconde todos os erros, inclusive os que você precisaria ver. Use com critério.

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

### 3.2 — CONT.SE

- **Intro:** contar só o que atende a uma condição.
- **Desafio:** em F2, conte quantas vendas a Ana fez.
- **Resposta:** `=CONT.SE(A2:A8;"Ana")` → 3
- **Explicação:** CONT.SE(onde procurar; o que procurar). O critério pode ser texto ("Ana"), número (500), comparação (">400") ou uma célula (H1, onde está escrito Ana).
- **Erros comuns:** `Ana` sem aspas → "Texto no critério vai entre aspas."; procurar na coluna errada → "Os nomes estão na coluna A."
- **Vídeo:** usar uma célula como critério, para trocar o vendedor sem mexer na fórmula.

### 3.3 — CONT.SES

- **Intro:** e se forem duas condições? CONT.SES aceita quantas você precisar.
- **Desafio:** em F3, conte quantas vendas a Ana fez na região Sul.
- **Resposta:** `=CONT.SES(A2:A8;"Ana";B2:B8;"Sul")` → 2
- **Explicação:** os argumentos vêm em pares: intervalo, critério; intervalo, critério. Todas as condições precisam ser verdadeiras na mesma linha.
- **Erros comuns:** intervalos de tamanhos diferentes (A2:A8 com B2:B9) → "Os intervalos precisam ter o mesmo tamanho."
- **Vídeo:** destacar as duas linhas que contam e a terceira venda da Ana, que não conta.

### 3.4 — SOMASE

- **Intro:** em vez de contar, somar os valores de quem atende à condição.
- **Desafio:** em F4, some o valor total vendido pela Ana.
- **Resposta:** `=SOMASE(A2:A8;"Ana";C2:C8)` → 1.100
- **Explicação:** SOMASE(onde procurar; o que procurar; o que somar). O Excel acha "Ana" na coluna A e soma o valor da mesma linha na coluna C.
- **Erros comuns:** esquecer o terceiro argumento → resultado 0, porque tenta somar os nomes. Dica: "Diga ao Excel qual coluna somar: a dos valores."
- **Vídeo:** comparar com filtrar e somar à mão, e mostrar a fórmula se atualizando quando entra uma venda nova.

### 3.5 — SOMASES

- **Intro:** somar com várias condições. Atenção: a ordem dos argumentos é diferente da SOMASE.
- **Desafio:** em F5, some o valor das vendas da região Sul que já estão pagas.
- **Resposta:** `=SOMASES(C2:C8;B2:B8;"Sul";D2:D8;"Pago")` → 1.400
- **Explicação:** na SOMASES, o que somar vem primeiro, e depois os pares de intervalo e critério. A venda de 150 da Ana (Sul, Pendente) fica de fora.
- **Erros comuns:** ordem da SOMASE (`=SOMASES(B2:B8;"Sul";C2:C8…)`) → "Na SOMASES, o intervalo a somar vem primeiro."
- **Vídeo:** SOMASE e SOMASES lado a lado, com o primeiro argumento destacado: a pegadinha preferida das provas.

### 3.6 — MÉDIASE

- **Intro:** a média de só uma parte dos dados.
- **Desafio:** em F6, calcule o valor médio das vendas da região Norte.
- **Resposta:** `=MÉDIASE(B2:B8;"Norte";C2:C8)` → 450
- **Explicação:** mesma estrutura da SOMASE, mas devolve a média. Norte tem 300, 450 e 600: soma 1.350, dividida por 3.
- **Erros comuns:** `=SOMASE(…)/7` → "Dividir por 7 usa todas as vendas. São só 3 do Norte; a MÉDIASE conta sozinha."
- **Vídeo:** fechar o módulo com um mini-relatório por região usando as três funções.

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

### 4.2 — PROCV (busca por faixa)

- **Intro:** a comissão muda conforme a faixa de venda. Em vez de um SE gigante, uma tabela de faixas e um PROCV.
- **Desafio:** tabela de faixas em E2:F5 (0 → 2%; 5.000 → 3%; 10.000 → 5%; 20.000 → 7%). A venda está em B2 (12.500). Em C2, traga a taxa de comissão.
- **Resposta:** `=PROCV(B2;$E$2:$F$5;2;VERDADEIRO)` → 5%
- **Explicação:** com VERDADEIRO, o PROCV procura o maior valor que seja menor ou igual ao procurado. 12.500 não existe na tabela, então ele para no 10.000. Regra de ouro: a primeira coluna precisa estar em ordem crescente.
- **Erros comuns:** usar FALSO → `#N/D`, "12.500 não está na tabela. Para faixas, use VERDADEIRO."; tabela fora de ordem → "Ordene as faixas do menor para o maior."; esquecer de travar a tabela → "Ao arrastar, a tabela de faixas sai do lugar."
- **Vídeo:** desenhar as faixas numa régua e mostrar onde o 12.500 cai.

### 4.3 — PROCH

- **Intro:** o PROCH é o PROCV deitado: procura numa linha, em vez de numa coluna.
- **Desafio:** meses de Jan a Jun em B1:G1; metas na linha 2 (10.000, 11.000, 12.000, 13.000, 14.000, 15.000). Em B5, traga a meta de "Mar".
- **Resposta:** `=PROCH("Mar";B1:G2;2;FALSO)` → 12.000
- **Explicação:** procura "Mar" na primeira linha do intervalo e devolve o valor da linha 2. Fora isso, funciona igual ao PROCV.
- **Erros comuns:** usar PROCV → "Os meses estão numa linha, não numa coluna."
- **Vídeo:** curto. A mensagem principal é que o PROCX substitui os dois.

### 4.4 — ÍNDICE + CORRESP

- **Intro:** o PROCV só olha para a direita. Se você tem o nome do produto e quer o código, que está à esquerda, ele não resolve.
- **Desafio:** em G3, traga o código da "Mochila".
- **Resposta:** `=ÍNDICE(A2:A6;CORRESP("Mochila";B2:B6;0))` → P03
- **Explicação:** CORRESP descobre em que posição a Mochila está na coluna B (3ª). ÍNDICE pega a 3ª posição da coluna A. O 0 no CORRESP significa busca exata.
- **Erros comuns:** esquecer o 0 → resultado imprevisível. Dica: "Use 0 no CORRESP para busca exata."; intervalos de tamanhos diferentes → "As duas colunas precisam ter as mesmas linhas."
- **Vídeo:** montar a fórmula em duas etapas, primeiro o CORRESP sozinho (devolve 3) e depois o ÍNDICE em volta.

### 4.5 — PROCX

- **Intro:** o PROCX junta o melhor do PROCV, do PROCH e do ÍNDICE + CORRESP numa função só. Disponível no Excel 365 e no 2021 em diante.
- **Desafio:** o nome do produto está em F4 (Mouse). Em G4, traga o preço; se o produto não existir, mostre "Não encontrado".
- **Resposta:** `=PROCX(F4;B2:B6;C2:C6;"Não encontrado")` → 59,90
- **Explicação:** PROCX(o que procurar; onde procurar; o que devolver; se não achar). Busca exata por padrão, olha para qualquer lado e já trata o "não encontrado" sem SEERRO.
- **Erros comuns:** devolver a coluna inteira da tabela (B2:C6) → "O terceiro argumento é só a coluna que você quer: C2:C6."; `#NOME?` → "Sua versão do Excel pode não ter PROCX. Use ÍNDICE + CORRESP."
- **Vídeo:** "esqueça o número da coluna": o PROCX e o PROCV resolvendo o mesmo problema.

## Módulo 5 — Texto

**Introdução do módulo:** dados chegam bagunçados: nomes com espaço sobrando, tudo em maiúsculas, códigos que misturam informações. Este módulo ensina a juntar, cortar e limpar textos, o tipo de tarefa que costuma tomar horas e passa a levar segundos.

### 5.1 — Juntar textos (& e CONCAT)

- **Intro:** nome numa coluna, sobrenome em outra, e você precisa do nome completo.
- **Desafio:** nome em A2 (Maria), sobrenome em B2 (Souza). Em C2, monte "Maria Souza".
- **Resposta:** `=A2&" "&B2` (aceitar também `=CONCAT(A2;" ";B2)`)
- **Explicação:** o `&` cola textos. O espaço entre aspas (" ") é um texto também, e sem ele sairia "MariaSouza".
- **Erros comuns:** `=A2&B2` → "Faltou o espaço entre o nome e o sobrenome."; `=A2+B2` → `#VALOR!`, "O + soma números. Para juntar textos, use &."
- **Vídeo:** juntar três colunas (rua, número, bairro) num endereço completo.

### 5.2 — ESQUERDA e DIREITA

- **Intro:** pegar só o começo ou só o fim de um texto.
- **Desafio:** o código do pedido está em A2 (SP-2026-0042). Em B2, extraia o estado (SP); em C2, o número do pedido (0042).
- **Resposta:** `=ESQUERDA(A2;2)` → SP; `=DIREITA(A2;4)` → 0042
- **Explicação:** ESQUERDA(texto; quantos caracteres) pega do início; DIREITA pega do fim. O resultado é texto, por isso o 0042 mantém os zeros.
- **Erros comuns:** trocar as funções → "ESQUERDA pega do começo; DIREITA, do fim."; contar errado os caracteres → "O número do pedido tem 4 dígitos."
- **Vídeo:** por que o resultado é texto, e como transformar em número quando precisar (`=VALOR(...)`).

### 5.3 — EXT.TEXTO

- **Intro:** e quando a informação está no meio?
- **Desafio:** do mesmo código (SP-2026-0042), extraia o ano em D2.
- **Resposta:** `=EXT.TEXTO(A2;4;4)` → 2026
- **Explicação:** EXT.TEXTO(texto; posição inicial; quantos caracteres). O ano começa no 4º caractere (S, P e o hífen vêm antes) e tem 4 dígitos.
- **Erros comuns:** começar na posição 3 → "-202". Dica: "Conte o hífen também: o ano começa na posição 4."
- **Vídeo:** numerar os caracteres em cima do código, um por um.

### 5.4 — ARRUMAR

- **Intro:** espaços sobrando quebram o PROCV e a comparação de textos, e você nem vê.
- **Desafio:** A2 tem "  João   Silva " (com espaços extras). Em B2, deixe "João Silva".
- **Resposta:** `=ARRUMAR(A2)`
- **Explicação:** ARRUMAR tira os espaços do início e do fim, e reduz espaços repetidos no meio a um só.
- **Erros comuns:** usar SUBSTITUIR para tirar todos os espaços → "JoãoSilva". Dica: "Você quer manter um espaço entre as palavras."
- **Vídeo:** o caso real: um PROCV que dá `#N/D` por causa de um espaço invisível, resolvido com ARRUMAR.

### 5.5 — PRI.MAIÚSCULA

- **Intro:** nomes digitados de qualquer jeito, todos em maiúsculas ou misturados.
- **Desafio:** A2 tem "mARIA sOUZA". Em B2, deixe "Maria Souza".
- **Resposta:** `=PRI.MAIÚSCULA(A2)`
- **Explicação:** põe a primeira letra de cada palavra em maiúscula e o resto em minúscula. Primas: MAIÚSCULA e MINÚSCULA.
- **Erros comuns:** usar MAIÚSCULA → "MARIA SOUZA": "Essa deixa tudo em maiúscula."
- **Vídeo:** mostrar a limitação: "maria da silva" vira "Maria Da Silva". Vale avisar o aluno.

### 5.6 — LOCALIZAR

- **Intro:** em que posição está um caractere? Parece inútil sozinho, mas é a peça que faltava para cortar textos de tamanho variável.
- **Desafio:** e-mail em A2 (ana.lima@empresa.com.br). Em B2, ache a posição do @. Bônus: em C2, extraia o usuário (ana.lima).
- **Resposta:** `=LOCALIZAR("@";A2)` → 9; bônus: `=ESQUERDA(A2;LOCALIZAR("@";A2)-1)` → ana.lima
- **Explicação:** LOCALIZAR devolve a posição do texto procurado. O usuário vai até uma posição antes do @, daí o -1. Funciona para qualquer e-mail, de qualquer tamanho.
- **Erros comuns:** argumentos invertidos (`=LOCALIZAR(A2;"@")`) → "Primeiro o que procurar, depois onde."; esquecer o -1 no bônus → "ana.lima@": "Assim o @ vem junto."
- **Vídeo:** a combinação ESQUERDA + LOCALIZAR, que resolve metade dos problemas de texto do dia a dia.

### 5.7 — SUBSTITUIR

- **Intro:** trocar um pedaço de texto por outro, em todas as linhas de uma vez.
- **Desafio:** códigos em A2 (PED\_2026\_001). Em B2, troque os underlines por hífens: PED-2026-001.
- **Resposta:** `=SUBSTITUIR(A2;"_";"-")`
- **Explicação:** SUBSTITUIR(texto; o que sai; o que entra). Troca todas as ocorrências; um quarto argumento opcional troca só uma delas (1ª, 2ª…).
- **Erros comuns:** usar MUDAR → "MUDAR troca por posição. Para trocar por conteúdo, use SUBSTITUIR."
- **Vídeo:** limpar uma coluna de telefones, tirando parênteses, espaços e hífens com SUBSTITUIR encadeado.

## Módulo 6 — Datas

**Introdução do módulo:** para o Excel, uma data é um número: a quantidade de dias desde 1900. Entendendo isso, fica fácil calcular prazos, idades, tempo de empresa e dias úteis. Este módulo é o mais pedido por quem trabalha com RH, financeiro e logística.

### 6.1 — HOJE e dias até o vencimento

- **Intro:** HOJE() devolve a data de hoje e se atualiza sozinha todo dia.
- **Desafio:** o vencimento de uma conta está em B2. Em C2, calcule quantos dias faltam para ele.
- **Resposta:** `=B2-HOJE()` (o validador compara com o resultado calculado no dia)
- **Explicação:** como datas são números, subtrair uma da outra dá a diferença em dias. Resultado negativo = vencido. HOJE não tem argumentos, mas os parênteses são obrigatórios.
- **Erros comuns:** digitar a data de hoje à mão → "Amanhã a conta estará errada. Use HOJE()."; resultado aparecendo como data → "Mude o formato da célula para Número."
- **Vídeo:** mostrar que a data é um número, formatando uma data como Número.

### 6.2 — ANO e MÊS

- **Intro:** separar o ano e o mês de uma data, para agrupar vendas ou contratos.
- **Desafio:** a data de uma venda está em A2 (15/03/2026). Em B2, extraia o ano; em C2, o mês.
- **Resposta:** `=ANO(A2)` → 2026; `=MÊS(A2)` → 3
- **Explicação:** as duas devolvem números. Combinadas com SOMASES, permitem um resumo de vendas por mês.
- **Erros comuns:** `=ESQUERDA(A2;2)` → "Datas não são texto. Use as funções de data."; `MES` sem acento → "A função é MÊS, com acento."
- **Vídeo:** bônus DIA() e DIA.DA.SEMANA().

### 6.3 — DATADIF

- **Intro:** quantos anos completos alguém tem de empresa? A função que resolve isso não aparece no menu do Excel, mas funciona.
- **Desafio:** admissão em A2 (10/02/2020), data de referência em B2 (01/11/2026). Em C2, calcule os anos completos de empresa.
- **Resposta:** `=DATADIF(A2;B2;"Y")` → 6
- **Explicação:** DATADIF(início; fim; unidade). "Y" = anos completos, "M" = meses completos (80 aqui), "D" = dias. "YM" dá os meses que sobram depois dos anos (8).
- **Erros comuns:** datas invertidas → `#NÚM!`, "A data inicial vem primeiro."; `=(B2-A2)/365` → 6,73: "Assim você ganha anos quebrados e erra com anos bissextos."
- **Vídeo:** montar "6 anos e 8 meses" juntando dois DATADIF com &.

### 6.4 — DIATRABALHOTOTAL

- **Intro:** prazo em dias úteis, sem contar fins de semana e feriados.
- **Desafio:** início em A2 (01/12/2026), fim em B2 (31/12/2026), feriado em E2 (25/12/2026). Em C2, conte os dias úteis.
- **Resposta:** `=DIATRABALHOTOTAL(A2;B2;E2)` → 22
- **Explicação:** conta de segunda a sexta entre as duas datas (inclusive) e desconta os feriados informados. Dezembro de 2026 tem 23 dias de semana; tirando o Natal, ficam 22.
- **Erros comuns:** esquecer o feriado → 23, "Faltou informar o feriado no terceiro argumento."; `=B2-A2` → 30, "Isso conta todos os dias, inclusive fins de semana."
- **Vídeo:** montar uma lista de feriados nacionais numa aba e usar em todas as fórmulas.

### 6.5 — FIMMÊS

- **Intro:** vencimento no último dia do mês seguinte, fechamento mensal: o FIMMÊS resolve sem calendário na mão.
- **Desafio:** compra em A2 (15/01/2026). Em B2, calcule o vencimento: último dia do mês seguinte.
- **Resposta:** `=FIMMÊS(A2;1)` → 28/02/2026
- **Explicação:** FIMMÊS(data; quantos meses à frente). 0 = fim do próprio mês; 1 = fim do mês seguinte. Ele já sabe que fevereiro de 2026 tem 28 dias.
- **Erros comuns:** resultado aparecendo como 46081 → "É a data em formato de número. Formate a célula como Data."; `=A2+30` → "Somar 30 dias não cai no fim do mês."
- **Vídeo:** o truque: `=FIMMÊS(A2;-1)+1` dá o primeiro dia do mês.

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

### 7.2 — CLASSIFICAR

- **Intro:** ordenar dados sem mexer na tabela original.
- **Desafio:** em F2, mostre a tabela de vendas ordenada do maior valor para o menor.
- **Resposta:** `=CLASSIFICAR(A2:D8;3;-1)` → começa em Bruno 700 e termina em Ana 150
- **Explicação:** CLASSIFICAR(dados; por qual coluna; ordem). A 3ª coluna é o Valor; 1 = crescente, -1 = decrescente.
- **Erros comuns:** usar a letra da coluna (C) → "Informe o número da coluna dentro do intervalo: Valor é a 3ª."; esquecer o -1 → "Sem o -1, a ordem é crescente."
- **Vídeo:** combinar com FILTRO: as vendas do Sul, da maior para a menor, numa fórmula só.

### 7.3 — ÚNICO

- **Intro:** tirar repetidos de uma lista, sem "remover duplicatas" à mão.
- **Desafio:** em F2, liste os vendedores sem repetição, em ordem alfabética.
- **Resposta:** `=CLASSIFICAR(ÚNICO(A2:A8))` → Ana, Bruno, Carla
- **Explicação:** ÚNICO devolve cada valor uma vez só; CLASSIFICAR em volta coloca em ordem. É o primeiro passo de qualquer resumo por vendedor.
- **Erros comuns:** só `=ÚNICO(A2:A8)` → aceitar, mas avisar: "Certo! Para ordem alfabética, coloque CLASSIFICAR em volta."
- **Vídeo:** fechar o módulo montando um relatório dinâmico: ÚNICO para os vendedores e SOMASE ao lado, usando a referência de transbordamento (F2#).

## Módulo 8 — Casos reais

**Introdução do módulo:** no trabalho, ninguém pede "use o PROCV". Pedem "calcula a comissão do time". Aqui o aluno junta o que aprendeu em situações inteiras, e precisa decidir sozinho quais funções usar. É o módulo mais próximo de um teste de emprego.

### 8.1 — Comissão por faixa

- **Intro:** a mesma tabela de faixas do exercício 4.2, agora para chegar ao valor final da comissão.
- **Desafio:** venda em B2 (12.500); faixas em E2:F5 (0 → 2%; 5.000 → 3%; 10.000 → 5%; 20.000 → 7%). Em C2, calcule o valor da comissão, numa fórmula que possa ser arrastada para os outros vendedores.
- **Resposta:** `=B2*PROCV(B2;$E$2:$F$5;2;VERDADEIRO)` → 625
- **Explicação:** o PROCV acha a taxa (5%) e a multiplicação aplica sobre a venda. A tabela de faixas fica travada com cifrão para a fórmula poder ser arrastada.
- **Erros comuns:** devolver só a taxa → "Isso é a taxa. Multiplique pela venda para chegar ao valor."; tabela sem trava → "Arraste a fórmula: a tabela de faixas precisa ficar travada."
- **Vídeo:** mudar a tabela de faixas (por exemplo, 5% vira 6%) e ver todas as comissões mudarem juntas.

### 8.2 — Controle de estoque

- **Intro:** uma das planilhas mais comuns em pequenas empresas: quanto tenho e quando preciso repor.
- **Desafio:** estoque inicial em B2 (50), entradas em C2 (20), saídas em D2 (45), estoque mínimo em F2 (30). Em E2, calcule o estoque atual; em G2, mostre "Repor" se ele estiver no mínimo ou abaixo, senão "OK".
- **Resposta:** `=B2+C2-D2` → 25; `=SE(E2<=F2;"Repor";"OK")` → Repor
- **Explicação:** o estoque atual é o que havia, mais o que entrou, menos o que saiu. O SE compara com o mínimo. Com formatação condicional, o "Repor" pode ficar vermelho.
- **Erros comuns:** `<` em vez de `<=` → "No mínimo exato também precisa repor."; somar as saídas → "Saídas diminuem o estoque."
- **Vídeo:** montar a planilha completa de estoque em 90 segundos.

### 8.3 — Parcelamento com PGTO

- **Intro:** "12x com juros" — quanto fica cada parcela, e quanto você paga a mais?
- **Desafio:** valor de 3.200 em B1, juros de 2% ao mês em B2, 12 parcelas em B3. Em B4, calcule a parcela.
- **Resposta:** `=PGTO(B2;B3;-B1)` → 302,59 (aceitar também `=-PGTO(B2;B3;B1)`)
- **Explicação:** PGTO(taxa; número de parcelas; valor presente). O Excel trata dinheiro que sai como negativo, por isso o sinal de menos. No total, são 3.631,08 pagos, ou 431,08 só de juros.
- **Erros comuns:** resultado negativo → "O PGTO devolve negativo porque é dinheiro saindo. Coloque um menos na frente do valor."; usar 2 em vez de 2% → "A taxa precisa estar em porcentagem: 2%, ou 0,02."; taxa anual com parcelas mensais → "Taxa e parcelas precisam estar no mesmo período."
- **Vídeo:** comparar à vista vs. parcelado e mostrar quanto custam os juros. Gancho forte para redes sociais.

### 8.4 — Desconto do INSS (tabela 2026)

- **Intro:** o desconto do INSS na folha de pagamento, do jeito que o departamento pessoal calcula: progressivo por faixas e limitado ao teto.
- **Desafio:** salário em B2 (3.500). Tabela do INSS 2026 em E2:G5, com o início de cada faixa, a alíquota e a parcela a deduzir: 0 | 7,5% | 0; 1.621,01 | 9% | 24,32; 2.902,85 | 12% | 111,40; 4.354,28 | 14% | 198,49. Teto em H2 (8.475,55). Em C2, calcule a base (o salário limitado ao teto); em D2, o desconto do INSS.
- **Resposta:** `=MÍNIMO(B2;$H$2)` → 3.500; `=C2*PROCV(C2;$E$2:$G$5;2;VERDADEIRO)-PROCV(C2;$E$2:$G$5;3;VERDADEIRO)` → 308,60
- **Explicação:** o cálculo oficial é progressivo: cada alíquota incide só sobre a parte do salário dentro da sua faixa (7,5% sobre os primeiros 1.621,00, 9% sobre o trecho seguinte, e assim por diante). A parcela a deduzir é o atalho que dá o mesmo resultado: base × alíquota da faixa − parcela. Para 3.500: 3.500 × 12% − 111,40 = 308,60. O MÍNIMO aplica o teto: acima de 8.475,55, o desconto para em 988,09.
- **Erros comuns:** aplicar 12% sobre o salário inteiro (420) → "Assim você cobra 12% até da parte que está nas faixas de 7,5% e 9%. Subtraia a parcela a deduzir."; esquecer o teto → "Um salário de 10.000 descontaria 1.201,51, acima do máximo de 988,09. Limite a base ao teto com MÍNIMO."; tabela sem trava → "Trave a tabela com cifrão para poder arrastar."
- **Aviso no app:** valores da tabela do INSS de 2026 para empregados, domésticos e avulsos, fixos por enquanto. A tabela muda todo janeiro: atualizar o exercício e o validador quando sair a de 2027.
- **Vídeo:** desenhar as quatro faixas e mostrar por que quem ganha 3.500 paga 8,8% de INSS, e não 12% (a alíquota efetiva).
