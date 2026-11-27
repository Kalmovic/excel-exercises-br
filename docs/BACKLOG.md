# Para depois do primeiro lançamento

## Empresas e universidades (B2B)

Está tudo pronto no código (proposta no admin, fatura no Stripe, convite, painel do gestor; ver
`docs/EMPRESAS.md`), mas **fora do ar**: `B2B_NO_AR = false` em `src/lib/site.ts`. Com isso, `/empresas`,
`/universidades`, `/convite/...` e `/empresa` dão 404 e somem do menu, da home, da página do Pro, do sitemap,
dos Termos e da Privacidade. O admin (`/admin/empresas`) continua funcionando.

### Para religar
1. `B2B_NO_AR = true` em `src/lib/site.ts`.
2. Restaurar os testes e2e de antes de esconder: `git show 03d29b1:e2e/empresas.spec.ts > e2e/empresas.spec.ts`
   e o mesmo para `e2e/publicos.spec.ts`.
3. Mudar a data da versão dos Termos e da Privacidade (`VERSAO_DOCUMENTOS` em `src/lib/empresa.ts`): as seções
   de empresas voltam ao texto.

### Antes da primeira universidade (a página `/universidades` já promete)
- [ ] **Cortesia:** botão "Ativar como cortesia" no admin, para o piloto grátis (hoje a organização só fica ativa
      com a fatura paga).
- [ ] **Validade por organização:** piloto de um semestre (6 meses); hoje é fixa em 12 meses.
- [ ] **Nível no começo e no fim:** mostrar no painel do gestor o resultado do teste de nível de cada pessoa, com a
      data (hoje mostra lições, certificados e último acesso).

### Melhorias do B2B
- [ ] Editar vagas e preço da organização no admin (hoje só pelo Table Editor do Supabase).
- [ ] Exportar o painel do gestor em CSV.
- [ ] Convite por lista de e-mails: o gestor cola os e-mails e o site manda o convite e reserva as vagas. Precisa de
      um serviço de envio de e-mail (por exemplo, Resend); hoje só saem os e-mails de login do Supabase.
      Não criar contas pela empresa: o login é por código no e-mail, e a pessoa precisa ver o aviso de que o gestor
      acompanha o progresso antes de entrar (LGPD).
