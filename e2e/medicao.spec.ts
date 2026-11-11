import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

test("404 na marca", async ({ page }) => {
  const r = await page.goto("/pagina-que-nao-existe");
  expect(r?.status()).toBe(404);
  await expect(page.getByTestId("tela-erro")).toContainText("Esta página não existe");
  await expect(page.getByRole("link", { name: "Ir para a trilha" })).toBeVisible();
});

test("erros do navegador chegam em /api/erros", async ({ page, request }) => {
  const r = await request.post("/api/erros", { data: { mensagem: "teste", contexto: "e2e", url: "/" } });
  expect(r.status()).toBe(204);
  expect((await request.post("/api/erros", { data: "isto não é json" })).status()).toBe(400);

  // um erro de JavaScript na página é enviado automaticamente
  await page.goto("/trilha");
  const enviado = page.waitForRequest((req) => req.url().endsWith("/api/erros") && req.method() === "POST");
  await page.evaluate(() => setTimeout(() => {
    throw new Error("erro de teste do e2e");
  }));
  // sendBeacon não expõe o corpo ao Playwright; a linha aparece no log do servidor.
  expect((await enviado).method()).toBe("POST");
});

test("progresso grava dicas vistas e tempo ativo", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/exercicios/soma-total-de-vendas");
  await page.getByRole("button", { name: "Ver dica" }).click();
  await page.getByRole("button", { name: /Próxima dica/ }).click();
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem("excel-br:progresso:v1") ?? "{}")["soma-total-de-vendas#1"]); // questão 1 da lição
  expect(p.dicasVistas).toBe(2);
  expect(p.tempoMs).toBeGreaterThan(0);
});
