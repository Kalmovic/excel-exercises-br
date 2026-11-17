import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("classificar pela barra Dados, desfazer e refazer", async ({ page }) => {
  await abrir(page, "dados-classificar-maior-valor");
  await celula(page, "C4").click();
  await visivel(page, "classificar-desc").click();
  await expect(celula(page, "A2")).toHaveText("Daniela");
  await expect(celula(page, "A1")).toHaveText("Vendedor");
  await page.keyboard.press("Control+z");
  await expect(celula(page, "A2")).toHaveText("Carla");
  await page.keyboard.press("Control+y");
  await expect(celula(page, "A2")).toHaveText("Daniela");
  await verificarCorreto(page);
});

test("filtro: Ctrl+Shift+L, menu da seta, linhas escondidas e progresso restaurado", async ({ page }) => {
  await abrir(page, "dados-filtrar-regiao");
  await celula(page, "B3").click();
  await page.keyboard.press("Control+Shift+L");
  await visivel(page, "seta-filtro-B").click();
  const menu = visivel(page, "menu-filtro");
  await expect(menu).toBeVisible();
  await menu.getByTestId("filtro-selecionar-tudo").uncheck();
  await menu.locator('[data-valor-filtro="Sul"]').check();
  await menu.getByTestId("filtro-ok").click();
  await expect(celula(page, "A3")).toHaveCount(0); // Ana (Norte) escondida
  await expect(celula(page, "A4")).toHaveText("Bruno");
  await expect(visivel(page, "registros-encontrados")).toHaveText("4 de 9 registros encontrados");
  // seta para baixo pula a linha escondida
  await celula(page, "A2").click();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-testid="editor-celula"]').filter({ visible: true })).toHaveAttribute("aria-label", "Célula A4");
  await verificarCorreto(page);

  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await expect(celula(page, "A3")).toHaveCount(0);
  await expect(visivel(page, "seta-filtro-B")).toBeVisible();
});

test("SUBTOTAL acompanha o filtro e SOMA não", async ({ page }) => {
  await abrir(page, "dados-subtotal-visiveis-pegadinha");
  await expect(celula(page, "C12")).toHaveText(/3\.550,00/);
  await digitar(page, "C12", "=SUBTOTAL(9;C2:C10)");
  await expect(celula(page, "C12")).toHaveText(/1\.050,00/);
  await verificarCorreto(page);
  await visivel(page, "limpar-filtros").click();
  await expect(celula(page, "C12")).toHaveText(/3\.550,00/);
});
