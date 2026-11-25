import { expect, test, type Page } from "@playwright/test";

/*
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

test("convite: explica o Pro da empresa e avisa o que o gestor vê, antes de entrar", async ({ page }) => {
  await page.goto(`/convite/${CODIGO}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Você foi convidado");
  const aviso = page.getByTestId("aviso-gestor");
  await expect(aviso).toContainText("nome");
  await expect(aviso).toContainText("e-mail");
  await expect(aviso).toContainText("progresso");
  await expect(aviso).toContainText("não vê as suas respostas");
  await expect(aviso.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade#empresas");
  // Sem contas neste ambiente: não promete entrar.
  await expect(page.getByTestId("convite-desligado")).toBeVisible();
  await expect(page.getByTestId("entrar-equipe")).toHaveCount(0);
  // Link privado: fora dos buscadores.
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
});

test("convite no celular: sem rolagem lateral", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto(`/convite/${CODIGO}`);
  await expect(page.getByTestId("aviso-gestor")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("painel do gestor: página própria, fora dos buscadores, sem dados sem login", async ({ page }) => {
  await page.goto("/empresa");
  await expect(page.getByTestId("painel-empresa-desligado")).toBeVisible();
  await expect(page.getByTestId("painel-empresa")).toHaveCount(0);
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
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

test("página para empresas: pedir proposta e como funciona", async ({ page }) => {
  await page.goto("/empresas");
  const passos = page.locator("#como-funciona");
  for (const trecho of ["Proposta", "boleto, Pix ou cartão", "Link de convite", "Painel do gestor"]) await expect(passos).toContainText(trecho);
  await expect(page.getByRole("main")).toContainText("R$ 15,00 por pessoa por mês");
  await page.getByRole("link", { name: "Pedir proposta" }).first().click();
  await expect(page).toHaveURL(/#contato$/);
  await expect(page.getByTestId("form-contato").getByRole("button", { name: "Pedir proposta" })).toBeVisible();
});

test("termos e privacidade: licenças para empresas e o que o gestor vê", async ({ page }) => {
  await page.goto("/termos#empresas");
  const termos = page.locator("#empresas");
  for (const trecho of ["Vagas:", "Troca de membro:", "Validade:", "Renovação:"]) await expect(termos).toContainText(trecho);
  await page.goto("/privacidade#empresas");
  const privacidade = page.locator("#empresas");
  await expect(privacidade).toContainText("gestor da equipe");
  await expect(privacidade).toContainText("legítimo interesse");
  await expect(privacidade).toContainText("tela do convite");
});
