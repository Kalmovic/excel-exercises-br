import { expect, test } from "@playwright/test";
import funcoes from "../src/content/funcoes.json";

test("índice de funções: busca, filtro por categoria, página da função e Pratique", async ({ page }) => {
  await page.goto("/funcoes");
  await expect(page.getByRole("heading", { level: 1, name: "Funções de A a Z" })).toBeVisible();
  const itens = page.getByTestId("item-funcao");
  await expect(page.getByTestId("contagem-funcoes")).toHaveText("95 funções");

  // Busca pelo nome em inglês.
  await page.getByTestId("busca-funcoes").fill("vlookup");
  await expect(itens).toHaveCount(1);
  await expect(itens.first()).toContainText("PROCV");

  // Filtro de categoria + busca em português: só as de busca começando com PROC (PROCURAR é de texto).
  await page.getByTestId("busca-funcoes").fill("proc");
  await page.getByTestId("categoria-busca").click();
  await expect(page.getByTestId("categoria-busca")).toHaveAttribute("aria-pressed", "true");
  await expect(itens).toHaveCount(3);
  await expect(page.getByTestId("contagem-funcoes")).toHaveText("3 funções");
  await expect(itens.filter({ hasText: "PROCURAR" })).toHaveCount(0);

  await itens.filter({ hasText: "PROCV" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/funcoes\/procv$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PROCV no Excel: para que serve e como usar");
  await expect(page.getByTestId("exemplo-formula")).toHaveText('=PROCV("P-03";A2:C5;3;FALSO)');
  await expect(page.getByTestId("exemplo-tabela").locator('[data-celula="E2"]')).toHaveText("R$ 9,90");
  await expect(page.getByRole("heading", { name: "Cuidados e erros comuns" })).toBeVisible();

  // Pratique: a primeira é a lição grátis do módulo de busca.
  const pratique = page.getByTestId("pratique").getByRole("link");
  await expect(pratique.first()).toContainText("Grátis");
  const href = await pratique.first().getAttribute("href");
  expect(href).toMatch(/^\/exercicios\//);
  await pratique.first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByTestId("grade").filter({ visible: true })).toBeVisible();
});

test("página de função: HTML indexável com JSON-LD, canonical e no sitemap", async ({ request }) => {
  const html = await (await request.get("/funcoes/somase")).text();
  expect(html).toContain("SOMASE no Excel: para que serve e como usar");
  expect(html).toContain('"@type":"TechArticle"');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain('name="description"');
  const indice = await (await request.get("/funcoes")).text();
  expect(indice).toContain("/funcoes/cont-se");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/funcoes</loc>");
  expect(sitemap).toContain("/funcoes/procv</loc>");
});

test("função que não existe mostra a página de erro", async ({ page }) => {
  // Com cacheComponents a rota dinâmica responde em streaming: o status pode ser 200, mas a tela é a do 404.
  await page.goto("/funcoes/nao-existe");
  await expect(page.getByTestId("tela-erro")).toContainText("Esta página não existe");
});

test.describe("no celular", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("o índice e todas as páginas de função cabem na largura (sem rolagem horizontal)", async ({ page }) => {
    test.setTimeout(120_000);
    for (const caminho of ["/funcoes", ...funcoes.map((f) => `/funcoes/${f.slug}`)]) {
      await page.goto(caminho);
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sobra, caminho).toBeLessThanOrEqual(0);
    }
  });
});
