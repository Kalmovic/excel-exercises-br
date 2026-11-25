# Supabase do Planilhês

- `migrations/`: o banco, em ordem. Cada arquivo foi aplicado no projeto pela API de gerenciamento (fica no histórico em Database → Migrations). Nunca edite uma migration já aplicada: crie outra.
- `testes/rls.sql`: testa as regras de RLS com dois alunos falsos e desfaz tudo no fim. Rode no SQL Editor; o resultado esperado é o erro "RLS OK: ...". Os outros arquivos de `testes/` seguem o mesmo padrão (ex.: `empresas.sql` → "EMPRESAS OK: ...").
- `templates/`: e-mails do login (código de 6 dígitos), no visual do site. Vão no painel em Authentication → Emails (só editável depois do SMTP próprio):
  - **Confirm signup** (aluno novo): `confirmar-cadastro.html`, assunto `Seu código para criar a conta no Planilhês`.
  - **Magic Link** (aluno que já tem conta): `codigo-de-acesso.html`, assunto `Seu código de acesso ao Planilhês`.
