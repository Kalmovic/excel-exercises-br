import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("P3-1: autocompletar e dica de argumentos", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.type("=so");
  const lista = visivel(page, "sugestoes");
  await expect(lista.getByRole("option").first()).toHaveText(/^SOMA/);
  await expect(lista).toContainText("SOMASE");

  await page.keyboard.press("Enter"); // escolhe, não confirma a célula
  const editor = page.getByTestId("editor-celula");
  await expect(editor).toHaveValue("=SOMA(");
  const dica = visivel(page, "dica-argumentos");
  await expect(dica.locator("strong")).toHaveText("núm1");
  await page.keyboard.type("B2:B7;");
  await expect(dica.locator("strong")).toHaveText("[núm2]");

  await page.keyboard.press("Backspace");
  await page.keyboard.type(")");
  await expect(dica).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/77\.500,00/);
});

test("P3-1: Esc fecha só a lista, sem cancelar a edição; acento é opcional", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.type("=med");
  await expect(visivel(page, "sugestoes")).toContainText("MÉDIA");
  await page.keyboard.press("Escape");
  await expect(visivel(page, "sugestoes")).toHaveCount(0);
  await expect(page.getByTestId("editor-celula")).toHaveValue("=med");
});

test("P3-2: F4 alterna o $ da referência", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "C2").click();
  await page.keyboard.type("=B2");
  const editor = page.getByTestId("editor-celula");
  for (const esperado of ["=$B$2", "=B$2", "=$B2", "=B2"]) {
    await page.keyboard.press("F4");
    await expect(editor).toHaveValue(esperado);
  }
  // na barra de fórmulas também
  const barra = page.getByTestId("barra-formulas");
  await barra.click();
  await page.keyboard.press("End");
  await page.keyboard.press("F4");
  await expect(barra).toHaveValue("=$B$2");
});
