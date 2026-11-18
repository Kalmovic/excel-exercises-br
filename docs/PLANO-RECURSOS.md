# Plano: recursos do Excel dentro da grade

Objetivo: levar para dentro do simulador as ferramentas do Excel que ainda faltam (classificar e filtrar, formatação condicional, tabela dinâmica, gráficos, validação de dados e abas), cada uma virando conteúdo novo: lições, teste de módulo, certificado e argumento de venda na página Pro.

Decisão: tudo acontece **na grade**, como no Excel. Nada de telas à parte.

---

## A base comum: "recursos" da planilha

Hoje a `Planilha` (`src/engine/engine.ts`) só conhece células: conteúdo, formato e negrito. Todas as ferramentas novas são **estado além das células**: um filtro aplicado, uma regra de cor, uma tabela dinâmica ancorada em F2, um gráfico.

Esse estado ganha um lugar só: `recursos`.

```ts
type Recursos = {
  filtro?: { intervalo: "A1:D20"; criterios: { [coluna]: CriterioFiltro } };
  condicionais?: RegraCondicional[];   // Fase 2
  dinamicas?: TabelaDinamica[];        // Fase 3
  graficos?: Grafico[];                // Fase 4
  validacoes?: ValidacaoDados[];       // Fase 5
};
```

Regras que valem para todas as fases:

1. **Guardar configuração, não resultado.** Um filtro é salvo como "coluna B = Sul", e não como "linhas 3, 5 e 9 escondidas". Isso deixa o progresso pequeno e permite que o servidor refaça o resultado na correção do certificado.
2. **Um schema zod só** (`recursosSchema` em `src/content/schema.ts`), usado em quatro lugares: no conteúdo (o estado inicial do exercício, em `grade.recursos`), no progresso local, no envio do certificado e na correção no servidor.
3. **Ctrl+Z desfaz recursos** do mesmo jeito que desfaz células: o histórico ganha um tipo `"recursos"` com o retrato de antes e de depois.
4. **Correção pelo resultado sempre que der.** Quem chega ao mesmo resultado por outro caminho também acerta.

### O que muda no backend (e por que é pouco)

- **Progresso:** `ProgressoExercicio` ganha o campo opcional `recursos`. Ele é guardado como JSON na coluna `dados` (`jsonb`) do Supabase, então **não há migration**: o banco aceita qualquer formato dentro do JSON. O limite de 32 KB por linha continua bem longe, porque guardamos só configuração.
- **Certificado:** `POST /api/certificado` valida com zod o que chega do navegador. O schema de cada resposta ganha `recursos: recursosSchema.optional()`, e `conferirQuestao` aplica esses recursos antes de corrigir. Isso mantém a regra de ouro de lá: **o servidor não confia no navegador e corrige de novo**.

### Correção: um tipo novo, `"ferramenta"`

Os exercícios de fórmula continuam como estão. Para os de ferramenta entra um tipo novo com uma lista de verificações:

```jsonc
{
  "type": "ferramenta",
  "verificacoes": [
    { "tipo": "valores", "intervalo": "A2:A9", "esperado": [["Carla"], ["Ana"], ...] }, // depois de classificar
    { "tipo": "linhasVisiveis", "intervalo": "A2:D20", "esperado": [3, 5, 9] },          // depois de filtrar
    { "tipo": "filtroAtivo", "coluna": "B" }
  ]
}
```

Cada fase acrescenta os tipos de verificação dela (`destacadas`, `dinamica`, `grafico`…).

---

## Fases

### Fase 1: Organizar dados (classificar, filtrar, SUBTOTAL), feita em 17/11/2026

- **Motor:** `classificar(intervalo, chaves, cabecalho)` reordena as linhas, inclusive as células bloqueadas (os dados do exercício), levando junto formatos e negrito. `filtro` com critérios por coluna (lista de valores marcados e, em seguida, "maior que" etc.). A função `linhaOculta(l)` passa a ser conhecida pelo cálculo.
- **SUBTOTAL** no motor: ignora as linhas escondidas pelo filtro (função 9 = soma, 1 = média, 2/3 = contagens, 4/5 = máx/mín, e as versões 101–111).
- **Grade:** linhas filtradas somem (as posições deixam de ser `ALTURA * linha`), o número da linha fica azul como no Excel, a seta no cabeçalho do filtro abre o menu (Classificar A→Z / Z→A e a lista de valores com "Selecionar tudo"), as setas do teclado pulam as linhas escondidas, e a barra de status mostra "4 de 12 registros encontrados".
- **Barra "Dados"** (com `ferramentas.dados: true`): Filtro (Ctrl+Shift+L), Classificar A→Z e Z→A.
- **Persistência:** `recursos` no progresso. A classificação é guardada como a lista de operações feitas, refeitas na mesma ordem ao restaurar.
- **Conteúdo:** módulo novo "Organizar dados", com lições de classificar, filtrar e SUBTOTAL, e o teste do módulo.

O que entrou: tudo acima, mais 20 exercícios (`src/content/modulos/dados.json`, gerados por script para os esperados saírem calculados), testes de motor (`src/engine/recursos.test.ts`), de conteúdo (`src/content/ferramenta.test.ts`) e e2e (`e2e/dados.spec.ts`).

Ficou para depois:
- Filtro de número e de texto ("Maior que", "Contém"), hoje só há a lista de caixas de seleção.
- Janela "Classificar personalizado" com vários níveis. O schema já aceita até 3 chaves; hoje a UI faz um nível por clique (e a pegadinha da lição 1 ensina a usar isso).
- O filtro aqui reage na hora quando um valor muda; no Excel ele só se reaplica com "Reaplicar". Isso só faz diferença se o aluno editar dados dentro da tabela filtrada.
- A prévia estática do servidor (`montarGrade`) ainda mostra as linhas escondidas pelo filtro inicial, até a página hidratar.

### Fase 2: Formatação condicional, feita em 17/11/2026

- Regras: maior/menor/igual/entre, texto contém, duplicados, top N, "fórmula personalizada" (avaliada pelo motor, com a referência relativa à primeira célula), barras de dados e escala de cores.
- Grade: a cor vem da regra, calculada a cada versão da planilha.
- Correção: `destacadas`, que compara o conjunto de células que ficaram coloridas. Assim, quem escolheu "Maior que 1000" ou a fórmula `=$C2>1000` acerta do mesmo jeito.
- Conteúdo: lições no módulo "Organizar dados" ou num módulo "Visualizar dados" (com gráficos).


O que entrou: menu "Formatação Condicional" como o do Excel (Realçar Regras das Células, Primeiros/Últimos, Barras de Dados, Escalas de Cor, Nova Regra com fórmula, Limpar e Gerenciar Regras), os três estilos prontos do Excel, regra de fórmula relativa à primeira célula (avaliada pelo próprio motor, com a mesma validação de idioma e escrita das células), prioridade da regra mais nova, correção pelo conjunto de células destacadas (`destacadas`) e por `formatoVisual`, e o Módulo 10 com 3 lições e o teste (20 exercícios). Testes: `src/engine/condicional.test.ts`, `src/content/ferramenta.test.ts` e `e2e/condicional.spec.ts`.

Diferenças conscientes e o que ficou para depois:
- "Maior/Menor do que" com número ignora células vazias e de texto. No Excel, vazia conta como 0 e texto é "maior" que qualquer número, o que confunde mais do que ensina.
- Valor da regra digitado, não referência de célula (`=$F$1`). Barras de dados só com mínimo 0 e máximo automático; escala só de 3 cores.
- Formatos personalizados (escolher cor, negrito) e conjuntos de ícones.
- "Limpar Regras das Células Selecionadas" remove a regra inteira que toca a seleção (o Excel recorta o intervalo dela).

### Fase 3: Tabela dinâmica (na grade), feita em 17/11/2026

- Inserir → Tabela dinâmica com a seleção como fonte e uma célula de destino. A tabela aparece na grade, ancorada no destino, e o painel "Campos" fica ao lado (Filtros / Colunas / Linhas / Valores, arrastando os campos).
- As células de saída ficam bloqueadas e podem ser lidas por fórmulas (`=G5*2` funciona). Igual ao Excel, ela **não se atualiza sozinha**: há um botão "Atualizar", o que também vira pegadinha de conteúdo.
- Agregações: Soma, Contagem, Média, Máx e Mín. Total geral e "% do total" ficam para depois.
- Correção: `dinamica`, que compara a configuração e o resultado.
- Conteúdo: módulo próprio, "Tabela dinâmica". É o carro-chefe da página Pro.

O que entrou: cálculo puro em `src/engine/dinamica.ts` (layout compacto do Excel pt-BR: "Rótulos de Linha", "Soma de Valor", "Total Geral", filtros em cima), integração na `Planilha` (saída gravada no motor, bloqueada, lida por fórmulas, fora do progresso), botão "Tabela dinâmica" com a janela de origem/destino, painel "Campos da Tabela Dinâmica" com arrastar e soltar, caixas de seleção e o menu ⋯ (para o celular), correção por configuração com mensagens específicas ("Os valores estão como Soma de Valor…"), e o Módulo 9 com 3 lições e o teste (20 exercícios). Testes: `src/engine/dinamica.test.ts`, `src/components/simulador/dinamica-acoes.test.ts`, `src/content/ferramenta.test.ts` e `e2e/dinamica.spec.ts`.

Diferenças conscientes e o que ficou para depois:
- **Atualiza sozinha.** No Excel, ela só muda com "Atualizar"; aqui acompanha a origem na hora. A lição 1 explica a diferença (é uma pergunta clássica). Para reproduzir o Excel, seria preciso guardar no progresso uma cópia da origem do momento da última atualização.
- **Um campo por área** em Linhas e Colunas, e só um valor quando há Colunas. Dois campos em Linhas (com subtotais) é o próximo passo.
- Classificar e filtrar os itens pela seta de "Rótulos de Linha", "Mostrar valores como % do total", agrupar datas por mês e INFODADOSTABELADINÂMICA.
- O filtro da tabela dinâmica fica no painel, não numa seta na própria grade.

### Fase 4: Gráficos, feita em 17/11/2026

- Inserir gráfico da seleção (colunas, barras, linhas e pizza), desenhado em SVG por cima da grade, com título e rótulos.
- Correção: `grafico` (tipo e intervalo da série). Conteúdo conceitual: qual gráfico usar para cada caso, que é tema clássico de concurso.


O que entrou: botão "Inserir Gráfico" (colunas, barras, linhas, pizza) a partir da seleção ou da região atual; gráfico em SVG flutuando sobre a grade, que acompanha os dados; painel "Design do Gráfico" (tipo, título, rótulos de dados, Alternar Linha/Coluna, intervalo e posição); leitura do intervalo como o Excel (primeira coluna = categorias, primeira linha = séries, e a exceção da coluna de números com cabeçalho, que vira série); correção pelo resultado (categorias e séries), com mensagens para as pegadinhas (linha do Total, alternar, ano virando série, tipo errado); e o Módulo 11 com 3 lições e o teste (20 exercícios). Testes: `src/engine/grafico.test.ts`, `src/content/ferramenta.test.ts` e `e2e/graficos.spec.ts`.

Também entrou uma correção geral: apagar uma célula editável que o exercício trazia preenchida agora é gravado no progresso (`conteudosDoAluno`). Antes, o valor original voltava ao recarregar e na correção do certificado.

Ficou para depois: arrastar e redimensionar o gráfico com o mouse (hoje a posição é um campo), seleção não contígua (Ctrl+clique), títulos de eixo, gráfico de dispersão e combinação, e barras na ordem do Excel (o Excel desenha a primeira categoria embaixo; aqui fica em cima, que é o que a maioria espera).

### Fase 5: Validação de dados, feita em 18/11/2026

- Lista suspensa (de intervalo ou de itens), número entre, data, e a mensagem de erro quando o valor não é aceito. A seta aparece na célula.
- Correção: `validacao`. Pegadinha clássica: a validação não corrige o que já estava digitado.


O que entrou: janela "Validação de Dados" com as três abas do Excel (Configurações com Lista, Número inteiro, Decimal, Data e Comprimento do texto e os oito operadores; Mensagem de entrada; Alerta de erro), aplicar na seleção substituindo a regra das células, Limpar Tudo, a janela abrindo com a regra da célula ativa, recusa da digitação inválida (estilo Parar), setinha da lista na célula ativa, o "post-it" da mensagem de entrada e Circular Dados Inválidos. Correção pelo comportamento (`validacao`: aceita/recusa valores em todas as células, itens da lista, mensagens) e `semInvalidos`. Módulo 12 com 3 lições e o teste (20 exercícios). Testes: `src/engine/validacao.test.ts`, `src/content/ferramenta.test.ts` e `e2e/validacao.spec.ts`.

Diferenças conscientes e o que ficou para depois:
- Só o estilo de alerta "Parar". "Aviso" e "Informação" pedem uma caixa de Sim/Não.
- "Ignorar em branco" fica sempre ligado; a opção "Personalizado" (fórmula) e limites com referência de célula (`=$F$1`) ficaram de fora.
- Colar e a alça de preenchimento passam por cima da validação, como no Excel (a lição 1 ensina isso), mas aqui não levam a regra da origem junto.

### Fase 6: Várias abas, feita em 18/11/2026

- Schema: `abas: [{ nome, grade }]`, mantendo `grade` como "uma aba só".
- Parser: `Vendas!A1` e `'Base 2024'!A1:C10`. O cálculo passa a usar a chave `aba,linha,coluna`.
- Grade: barra de abas embaixo, e apontar um intervalo de outra aba enquanto se digita a fórmula.
- Progresso: endereços com prefixo (`"Resumo!C2"`); sem `!` continua sendo a primeira aba.
- Conteúdo: consolidação, PROCV em outra aba e resumo mensal. Fica por último porque é a maior mudança no motor.


O que entrou: referências `Vendas!B2` e `'Vendas 2025'!B2:B6` no parser; o cálculo com chave "aba:linha,coluna"; a `Pasta` (cada aba continua sendo uma `Planilha`, todas com um cálculo só, avisando umas às outras); `Planilha.deExercicio` devolvendo a primeira aba de uma Pasta, o que deixou correção, progresso e certificado sem mudanças; o progresso das outras abas com o nome na frente ("Vendas!B4"); o nome da aba com a grafia original na barra de fórmulas; copiar fórmula andando a célula e mantendo a aba; checagem anti-valor-digitado perturbando os números de todas as abas; a mensagem para aba com espaço sem aspas; e, na tela, a barra de abas, um store por aba (cada uma lembra a seleção) e o "apontar em outra aba" (clicar ou arrastar insere `Aba!B2:B6` na fórmula e o Enter volta para a origem). Módulo 13 com 3 lições e o teste (20 exercícios). Testes: `src/engine/abas.test.ts` e `e2e/abas.spec.ts`.

Diferenças conscientes e o que ficou para depois:
- Referência 3D (`=SOMA(Jan:Mar!B2)`) e INDIRETO: só aparecem como pergunta conceitual.
- O aluno não cria, renomeia nem exclui abas; as abas vêm do exercício.
- As respostas ficam sempre na primeira aba. Filtro, tabela dinâmica, regras e gráficos funcionam em qualquer aba, mas o progresso guarda os recursos só da primeira.

### Funções novas, feitas em 18/11/2026

No motor, no catálogo (autocompletar e ajuda de argumentos) e na tabela de nomes, que também sugere o nome em português quando o aluno digita o inglês: **LET**, **CORRESPX**, **UNIRTEXTO**, **DIVIDIRTEXTO**, **PEGAR**, **DESCARTAR**, **ESCOLHERCOLS**, **AGREGAR**, **VP**, **VF**, **NPER**, **TAXA**, **NÚMSEMANA** e **MARRED**.

- Os nomes em português foram conferidos no suporte da Microsoft. Duas correções em relação à primeira versão deste plano: TAKE é **PEGAR** (não "TOMAR") e MROUND é **MARRED** (não "ARRED.MULT"). DROP (DESCARTAR) entrou junto, por ser o par de PEGAR.
- O LET mexeu no parser: nomes como `taxa` só valem dentro do LET que os declara. Fora dele, um nome solto continua sendo erro de escrita, como antes.
- Conteúdo: 14 exercícios de prática extra (Busca, Texto, Arrays, Casos, Fundamentos, Datas e Organizar dados), cada um exigindo a função nova.
- Testes: `src/engine/motor/funcoes-novas.test.ts`, com os valores financeiros conferidos contra os do Excel.

Ficou para depois: LAMBDA, JUNTARV/JUNTARH (o nome em português ainda precisa ser conferido), ESCOLHERLINS, AGREGAR com as funções 16 a 19 (percentis e quartis) e o modo de pesquisa binária (2 e -2) do CORRESPX, que aqui funciona como a pesquisa normal.

---

## Certificado e página Pro

- `modulosDoEspecialista()` conta **todo módulo que tem teste**. Cada módulo novo entra automaticamente no certificado de Especialista e, com isso, a página Pro passa a mostrar os números novos sozinha.
- **Decidido (17/11/2026):** todo módulo novo com teste entra no Especialista. Ainda não há usuários, então ninguém perde nada; não haverá um "Especialista Avançado" separado.
- Página Pro: uma seção "Além das fórmulas" com prévia jogável da tabela dinâmica (o `ExercicioEmbutido` já existe).

## Como conferir cada fase

`npm test`, `npx eslint src e2e`, `npm run typecheck`, `npm run build`, e e2e cobrindo o fluxo principal da ferramenta (aplicar, desfazer, recarregar a página e o estado voltar).
