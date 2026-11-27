import { expect, test, type Page } from "@playwright/test";

/*
 * Licenças para empresas: FORA DO AR até depois do lançamento (B2B_NO_AR em src/lib/site.ts).
 * Os testes do convite, do painel e das páginas estão no commit 03d29b1 (docs/BACKLOG.md).
 * Licenças para empresas. O servidor dos testes roda SEM Supabase (contas
 * desligadas) e sem Stripe: o convite e o painel mostram o aviso de contas
 * desligadas, e a parte que depende do banco (vagas, membros, remover) é coberta
 * pelos testes do banco (supabase/testes/empresas.sql) e pelos unitários
 * (actions com o Supabase/Stripe falsos e o painel renderizado com dados).
 */

const CODIGO = "0123456789abcdef0123456789abcdef";

async function entrarComoAdmin(page: Page) {
  await page.goto("/admin/entrar");
  await page.getByTestId("senha-admin").fill("senha-de-teste-admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("empresas e universidades fora do ar: páginas dão 404 e somem do menu, da home e do sitemap", async ({ page, request }) => {
  for (const url of ["/empresas", "/universidades", `/convite/${CODIGO}`, "/empresa"]) expect((await request.get(url)).status(), url).toBe(404);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Para empresas" })).toHaveCount(0);
  await expect(page.locator('a[href="/empresas"], a[href="/universidades"]')).toHaveCount(0);
  await page.goto("/pro");
  await expect(page.locator('a[href="/empresas"]')).toHaveCount(0);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/empresas");
  expect(sitemap).not.toContain("/universidades");
});

test("termos e privacidade sem a parte de empresas enquanto ela está fora do ar", async ({ page }) => {
  await page.goto("/termos");
  await expect(page.locator("#empresas")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText("licença de empresa");
  await page.goto("/privacidade");
  await expect(page.locator("#empresas")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText("Membro de equipe");
});

test("admin → empresas: só para o admin", async ({ request }) => {
  const html = await (await request.get("/admin/empresas")).text();
  expect(html).not.toContain("Nova proposta");
  expect(html).toContain("noindex");
});

test("admin → empresas: formulário de proposta valida no servidor", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.getByTestId("admin-empresas").click();
  await expect(page).toHaveURL(/\/admin\/empresas$/);
  await expect(page.getByTestId("empresas-sem-banco")).toBeVisible();
  const form = page.getByTestId("form-proposta");
  // Preço por pessoa por ano já vem com R$ 180 (R$ 15/mês) e o mínimo de 5 pessoas.
  await expect(page.getByTestId("proposta-preco_por_pessoa_ano")).toHaveValue("180");
  await expect(page.getByTestId("proposta-assentos")).toHaveValue("5");

  const preencher = async (cnpj: string) => {
    for (const [campo, valor] of [
      ["nome", "Empresa Teste Ltda"],
      ["cnpj", cnpj],
      ["email_financeiro", "financeiro@empresa.com.br"],
      ["gestor_email", "gestora@empresa.com.br"],
      ["cep", "20090-003"],
      ["logradouro", "Av. Rio Branco"],
      ["numero", "1"],
      ["bairro", "Centro"],
      ["cidade", "Rio de Janeiro"],
      ["uf", "RJ"],
    ])
      await page.getByTestId(`proposta-${campo}`).fill(valor);
  };
  await preencher("11.222.333/0001-80");
  await form.getByRole("button", { name: "Criar proposta" }).click();
  await expect(page.getByTestId("erro-proposta")).toHaveText("CNPJ inválido.");
  // CNPJ certo: passa na validação e só para no banco, desligado neste ambiente.
  await page.getByTestId("proposta-cnpj").fill("11.222.333/0001-81");
  await form.getByRole("button", { name: "Criar proposta" }).click();
  await expect(page.getByTestId("erro-proposta")).toContainText("Banco não configurado");
});
