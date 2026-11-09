# Pratique Excel

Exercícios de Excel no navegador, com fórmulas em português (SOMA, PROCV, SE), separador `;` e decimal com vírgula. Correção instantânea, no cliente.

Status: **Fase 1** (simulador + 5 exercícios do Módulo 1, progresso em `localStorage`, sem backend). O spike do motor está documentado em [docs/FASE-0.md](docs/FASE-0.md).

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # matriz pt-BR do motor + validação dos exercícios
npm run build
```

## Estrutura

```text
src/
├─ engine/        adapter do HyperFormula: idioma pt-BR, plugins, formatação, análise de fórmulas
├─ grader/        correção: valor, funções exigidas, anti-valor-digitado (perturbação)
├─ content/       schema Zod + exercícios grátis (free/*.json)
├─ components/
│  └─ simulador/  Grade, BarraFormulas, PainelExercicio, store (Zustand)
├─ lib/           progresso (localStorage)
└─ app/           páginas Next.js (home e /exercicios/[slug], geradas estaticamente)
```

## Escrever um exercício

1. Crie `src/content/free/NN-slug.json` seguindo `src/content/schema.ts`.
2. Registre em `src/content/index.ts`.
3. `npm test`: a `solucaoReferencia` de cada alvo precisa produzir o `esperado` e passar na correção.

Só conteúdo grátis entra neste repositório. O conteúdo pago (Fase 3) virá do banco, protegido por RLS.

## Simulador: teclas

Enter / Shift+Enter, Tab / Shift+Tab, setas (Shift estende a seleção), F2 edita, Esc cancela, Delete apaga, Ctrl+C / Ctrl+V, Ctrl+D (preencher para baixo), Ctrl+R (para a direita), Ctrl+Z / Ctrl+Y. Clicar numa célula enquanto digita uma fórmula insere a referência. A alça verde no canto da seleção copia a fórmula arrastando.

## Licença

Usa [HyperFormula](https://hyperformula.handsontable.com/) sob GPLv3 (`licenseKey: "gpl-v3"`). Ver a discussão de licença em docs/FASE-0.md.
