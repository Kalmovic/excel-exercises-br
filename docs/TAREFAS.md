# Tarefas: auditoria de 11/11/2026

Auditoria do projeto inteiro (código, build, navegador em desktop e celular, modo dev). Cada tarefa traz a evidência, o que fazer, onde mexer e o critério de pronto. A ordem dentro de cada bloco é a ordem de execução sugerida.

Como conferir qualquer tarefa: `npm test`, `npx eslint src e2e`, `npm run build`, `npm run e2e`.

## Resumo

- O produto funciona de ponta a ponta para o caminho feliz, e a base (motor pt-BR, correção, testes) é sólida.
- Há **2 bugs graves** que os testes não cobriam: a planilha quebra ao voltar para um exercício, e `npm run dev` não funciona (P0-1). A landing também estoura a largura no celular (P0-2).
- O que separa o estado atual de "pronto para vender": contas e pagamento, conteúdo (existem 15 de ~65 exercícios e os desafios acabam em 23/11), medição (não há analytics nem CI) e a parte legal.
- O SEO, que é o canal de aquisição do plano, ainda não existe na prática: as páginas de exercício chegam ao Google como "Carregando planilha…" e não há páginas de função.

---

## P0: bugs (todos corrigidos em 11/11/2026)

Os seis itens abaixo foram corrigidos, cada um com teste em `e2e/bugs.spec.ts` (e `e2e/dev.spec.ts` para o modo dev). As descrições ficam como registro.

Diferenças em relação ao que a tarefa pedia:

- **P0-1:** em vez de recriar a planilha ao voltar, o motor deixou de ser destruído no cleanup do efeito (a instância vai para o coletor de lixo quando some a referência). É mais simples e preserva o que o aluno digitou.
- **P0-2:** corrigido o estouro e criado o menu de celular. A revisão visual seção por seção em 360/768 px não foi feita; o teste garante só que não há rolagem horizontal em 375 px.

### P0-1. A planilha quebra ao voltar para um exercício, e o modo dev não funciona

- **Evidência:** abrir `/exercicios/soma-total-de-vendas`, clicar em "Trilha" no cabeçalho e apertar voltar: a grade some e o console mostra `Cannot read properties of undefined (reading 'getCell')`. Em `npm run dev`, o mesmo erro aparece já no primeiro carregamento.
- **Causa:** `Simulador.tsx:111`, `useEffect(() => () => planilha.destruir(), [planilha])`. O Next (Cache Components) esconde a página em vez de desmontar e desfaz os efeitos; o StrictMode do dev faz o mesmo na montagem. O HyperFormula é destruído, mas o estado `nucleo` continua apontando para a instância morta.
- **Fazer:** tornar o efeito simétrico. Opção recomendada: `Planilha` ganha `destruida` (getter); no setup do efeito, se estiver destruída, `setNucleo(montar(ex, !admin))`. O progresso volta do `localStorage`; no admin, perde-se o rascunho (aceitável). Revisar todos os `useEffect` de `components/` com a mesma lente (o do mapa já foi corrigido assim).
- **Pronto:** e2e novo "sair do exercício por link, voltar, digitar fórmula e verificar"; mesmo teste para `/desafio`; `npm run dev` abre um exercício e aceita `=SOMA(B2:B7)`. Adicionar ao e2e um projeto que roda contra `next dev` para pegar regressões de StrictMode.

### P0-2. Landing estoura a largura no celular e o cabeçalho perde a navegação

- **Evidência:** iPhone 13 (390 px): `scrollWidth` da landing = 539, o texto do hero é cortado à direita. `header nav` tem 0 links visíveis no celular; "Entrar" também some.
- **Causa:** o card "Experimente agora" contém a grade de largura fixa (435 px) sem `min-w-0`/`overflow-x-auto` no item do grid. A navegação é `hidden md:flex` sem alternativa.
- **Fazer:** `min-w-0` nas colunas do hero e rolagem horizontal só dentro do card; menu de celular (`<details>` ou botão) com os mesmos links; revisar todas as seções da landing em 360, 390 e 768 px.
- **Pronto:** e2e em viewport de celular garantindo `scrollWidth <= clientWidth` em `/`, `/trilha`, `/desafio`, `/pro`, `/excel-basico-para-iniciantes`; menu abre e navega.

### P0-3. "Recomeçar" no desafio apaga o histórico de tentativas

- **Evidência:** em `/desafio`, errar duas vezes, clicar em Recomeçar e acertar: o card mostra "🟩 Resolvido de primeira!".
- **Causa:** `reiniciar` chama `progresso.apagar(slug)`, que leva junto `historico` e `tentativas`.
- **Fazer:** no modo desafio, Recomeçar limpa só a grade e mantém `historico`/`tentativas`.
- **Pronto:** e2e cobrindo o caso; o card mostra "🟨🟨🟩 Resolvido na 3ª tentativa".

### P0-4. Erro de sintaxe vira "#ERROR!" sem explicação

- **Evidência:** `=SOMA(B2:B7` ou `=SOMA(B2:B7)+` grava `#ERROR!` na célula. Esse erro não existe no Excel (que recusa a fórmula com um aviso) e está em inglês.
- **Fazer:** em `Planilha.definir`, validar a fórmula antes de gravar (`hf.validateFormula` ou detectar `ErrorType.ERROR` e desfazer). Recusar como já se faz com nome em inglês, com mensagem específica: parêntese sem fechar (contar parênteses fora de aspas), fórmula terminando em operador, aspas sem fechar, e um genérico "Há um problema com esta fórmula".
- **Pronto:** testes unitários por caso em `formula.test.ts`; nenhuma célula consegue exibir `#ERROR!`.

### P0-5. Colar do sistema não funciona na grade

- **Evidência:** com `=SOMA(B2:B7)` na área de transferência, Ctrl+V numa célula (sem estar editando) não faz nada. Ctrl+C também não copia para fora. Ctrl+X não existe.
- **Causa:** `Grade.tsx` intercepta Ctrl+C/V e usa só a área de cópia interna.
- **Fazer:** tratar o evento `paste` no input da grade: se não há cópia interna ativa, usar o texto do sistema (uma célula; se vier com tabs/quebras, preencher o bloco). Ctrl+C grava também no sistema (`navigator.clipboard.writeText` com o bruto, separado por tab). Ctrl+X = copiar + limpar. Manter o bloqueio de colar do campo de resposta.
- **Pronto:** e2e com permissão de clipboard nos três atalhos.

### P0-6. Card do desafio na trilha usa versão fixa e o relógio do navegador

- **Evidência:** `PainelTrilha.tsx:21`, `progresso.ler(\`desafio-${hoje}\`, 1)` com `hojeSP()` do cliente.
- **Fazer:** a página `/trilha` passa do servidor a data de hoje, o número e a versão do desafio (a parte de data precisa ficar atrás de `Suspense` + `connection()`, como em `/desafio`).
- **Pronto:** teste com `DESAFIO_HOJE` fixo mostrando "#3" e o estado certo.

---

## P1: o que falta para vender

### P1-1. CI no GitHub Actions (feito em 11/11/2026)

Workflow em `.github/workflows/ci.yml`: lint, tipos, testes unitários, build e e2e (com o projeto em modo dev) a cada push na `main` e em todo pull request; `test-results/` vira artefato quando falha. Pendente: ligar a proteção de branch exigindo o CI verde (Settings → Branches no GitHub).

- **Evidência:** não existe `.github/`. Os 239 testes e os 28 e2e só rodam quando alguém lembra.
- **Fazer:** workflow em push e PR: `npm ci`, `eslint`, `tsc`, `vitest`, `next build`, `playwright` (com `npx playwright install chromium`). Publicar o relatório do Playwright como artefato quando falhar.
- **Pronto:** selo verde no `main`; um PR com teste quebrado é barrado.

### P1-2. Analytics e monitoramento de erros (feito em 11/11/2026, com ressalvas)

Feito: `@vercel/analytics` (visitas) + `src/lib/eventos.ts` com os eventos tipados do funil, ligados nos componentes; erros do navegador (`window.error`, promessas rejeitadas, `error.tsx`, `global-error.tsx`) vão para `/api/erros`, que grava uma linha JSON `erro_cliente` no log da Vercel; 404 e página de erro na marca; dicas vistas e tempo ativo gravados no progresso.

Pendente (precisa de você): ativar Analytics no painel da Vercel. Eventos personalizados da Vercel podem exigir plano pago; se for o caso, trocar o destino em `src/lib/eventos.ts` (Plausible ou PostHog). Para alertas de erro, trocar `/api/erros` por Sentry quando houver volume.

- **Evidência:** nenhum script de medição. A métrica do roadmap ("conversão no fim do Intro; se baixa, reabrir Fundamentos") hoje não pode ser calculada. O bug P0-1 estava em produção sem ninguém saber.
- **Fazer:** Vercel Analytics ou Plausible (sem cookies, dispensa banner) + Sentry (ou equivalente) para erros de cliente. Um módulo `lib/eventos.ts` com eventos tipados: `exercicio_aberto`, `verificou {ok, tentativa, motivo}`, `dica_vista`, `pulou`, `modulo_concluido`, `desafio_concluido {tentativas}`, `compartilhou`, `upsell_clicou {origem}`, `cta_landing`. Gravar também dicas vistas e tempo no progresso (o nivelamento vai precisar).
- **Pronto:** funil landing → 1º exercício → fim do Intro → clique no upsell visível no painel; erro de JS forçado aparece no monitor.

### P1-3. Contas, salvar progresso e paywall

- **Fazer:** a Fase 3 do plano (aba Plano do doc): Supabase Auth (link mágico + Google), tabelas com RLS, migração do `localStorage` (`excel-br:progresso:v1`, `trofeus:v1`, `preferencias:v1`) no primeiro login, `usuarioEhPro()` de verdade (`src/lib/acesso.ts`), admin como papel na conta (`src/lib/admin.ts`).
- **Pronto:** os critérios da Fase 3 do plano, em especial: usuário grátis não obtém conteúdo Pro por nenhuma rota (teste com curl e o token dele).

### P1-4. Pagamento

- **Fazer:** Stripe Checkout (cartão recorrente + Pix avulso de 1, 6 ou 12 meses), webhook com assinatura verificada e idempotência, `acesso_ate`, portal do cliente, reconciliação diária. Detalhes na seção de backend do plano.
- **Pronto:** testado com `stripe listen`, incluindo evento repetido e fora de ordem; acesso só depois do webhook.

### P1-5. Conteúdo (a maior lacuna)

- **Evidência:** existem 15 exercícios (Intro 10, Fundamentos 5) e 14 desafios. A landing promete 9 módulos. **Os desafios acabam em 23/11/2026**; em 24/11 a página fica vazia.
- **Fazer, nesta ordem:**
  1. ~~Desafios de 24/11 a 31/12~~ **Feito:** 52 desafios até 31/12/2026 (`2026-12.json`), com temas de Black Friday, 13º, festas e fechamento do ano. **Próximo lote (janeiro) precisa entrar antes de 01/01/2027.** O motor não tem MÉDIASES: use SOMASES/CONT.SES.
  2. ~~Completar Fundamentos até ~8~~ **Feito:** porcentagem do total, ARRED e referência mista (8 exercícios).
  3. ~~Módulos 2 a 8~~ **Feito:** 7 exercícios cada em `src/content/modulos/*.json` (49 no total). Grátis: o 1º de cada módulo e os de nível 1; o resto é `pro`, mas fica aberto enquanto `PAYWALL_ATIVO` (`src/lib/acesso-conteudo.ts`) for false. Ao ligar o paywall, mover o conteúdo Pro para o banco (P4-6).
  4. Antes do Módulo 6: HOJE com data fixa (`hojeFixo`) e DATADIF com unidade minúscula. Antes do 7: FILTRO com várias colunas (plugin). Ver `docs/FASE-0.md`.
  5. Conferir a matriz e uma amostra dos exercícios num Excel pt-BR real.
- **Pronto:** cada exercício passa no teste de conteúdo; `MODULOS` e `MODULOS_PLANEJADOS` unificados numa lista só (hoje são duas, em `content/index.ts` e `content/modulos-pro.ts`).

### P1-6. A landing promete o que não existe

- **Evidência (em `src/app/page.tsx`):** `[PREÇO]/mês` e `[PREÇO ANUAL]` literais; selo "Pro · 1º exercício grátis" em Fundamentos, que é grátis; "Exercício 1 de 10" num exercício de demonstração; "ofensiva de 12 dias" sem ofensiva existir; "Assinar o Pro" leva a "em breve"; FAQ promete cancelamento sem fidelidade; `/termos` e `/privacidade` são provisórias.
- **Fazer:** definir o preço (ver N-1); até o Pro existir, trocar "Assinar o Pro" por lista de espera (P1-7) e tirar o que é falso. Alternativa mais segura enquanto está em teste: `robots` com `noindex` no site inteiro, removido no lançamento.
- **Pronto:** nenhuma afirmação da landing é falsa no dia em que o site for divulgado.
- **Feito (parcial):** sem placeholders de preço; Pro aparece como "em construção"; Intro e Fundamentos marcados grátis e os demais "em breve"; sem ofensiva nem teste de nível; FAQ de cancelamento trocado por "Quanto custa?". Preço definido: R$ 30/mês (cartão recorrente ou mês avulso no Pix) ou R$ 27/mês no anual (R$ 324, 10% off), em `PRECO` (`src/lib/site.ts`); a landing mostra o de R$ 27. Site inteiro com `noindex` (meta + `X-Robots-Tag`) até `INDEXAR_SITE=1` na Vercel. **Falta:** lista de espera (P1-7) e termos/privacidade reais (P1-8).

### P1-7. Captura de e-mail (lista de espera do Pro)

- **Fazer:** formulário em `/pro` e no upsell do desafio, gravando numa tabela do Supabase (ou serviço de formulário enquanto não houver banco), com consentimento explícito e link de descadastro.
- **Pronto:** e-mail de teste aparece na base; texto de consentimento revisado.

### P1-8. Legal e marca

- **Fazer:** termos de uso e política de privacidade reais (LGPD: quais dados, base legal, retenção, contato); CNPJ e emissão de nota para cobrar; **decisão da GPL** antes de abrir ao público (repositório público sob GPLv3, licença comercial do HyperFormula, ou motor próprio); registro no INPI e domínio (`planilhes.com.br` e a forma com acento).
- **Pronto:** as três decisões registradas no doc do plano e as páginas publicadas.

---

## P2: SEO (o canal de aquisição do plano)

### P2-1. Página de exercício chega ao Google vazia

- **Evidência:** sem JavaScript, `/exercicios/soma-total-de-vendas` mostra só o título e "Carregando planilha…". O enunciado e a tabela vivem dentro do simulador, que é `ssr: false`.
- **Fazer:** renderizar no servidor o enunciado e uma tabela estática dos dados iniciais (reaproveitar a montagem de `desafio/[data]/page.tsx`, extraindo um componente `TabelaEstatica`), e hidratar o simulador por cima. Isso também melhora o tempo até aparecer conteúdo.
- **Pronto:** teste sem JS encontra o enunciado e os dados; sem salto visível na hidratação.
- **Feito:** `src/components/previa/` (`montarGrade`, `GradeEstatica`, `PreviaExercicio`). `SimuladorCarregavel` aceita `previa` e a mostra até o motor carregar. Usado em exercícios, desafio do dia e guia de iniciantes; a página de solução reaproveita `GradeEstatica`. Testes em `e2e/seo.spec.ts` (sem JS e sem salto).

### P2-2. Páginas de função

- **Evidência:** `/funcoes` é uma página "em breve". Era o principal canal previsto ("como usar PROCV").
- **Fazer:** `/funcoes/[slug]` com SSG, no modelo de `/excel-basico-para-iniciantes`: sintaxe em pt-BR, exemplo, erros comuns (#N/D etc.), FALSO x VERDADEIRO, exercício nível 1 embutido, convite para o módulo. Começar por PROCV, SE, SOMASE, CONT.SE, PROCX, ÍNDICE/CORRESP. Índice em `/funcoes`.
- **Pronto:** HTML com o texto sem JS; JSON-LD; todas no sitemap.

### P2-3. Detalhes

- Imagem Open Graph (padrão e, no desafio, uma por dia com o número) para o link ficar bonito no WhatsApp.
- JSON-LD nas soluções do desafio; `lastModified` real no sitemap (hoje é "agora" em toda requisição).
- Decidir a contradição: o arquivo é Pro, mas cada solução é pública e indexável.
- Adiar o carregamento do motor no hero até o card ficar visível ou receber foco (o chunk do motor tem 824 KB; hoje baixa em toda visita à landing).
- Fontes: 16 arquivos `woff2` (392 KB). Importar só o subconjunto latino e os pesos usados.

---

## P3: simulador (o que mais melhora o aprendizado)

1. ~~**Autocompletar de funções e dica de argumentos em pt-BR.**~~ **Feito:** catálogo em `src/engine/catalogo.ts` (um teste garante que toda função existe no motor), lógica pura em `src/engine/autocompletar.ts`, interface em `AjudaFormula.tsx`. Tab/Enter escolhe, Esc fecha a lista, acento opcional. IFNA passou a se chamar SENÃODISP, como no Excel BR. Ao digitar `=PRO`, listar PROCV, PROCX…; dentro da função, mostrar `PROCV(valor_procurado; matriz_tabela; núm_índice_coluna; [procurar_intervalo])` com o argumento atual em negrito. É o maior ganho didático isolado.
2. ~~**F4 alterna `$`.**~~ **Feito** (célula e barra de fórmulas; intervalo muda as duas pontas). A dica do exercício 5 manda apertar F4, e a tecla não faz nada no simulador. Ciclo `B2 → $B$2 → B$2 → $B2`.
3. ~~**Referências coloridas.**~~ **Feito:** cores no editor e na barra, contorno na grade, arrastar insere intervalo, setas e Shift+setas apontam (`src/engine/referencias.ts`). Cada referência da fórmula numa cor, com o intervalo correspondente contornado na grade; arrastar o mouse insere intervalo (`B2:B7`), não só uma célula; setas inserem referência quando a fórmula espera uma (modo apontar pelo teclado).
4. ~~**Navegação do Excel:**~~ **Feito:** Ctrl+setas, Home, Ctrl+Home/End, Ctrl+A e clique no cabeçalho (`src/engine/navegacao.ts`). Ctrl+setas (hoje anda uma célula; o Excel vai até a borda dos dados), Home/End, Ctrl+A, clique no cabeçalho seleciona coluna/linha.
5. ~~**Texto longo é cortado.**~~ **Feito:** texto invade as vazias à direita, número que não cabe vira `####`, borda do cabeçalho arrastável e duplo clique ajusta ao conteúdo (`transbordo.ts`). A prévia estática do servidor continua cortando. O Excel deixa o texto invadir células vazias à direita; número que não cabe vira `####`. Permitir arrastar a borda da coluna.
6. ~~**Feedback específico.**~~ **Feito:** `src/grader/diagnostico.ts` (intervalo curto/longo/no cabeçalho/coluna errada, > x >=, PROCV sem FALSO ou coluna errada, função trocada, divisão invertida, ×100, sinal, arredondamento, célula de critério ignorada, $ esquecido, fórmula só com números). A perturbação passou a variar o fator por célula (pegava `=1800/4500`). Comparar a fórmula do aluno com a de referência e dizer o que difere ("seu intervalo vai até B6; falta B7", "você usou > e o enunciado pede >="). É a base barata do tutor de IA.
7. **Desfazer formatação** (Ctrl+Z ignora R$ e %).
8. **Acessibilidade:** `role="grid"` com `aria-activedescendant`, foco preso no modal do troféu, contraste dos textos `zinc-400`/`zinc-500` sobre o fundo bege, alvo de toque das casas.
9. **Celular:** decidir. Sugestão: landing, trilha e páginas de conteúdo 100% no celular; nos exercícios, aviso "melhor no computador" com opção de receber o link por e-mail.
10. **AutoFiltro e gráficos** como tipos novos de exercício (já no roadmap).

---

## P4: engenharia

1. **Refatorar `Simulador.tsx`.** Um componente com quatro modos (trilha, desafio, admin, compacto) e condicionais espalhadas. Extrair `useExercicio(ex, opcoes)` (planilha, store, verificar, persistir) e quatro cascas finas. Trocar o truque `tentativasAteExplicacao: 99` dos desafios por uma política explícita.
2. **Limites de erro:** `error.tsx` e `not-found.tsx` na marca; se o motor falhar ao carregar, mostrar "recarregar" em vez de tela vazia.
3. **Cabeçalhos de segurança** em `next.config.ts` (CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`): hoje nenhum é enviado. Limite de tentativas no login do admin.
4. **Progresso:** exportar/importar backup enquanto não há contas; limpar entradas órfãs; teste de migração de formato.
5. **Admin:** simular a data do desafio (ver `/desafio` como será num dia futuro), validar um JSON de exercício colado, lista com problemas de qualidade (sem dica, sem `variaveis`).
6. **Conteúdo fora do código:** quando houver banco, desafios e exercícios Pro saem do repositório (obrigatório se o repo virar público por causa da GPL).
7. **Aviso do modo dev** em `/exercicios/[slug]`: `params` lido fora de `Suspense` ("instant-shell-url-data"). Não afeta produção (todas as páginas são pré-geradas); resolver com `Suspense` em volta do conteúdo ou `export const instant = false`.
8. **Higiene:** `.env.example` (`ADMIN_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `DESAFIO_HOJE`) e o aviso do Vitest sobre `__dirname`.

---

## N: negócio

1. **Preço.** Sem ele não há landing nem teste de conversão. Levantar o que cobram os cursos de Excel no Brasil e fixar mensal + anual no Pix; decidir se há período de teste.
2. **Ofensiva** (item 3 do roadmap) é a próxima alavanca barata de retenção: contador no navegador agora, lembrete por e-mail depois das contas.
3. **WhatsApp é o canal.** Botão "Compartilhar no WhatsApp" no card do desafio (`wa.me/?text=`), com imagem Open Graph do dia. Hoje só há copiar texto.
4. **Gancho do fim do Intro:** teste de nível + upsell (itens 4 e 6 do roadmap). Hoje o Intro termina numa medalha e num link.
5. **Paywall:** decidido adiar. Reavaliar quando P1-2 mostrar a conversão real no fim do Intro.
6. **Diferencial de conteúdo:** casos brasileiros (INSS por faixa, 13º, MEI, parcelamento com Pix) nos módulos e nos pacotes mensais; é o que um concorrente traduzido não tem.

---

## Ordem sugerida

1. P0-1 a P0-6 (um dia de trabalho, com testes).
2. P1-1 (CI) e P1-2 (medição): tudo o que vem depois depende de saber se quebrou e se converteu.
3. ~~P1-5 item 1 (desafios até dezembro)~~ feito; janeiro antes de 01/01/2027.
4. ~~P2-1 e P1-6~~ feitos (P1-6 depende ainda de preço, lista e legal).
5. ~~P3-1 e P3-2~~ e ~~P1-5 (módulos)~~ feitos.
6. P1-3, P1-4, P1-7, P1-8: contas, pagamento, lista, legal.
7. P2-2 (páginas de função), restante de P3 e P4.
