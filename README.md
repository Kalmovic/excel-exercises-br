# Pratique Excel

Exercícios de Excel no navegador, com fórmulas em português (SOMA, PROCV, SE), separador `;` e decimal com vírgula. Correção instantânea, no cliente.

Status: **Fase 1.5**: Módulo 0 (Intro, 10 exercícios) e Módulo 1 (Fundamentos, 5 exercícios), progresso em `localStorage`, sem backend. O spike do motor está documentado em [docs/FASE-0.md](docs/FASE-0.md).

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # matriz pt-BR do motor, validadores e validação dos exercícios
npm run build
npm run e2e     # Playwright contra o build (precisa do build antes)
```

## Estrutura

```text
src/
├─ engine/        adapter do HyperFormula: idioma pt-BR, plugins, formatação, análise de fórmulas
├─ grader/        correção: `corrigir` despacha por tipo; validadores/ tem um validador puro por tipo
├─ content/       schema Zod (union por `type`), módulos (index.ts) e exercícios grátis (free/, free/intro/)
├─ components/
│  └─ simulador/  Grade, BarraFormulas, PainelExercicio, store (Zustand)
├─ lib/           progresso (localStorage)
└─ app/           páginas Next.js (home e /exercicios/[slug], geradas estaticamente)
```

## Escrever um exercício

1. Crie o JSON em `src/content/free/` seguindo `src/content/schema.ts`.
2. Registre em `src/content/index.ts` (o módulo vem do campo `modulo`; a ordem, de `ordem`).
3. `npm test`. Exercícios de fórmula: a `solucaoReferencia` precisa produzir o `esperado`. Outros tipos: adicione a solução e um erro típico em `src/content/intro.test.ts` (ou num teste equivalente do módulo).

Tipos (`type`):

| Tipo | Corrige |
| --- | --- |
| `formula` (padrão quando `type` não existe) | valor, fórmula obrigatória, funções exigidas, perturbação |
| `text_answer` | resposta digitada no campo acima da grade (`aceitas` + `normalizar`) |
| `click_cell` | célula ativa; `inputMethod: "keyboard"` exige que nenhuma mudança de célula tenha sido feita pelo mouse |
| `select_range` | seleção exata (em qualquer direção) |
| `type_value` | valores digitados |
| `format_cell` | formato aplicado pela barra R$ / % (`ferramentas.formatacao: true`) |

Só conteúdo grátis entra neste repositório. O conteúdo pago (Fase 3) virá do banco, protegido por RLS.

## Simulador: teclas

Enter / Shift+Enter, Tab / Shift+Tab, setas (Shift estende a seleção), F2 edita, Esc cancela, Delete apaga, Ctrl+C / Ctrl+V, Ctrl+D (preencher para baixo), Ctrl+R (para a direita), Ctrl+Z / Ctrl+Y. Clicar numa célula enquanto digita uma fórmula insere a referência. A alça verde no canto da seleção copia a fórmula arrastando.

## Licença

Usa [HyperFormula](https://hyperformula.handsontable.com/) sob GPLv3 (`licenseKey: "gpl-v3"`). Ver a discussão de licença em docs/FASE-0.md.

## Desafio diário

- Página `/desafio`: o "hoje" é calculado no servidor, no fuso de São Paulo, a cada request.
- Os desafios ficam em `src/content/desafios/AAAA-MM.json`, lidos só pelo servidor (`import "server-only"` em `src/content/desafios/index.ts`). O navegador recebe apenas o desafio do dia; um teste e2e confere que nenhum desafio aparece em `.next/static`.
- Soluções comentadas em `/desafio/AAAA-MM-DD`, publicadas só depois que o dia passa (grátis, indexáveis).
- Arquivo `/desafio/anteriores`: **Pro**. A checagem é no servidor (`src/lib/acesso.ts`); sem Pro, a lista nem vai no HTML. Até a Fase 3, ninguém é Pro.
- **Curva da semana:** segunda nível 1, terça e quarta nível 2, quinta e sexta nível 3, fim de semana "caso real" (várias etapas). Cada item tem `nivel` e `caso`; o teste confere a curva pela data.
- **Critério numa célula:** use `grade.alternativas` (ex.: `{"G1": ["Sul", "Nordeste"]}`). A correção troca a célula por essas opções e recusa quem escreveu o critério direto na fórmula.
- **Adicionar um mês:** crie o JSON do mês (um item por dia, sem pular datas, `dicas: []`), inclua o import em `src/content/desafios/index.ts` e rode `npm test`, que confere o calendário, a curva e se cada solução passa.
- Nos testes e2e, `DESAFIO_HOJE` fixa a data (ignorada em produção na Vercel).
