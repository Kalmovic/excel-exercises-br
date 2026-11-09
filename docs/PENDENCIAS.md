# Pendências

Itens combinados para depois, em ordem de prioridade.

## Salvar progresso e troféu numa conta

Hoje o progresso e os troféus ficam só no `localStorage` (`src/lib/progresso.ts`): trocar de navegador ou limpar os dados apaga tudo.

- **O quê:** no modal do troféu e na home, oferecer "Salvar meu progresso" com login por e-mail (link mágico).
- **Como:** antecipar a parte de contas da Fase 3: Supabase Auth + tabelas `progresso` e `trofeus` com RLS (cada usuário só lê e escreve as próprias linhas). No primeiro login, enviar o que estiver no `localStorage`.
- **Precisa de:** um projeto Supabase (URL + chave `anon`) configurado como variável de ambiente na Vercel.
- **Chaves do localStorage a migrar:** `excel-br:progresso:v1` e `excel-br:trofeus:v1`.

## Antes do Módulo 6

- Data fixa para HOJE (`hojeFixo`), via plugin.
- Normalizar a unidade de DATADIF (`"m"` → `"M"`). Ver docs/FASE-0.md.
