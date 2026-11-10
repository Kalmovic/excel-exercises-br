import { expect, type Page } from "@playwright/test";

// O Next mantém a página anterior montada e escondida depois de navegar: olhar só a visível.
export const celula = (page: Page, end: string) => page.locator(`[data-celula="${end}"]`).filter({ visible: true });

export async function abrir(page: Page, slug: string) {
  await page.goto(`/exercicios/${slug}`);
  await expect(page.getByTestId("verificar")).toBeVisible();
}

export async function verificarCorreto(page: Page) {
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
}

export async function digitar(page: Page, end: string, texto: string) {
  await celula(page, end).click();
  await page.keyboard.insertText(texto);
  await page.keyboard.press("Enter");
}

export async function limparArmazenamento(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}
