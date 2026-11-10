import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

test("landing: marca, seções e exercício do hero funcionando", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Planilhês/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprenda a falar");
  await expect(page.getByTestId("modulos-landing")).toContainText("Arrays dinâmicos");
  await expect(page.getByTestId("planos")).toContainText("R$ 0");
  await expect(page.getByTestId("faq")).toContainText("Preciso ter o Excel instalado?");

  const card = page.getByTestId("experimente");
  await celula(page, "B6").click();
  await page.keyboard.insertText("=SOMA(B2:B5)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B6")).toHaveText(/1\.050,00/);
  await card.getByRole("button", { name: "Conferir" }).click();
  await expect(card.getByTestId("resultado")).toContainText("Correto!");
  await expect(card.getByRole("link", { name: /Continuar na trilha/ })).toHaveAttribute("href", "/trilha");
});

test("links da landing levam a páginas que existem", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  for (const href of hrefs) {
    const r = await request.get(href.split("#")[0] || "/");
    expect(r.status(), href).toBe(200);
  }
});
