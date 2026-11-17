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

### Fase 2: Formatação condicional

- Regras: maior/menor/igual/entre, texto contém, duplicados, top N, "fórmula personalizada" (avaliada pelo motor, com a referência relativa à primeira célula), barras de dados e escala de cores.
- Grade: a cor vem da regra, calculada a cada versão da planilha.
- Correção: `destacadas`, que compara o conjunto de células que ficaram coloridas. Assim, quem escolheu "Maior que 1000" ou a fórmula `=$C2>1000` acerta do mesmo jeito.
- Conteúdo: lições no módulo "Organizar dados" ou num módulo "Visualizar dados" (com gráficos).

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

### Fase 4: Gráficos

- Inserir gráfico da seleção (colunas, barras, linhas e pizza), desenhado em SVG por cima da grade, com título e rótulos.
- Correção: `grafico` (tipo e intervalo da série). Conteúdo conceitual: qual gráfico usar para cada caso, que é tema clássico de concurso.

### Fase 5: Validação de dados

- Lista suspensa (de intervalo ou de itens), número entre, data, e a mensagem de erro quando o valor não é aceito. A seta aparece na célula.
- Correção: `validacao`. Pegadinha clássica: a validação não corrige o que já estava digitado.

### Fase 6: Várias abas

- Schema: `abas: [{ nome, grade }]`, mantendo `grade` como "uma aba só".
- Parser: `Vendas!A1` e `'Base 2024'!A1:C10`. O cálculo passa a usar a chave `aba,linha,coluna`.
- Grade: barra de abas embaixo, e apontar um intervalo de outra aba enquanto se digita a fórmula.
- Progresso: endereços com prefixo (`"Resumo!C2"`); sem `!` continua sendo a primeira aba.
- Conteúdo: consolidação, PROCV em outra aba e resumo mensal. Fica por último porque é a maior mudança no motor.

### Funções novas (em paralelo, baratas)

`LET`, `CORRESPX`, `UNIRTEXTO`, `DIVIDIRTEXTO`, `TOMAR`, `ESCOLHERCOLS`, `AGREGAR`, `VP`, `VF`, `TAXA`, `NPER`, `NÚMSEMANA`, `ARRED.MULT`.

---

## Certificado e página Pro

- `modulosDoEspecialista()` conta **todo módulo que tem teste**. Cada módulo novo entra automaticamente no certificado de Especialista e, com isso, a página Pro passa a mostrar os números novos sozinha.
- **Decidido (17/11/2026):** todo módulo novo com teste entra no Especialista. Ainda não há usuários, então ninguém perde nada; não haverá um "Especialista Avançado" separado.
- Página Pro: uma seção "Além das fórmulas" com prévia jogável da tabela dinâmica (o `ExercicioEmbutido` já existe).

## Como conferir cada fase

`npm test`, `npx eslint src e2e`, `npm run typecheck`, `npm run build`, e e2e cobrindo o fluxo principal da ferramenta (aplicar, desfazer, recarregar a página e o estado voltar).
