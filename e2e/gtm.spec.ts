import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test("origem: UTM da primeira visita, afiliado em cookie", async ({ page, context }) => {
  await limparArmazenamento(page);
  await page.goto("/?utm_source=tiktok&utm_campaign=procv&ref=ana&cupom=excel10");
  await page.goto("/trilha?utm_source=google");
  const origem = await page.evaluate(() => JSON.parse(localStorage.getItem("excel-br:origem:v1") ?? "null"));
  expect(origem).toMatchObject({ utm_source: "tiktok", utm_campaign: "procv", ref: "ana", cupom: "EXCEL10" });
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "planilhes_ref")?.value).toBe("ana");
});

test("ofensiva: concluir um exercício começa a sequência", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/trilha");
  await expect(page.getByTestId("ofensiva")).toHaveCount(0); // sem exercício feito, nada de ofensiva
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
  await page.goto("/trilha");
  await expect(visivel(page, "ofensiva")).toContainText("1 dia seguido");
});

test("preços e garantia na landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("preco-pro")).toContainText("19,90");
  await expect(page.getByTestId("garantia")).toContainText("7 dias");
});
