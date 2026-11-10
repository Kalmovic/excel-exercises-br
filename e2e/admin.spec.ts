import { expect, test, type Page } from "@playwright/test";
import { celula } from "./ajuda";

// O servidor dos testes roda com ADMIN_TOKEN=senha-de-teste-admin e DESAFIO_HOJE=2026-11-12.
const FUTURO = "desafio-2026-11-13";
const TITULO_FUTURO = "Tabela de frete";

async function entrarComoAdmin(page: Page) {
  await page.goto("/admin/entrar");
  await page.getByTestId("senha-admin").fill("senha-de-teste-admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("sem login: admin e exercício futuro não existem para o visitante", async ({ request }) => {
  for (const url of ["/admin", `/admin/exercicios/${FUTURO}`]) {
    const html = await (await request.get(url)).text();
    expect(html).not.toContain(TITULO_FUTURO);
    expect(html).not.toContain("Gabarito");
    expect(html).toContain("noindex");
  }
});

test("senha errada não entra", async ({ page }) => {
  await page.goto("/admin/entrar");
  await page.getByTestId("senha-admin").fill("senha-errada-123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByTestId("erro-admin")).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "excel_admin")).toBeUndefined();
});

test("admin navega por tudo, inclusive desafios futuros, e testa sem salvar progresso", async ({ page }) => {
  await entrarComoAdmin(page);
  const cookie = (await page.context().cookies()).find((c) => c.name === "excel_admin");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.value).not.toContain("senha");

  await expect(page.getByTestId("grupo-Módulo 0: Intro")).toContainText("Qual é o nome desta célula?");
  await expect(page.getByTestId("grupo-Desafio diário")).toContainText(TITULO_FUTURO);
  await expect(page.getByTestId("grupo-Desafio diário")).toContainText("futuro");

  // desafio futuro: preencher a solução e verificar
  await page.getByRole("link", { name: new RegExp(TITULO_FUTURO) }).click();
  await expect(page.getByTestId("painel-admin")).toContainText("ÍNDICE(B2:F6");
  await page.getByTestId("preencher-solucao").click();
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");

  // exercício de outro tipo: clicar na célula (seleção travada) também se resolve
  await page.goto("/admin/exercicios/nome-da-celula");
  await page.getByTestId("preencher-solucao").click();
  await expect(page.getByTestId("campo-resposta")).toHaveValue("E4");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");

  await page.goto("/admin/exercicios/selecionar-intervalo");
  await page.getByTestId("preencher-solucao").click();
  await expect(page.getByTestId("caixa-nome")).toHaveText("B2:D5");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");

  // navegação anterior/seguinte
  await page.getByTestId("admin-seguinte").click();
  await expect(page).toHaveURL(/digitar-um-valor/);
  await celula(page, "B3").click();

  // nada disso entrou no progresso do aluno
  const progresso = await page.evaluate(() => localStorage.getItem("excel-br:progresso:v1"));
  expect(progresso ?? "{}").not.toContain(FUTURO);
  expect(progresso ?? "{}").not.toContain("nome-da-celula");

  // sair
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sair do admin" }).click();
  await expect(page).toHaveURL(/\/$/);
  const html = await (await page.request.get("/admin")).text();
  expect(html).not.toContain(TITULO_FUTURO);
});
