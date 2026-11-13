# Supabase do Planilhês

- `migrations/`: o banco, em ordem. Cada arquivo foi aplicado no projeto pela API de gerenciamento (fica no histórico em Database → Migrations). Nunca edite uma migration já aplicada: crie outra.
- `testes/rls.sql`: testa as regras de RLS com dois alunos falsos e desfaz tudo no fim. Rode no SQL Editor; o resultado esperado é o erro "RLS OK: ...".
- `templates/codigo-de-acesso.html`: o e-mail com o código de login. O mesmo HTML vai em dois modelos do painel (Authentication → Emails): **Confirm signup** (aluno novo) e **Magic Link** (aluno que já tem conta).
