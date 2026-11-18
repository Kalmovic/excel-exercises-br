# Revisão profunda do app (18/11/2026)

Revisão do app inteiro com juízes externos, não autoavaliação. Os relatórios brutos estão em `docs/revisao/relatorios/`:

| Relatório | Método | Juiz |
|---|---|---|
| `persona.md` | Uma advogada sem formação técnica faz as jornadas reais no computador e no celular (Playwright, 228 capturas) | A tela |
| `diferencial.md` | 980 fórmulas calculadas pelo nosso motor e pelo LibreOffice 24.2 (conjunto em `docs/revisao/diferencial/`) | LibreOffice e o Excel 365 conhecido |
| `seguranca.md` | Fuzzing da correção do certificado, leitura das rotas, RLS, Stripe e cabeçalhos | Medições de tempo e memória, `curl` |
| `adversarial.md` | Revisão adversarial do diff, com testes que falham (em `docs/revisao/regressao/`) | Os próprios testes |
| `a11y.md` | axe-core, só teclado, Lighthouse, latência da grade | axe e Lighthouse |
| `conteudo.md` | Professor de Excel e revisor de português, com as contas refeitas | Documentação da Microsoft e aritmética |

## Lacunas, por impacto no usuário

### P0: corrigir antes de lançar

1. **Derrubar o servidor com uma requisição.** Intervalo de formato enorme no envio do teste, guardado no histórico; curingas em CONT.SE que travam a expressão regular; fórmulas sem limite de tamanho (SEQUÊNCIA(3000;3000)). *seguranca.md*
2. **Gabarito público do teste do módulo** e 15 questões de teste que aceitam o valor digitado. Certificado sem estudar. *seguranca.md*
3. **Nenhum exercício dá para concluir só com o teclado.** O Tab fica preso, os botões só respondem ao mouse e o resultado não é anunciado. *a11y.md*
4. **O navegador trava** com DIATRABALHO de dias fracionados. *diferencial.md*
5. **Afirmações falsas no conteúdo** (números das explicações, "o Leste nunca vendeu no Site") e uma questão de teste ambígua. *conteudo.md*

### P1

- **Correção:** filtro correto reprovado depois de classificar (G1); certificado quebra com mais de 30 classificações (S1); PROCV sem FALSO aceito como "Correto!" (persona); mensagens contraditórias na pegadinha de classificação.
- **Motor:** MÉDIA, MÁXIMO e SOMA com células vazias ou de texto; colunas inteiras (`A:A`) recusadas.
- **Teste do módulo:** mostra dicas e permite nova tentativa, mas a nota conta a primeira.
- **Fórmulas sem fechar o parêntese:** o Excel fecha sozinho; nós recusamos.
- **Celular:** a célula ou a tabela dinâmica nascem fora da área visível; o menu do filtro estoura a largura da tela.
- **Segurança:** redirecionamento aberto após o login.

### P2 e P3

Restauração que volta diferente (R1 a R6), motor (vazio exibido como 0, acentos na ordem alfabética, curingas no PROCV exato, modos do PROCX, argumentos omitidos, `2^3^2`, TEXTO), mensagens enganosas, contraste, alvos de toque, re-render de todas as células, cabeçalhos de segurança, limite de requisições, Stripe, cotas no Supabase, 44 questões de múltipla escolha sem dica nas alternativas erradas, números diferentes entre as páginas, asteriscos aparecendo literais.

### Decisões

- **Validação de lista e maiúsculas: não mudar o motor.** A revisão de conteúdo sugeriu que a lista digitada na Fonte diferencia maiúsculas no Excel, mas as fontes que ela citou (perguntas de "como tornar a validação sensível a maiúsculas") sugerem o contrário. Sem confirmação num Excel real, o comportamento atual (sem diferenciar) fica.
- **Barras do gráfico de cima para baixo** (o Excel desenha a primeira embaixo): fica como está. O conteúdo deixa de dizer que é igual ao Excel.

## Arquitetura das correções

Seis frentes, cada uma com **arquivos próprios** para trabalharem em paralelo sem conflito. Os contratos entre elas estão definidos abaixo e nenhuma frente os muda sozinha.

### F1 Servidor e segurança

*Dono de:* `src/app/api/**`, `src/app/auth/**`, `src/components/conta/FormEntrar.tsx`, `next.config.ts`, `src/proxy.ts`, `src/lib/limite.ts` (novo), `src/lib/teste-publico.ts` (novo), `src/app/(app)/teste/[modulo]/page.tsx`, `src/app/(app)/certificado/**`, `supabase/migrations/` (nova migration), `src/lib/pagamento-stripe.ts`.

- **Gabarito fora do navegador.**
  - `exercicioParaTeste(ex)` (em `teste-publico.ts`) devolve o exercício sem segredos e com o mesmo formato de tipo: `alvos[].esperado` vira `0`, `solucaoReferencia` vira `"=0"`; sem `errosComuns`, sem `explicacao` real; `correta` vira `0`; `verificacoes` de ferramenta e `solucao` ficam com placeholders válidos.
  - A página `/teste/[modulo]` envia só isso.
  - Correção pelo servidor: `POST /api/teste/corrigir` com `{ modulo, indice, resposta: RespostaQuestao }` devolve `{ ok: boolean }`. Usa `conferirQuestao`, tem limite de requisições e não exige login (o certificado continua exigindo).
- **Limite de requisições:** `limite.ts` com balde de fichas em memória, por IP e por usuário: certificado, teste/corrigir, contato, erros e login do admin. É por instância, o que é melhor que nada no serverless; documentar.
- **Correções pontuais:** redirecionamento aberto (aceitar só caminhos que, resolvidos contra a origem, continuam na origem); cabeçalhos (CSP, `frame-ancestors 'none'`, nosniff, Referrer-Policy, sem `X-Powered-By`); `/api/erros` com corpo nulo; `decodeURIComponent` no certificado; cookie do admin malformado; o nome do certificado não pode ser trocado depois de emitido; contato sem dados pessoais nos logs.
- **Stripe e Supabase:** conferir o preço/produto; tratar `charge.dispute.created`; migration com limite de tamanho em `perfis.origem` e no número de linhas de `progresso` por usuário.

### F2 Motor de fórmulas

*Dono de:* `src/engine/motor/**` (nucleo, parser, entrada), `src/engine/format.ts`.

- Todos os bugs confirmados de `diferencial.md`, P1 e P2 primeiro, e os P3 que forem baratos.
- Os de `adversarial.md` no motor (F3, TAXA).
- **Curingas sem expressão regular exponencial:** casamento linear com `*`, `?` e `~`, usado também no PROCV, CORRESP e PROCX exatos.
- **Limites de trabalho:** matriz derramada de até 10.000 células (acima disso, `#NÚM!`), REPT e textos até 32.767 caracteres, como o Excel.
- **Regressão:** um teste em `src/engine/motor/diferencial.test.ts` com os casos do conjunto e o valor esperado do Excel.
- **Contrato:** nenhuma mudança de assinatura em `Calculo`, `analisar` ou `lerEntrada`.

### F3 Planilha, correção e restauração

*Dono de:* `src/engine/engine.ts`, `src/engine/{condicional,dinamica,grafico,validacao,classificar,referencias,formula}.ts`, `src/grader/**`, `src/content/schema.ts`.

- **Restauração determinística:** um ponto só, `Planilha.restaurarProgresso({ conteudos, formatos, recursos })`, usado pelo Simulador e pelo servidor. A ordem é: classificações, depois células do aluno, depois o resto dos recursos.
  - As classificações deixam de ser guardadas como a lista de cliques e passam a ser a **permutação de linhas** resultante, uma por intervalo (consecutivas no mesmo intervalo se compõem). Isso resolve S1, R1 e R2.
  - Mantém compatibilidade com o formato `ordenacoes` antigo, aceito na leitura.
- **Classificar e o teste do servidor movem o conteúdo, não o texto:** sem perder o tipo R$ ou a hora (R4/G2), e sem apagar a saída da tabela dinâmica (D2).
- **Ordem dos derivados:** linhas ocultas, depois tabela dinâmica, depois regras (D1).
- **Limites na própria Planilha:** formatar, definir e definirVarias fora da grade são ignorados; histórico limitado também em memória; regras condicionais com orçamento de avaliação.
- **Correção:**
  - `linhasVisiveis` passa a comparar as linhas pelo **conteúdo**, não pelo número (G1).
  - `valores` ganha uma mensagem neutra (M1).
  - Exercício de ferramenta mostra **só a primeira falha**.
  - O PROCV da mensagem da tabela dinâmica deixa de citar uma tela que não existe.
- **Schema:**
  - `errosComuns[].bloqueia?: boolean`: quando a fórmula casa, reprova mesmo com o valor certo, usando a `dica` como mensagem. Contrato com F6.
  - Limites alinhados entre a tela e o schema (S2).
- **Fórmula sem fechar o parêntese:** `definir` fecha os parênteses que faltam no fim, como o Excel.
- **Restante:** R5, R6, F1, F2, A1 e o filtro "(Tudo)" pedido na tabela dinâmica.
- **Regressão:** os testes de `docs/revisao/regressao/` viram testes do repositório.

### F4 Grade e acessibilidade

*Dono de:* `src/components/simulador/{Grade,AreaPlanilha,MenuFiltro,PainelDinamica,PainelGrafico,MenuCondicional,ValidacaoDados,BarraDados,BarraFormatacao,BarraToque,BarraFormulas,GraficoSvg,contexto,store}.tsx/ts`, `src/app/globals.css`.

- **Teclado:**
  - O Tab sai da grade no modo pronto (como o Excel não deixa, aqui vale Ctrl+Tab ou Esc seguido de Tab; o caminho escolhido aparece na lista de atalhos).
  - Botões acionados com `onClick`, mantendo o `preventDefault` no `mousedown` para não roubar o foco.
  - Menus e janelas com papel, nome, Esc para fechar, foco para dentro ao abrir e de volta ao fechar; Alt+↓ abre o filtro e a lista; setas nos menus.
- **Celular:**
  - A célula ativa, a tabela dinâmica recém-criada e o gráfico rolam para a área visível.
  - O menu do filtro fica limitado à largura visível.
  - Alvos de toque de pelo menos 24 px.
- **Contraste** pelas variáveis de cor.
- **Desempenho:** `Celula` memorizada.

### F5 Casca do exercício, teste e páginas

*Dono de:* `src/components/simulador/{Simulador,PainelExercicio,TesteModulo,TextoRico,CampoResposta,Alternativas,PassosLicao}.tsx`, `src/components/conta/**` (exceto FormEntrar), `src/app/(app)/**` (exceto as páginas da F1), `src/app/page.tsx`, `src/components/publico/**`, `src/components/site/**`, `src/components/mapa/**`.

- **Resultado anunciado:** região `role="status"` sempre montada, e o foco não volta para a grade ao errar.
- **Teste do módulo:** uma tentativa, sem dica nem explicação até o fim, sem "último exercício do módulo". A correção vai pelo `POST /api/teste/corrigir` (contrato com F1) e o resultado sobrevive ao recarregar.
- **Recomeçar** não pode dar "Acertou de primeira!".
- **Barra de progresso** conta as etapas feitas.
- **TextoRico** aceita itálico `*texto*`.
- **Certificado:** caminho claro a partir da aprovação, e página sem tela em branco.
- **Números iguais em todas as páginas,** vindos do conteúdo (home com 15 módulos, Pro).
- **Textos de computador no celular;** coluna cortada na amostra do Pro.

### F6 Conteúdo

*Dono de:* `src/content/**/*.json` (só os JSON), `src/content/index.ts` (descrições dos módulos).

- **Todos os P0 a P2 de `conteudo.md`,** com o texto proposto ou um melhor.
- **`variaveis` nas 15 questões de teste** que aceitam o valor digitado. Um teste novo garante que toda questão de teste de fórmula tenha perturbação.
- **`bloqueia: true`** nos PROCV que exigem correspondência exata (contrato com F3).
- **Dicas nas alternativas erradas** das 44 questões de múltipla escolha, e dicas genéricas reescritas.
- **Exercício de DESCARTAR** (a função existe e não é usada).
- **Explicações conferidas:** um teste novo checa que os números em R$ ou % das explicações dos exercícios de fórmula batem com o `esperado` (arredondados como estão escritos).

## Como cada frente entrega

1. **Plano primeiro**, em `docs/revisao/planos/F<n>.md`: os itens, os arquivos, os testes e o que fica de fora, com o porquê.
2. **Implementação** na própria cópia (worktree), commits pequenos.
3. **Testes:** regressão para cada bug, e `npx eslint src e2e`, `npm run typecheck` e `npm test` verdes. F4 e F5 também rodam o e2e afetado.
4. **Fora do escopo:** nada de mexer nos arquivos de outra frente. Se precisar, descreve a mudança no plano para quem é dono.

## Liberação

Junção das frentes, bateria completa (lint, tipos, testes, build, e2e, teste diferencial de novo), revisão adversarial independente das mudanças, a advogada refaz as jornadas e confere as reclamações dela, e PR com o CI verde.
