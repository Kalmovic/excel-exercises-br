import { expect, test } from "@playwright/test";

test("guia de iniciantes tem o texto no HTML (sem JS) e JSON-LD", async ({ request }) => {
  const html = await (await request.get("/excel-basico-para-iniciantes")).text();
  expect(html).toContain("O que é uma célula");
  expect(html).toContain("A barra de fórmulas: o que a célula guarda");
  expect(html).toContain('"@type":"Course"');
  expect(html).toContain('rel="canonical"');
});

test("sitemap e robots", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/excel-basico-para-iniciantes");
  expect(sitemap).toContain("/exercicios/nome-da-celula");
  expect(sitemap).toContain("/exercicios/soma-total-de-vendas");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap:");
});

test("o exercício embutido no guia funciona", async ({ page }) => {
  await page.goto("/excel-basico-para-iniciantes");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-celula="C7"]').click();
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
});
