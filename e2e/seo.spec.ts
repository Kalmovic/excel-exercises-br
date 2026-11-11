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

test.describe("exercício sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("o HTML já traz o enunciado e os dados da planilha", async ({ page }) => {
    await page.goto("/exercicios/soma-total-de-vendas");
    const previa = page.getByTestId("previa-exercicio");
    await expect(previa).toContainText("calcule o total vendido no semestre");
    await expect(previa).toContainText("Somar uma coluna inteira com uma fórmula só");
    const grade = page.getByTestId("grade-estatica");
    await expect(grade.getByRole("columnheader", { name: "B" })).toBeVisible();
    await expect(grade).toContainText("R$ 1.200,00");
    await expect(page.getByText("Carregando planilha…", { exact: true })).toHaveCount(0);
  });
});

test("a grade não pula quando o simulador substitui a prévia", async ({ browser }) => {
  const semJs = await browser.newContext({ javaScriptEnabled: false });
  const p1 = await semJs.newPage();
  await p1.goto("/exercicios/soma-total-de-vendas");
  const antes = await p1.getByTestId("grade-estatica").boundingBox();
  await semJs.close();

  const comJs = await browser.newContext();
  const p2 = await comJs.newPage();
  await p2.goto("/exercicios/soma-total-de-vendas");
  const grade = p2.getByTestId("grade").filter({ visible: true });
  await expect(grade).toBeVisible();
  await expect(p2.getByTestId("previa-exercicio")).toHaveCount(0);
  const depois = await grade.boundingBox();
  await comJs.close();

  expect(antes && depois).toBeTruthy();
  expect(Math.abs(antes!.y - depois!.y)).toBeLessThanOrEqual(4);
  expect(Math.abs(antes!.width - depois!.width)).toBeLessThanOrEqual(4);
  expect(Math.abs(antes!.height - depois!.height)).toBeLessThanOrEqual(4);
});

test("em teste, o site fica fora dos buscadores", async ({ request }) => {
  const r = await request.get("/");
  expect(r.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(await r.text()).toMatch(/<meta name="robots" content="noindex, nofollow"/);
});
