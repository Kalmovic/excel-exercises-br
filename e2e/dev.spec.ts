import { expect, test } from "@playwright/test";
import { celula } from "./ajuda";

// Em `next dev` o React roda em StrictMode: efeitos montam, desmontam e
// montam de novo. O motor era destruído nesse vai e volta (P0-1).
test("dev: exercício funciona no primeiro carregamento", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click({ timeout: 90_000 });
  await page.keyboard.insertText("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
  expect(erros).toEqual([]);
});
