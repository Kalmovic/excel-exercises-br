import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("FILTRO com duas condições: E com asterisco", async ({ page }) => {
  await abrir(page, "filtro-condicoes-e-ou");
  await digitar(page, "F2", '=FILTRO(A2:D8;(B2:B8="Sul")*(D2:D8="Pago"))');
  await expect(celula(page, "F4")).toHaveText("Bruno");
  await expect(celula(page, "F5")).toHaveText("");
  await verificarCorreto(page);
});

test("PEGAR: as 3 maiores vendas", async ({ page }) => {
  await abrir(page, "pegar-ranking-maiores");
  await digitar(page, "F2", "=PEGAR(A2:D8;3)");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Sem classificar antes");
  await digitar(page, "F2", "=PEGAR(CLASSIFICAR(A2:D8;3;-1);3)");
  await expect(celula(page, "H2")).toHaveText("700");
  await verificarCorreto(page);
});

test("filtro: só as linhas com Responsável em branco", async ({ page }) => {
  await abrir(page, "dados-filtrar-vazias");
  await celula(page, "B3").click();
  await visivel(page, "botao-filtro").click();
  await visivel(page, "seta-filtro-C").click();
  const menu = visivel(page, "menu-filtro");
  await menu.getByTestId("filtro-selecionar-tudo").uncheck();
  await menu.locator('[data-valor-filtro=""]').check();
  await menu.getByTestId("filtro-ok").click();
  await expect(visivel(page, "registros-encontrados")).toHaveText("3 de 9 registros encontrados");
  await expect(celula(page, "B2")).toHaveCount(0);
  await expect(celula(page, "B3")).toHaveText("Padaria Pão Quente");
  await verificarCorreto(page);
});

test("filtro: pesquisar Ltda na seta de Cliente", async ({ page }) => {
  await abrir(page, "dados-filtro-pesquisar");
  await celula(page, "A2").click();
  await page.keyboard.press("Control+Shift+L");
  await visivel(page, "seta-filtro-A").click();
  const menu = visivel(page, "menu-filtro");
  await menu.getByPlaceholder("Pesquisar").fill("ltda");
  await menu.getByTestId("filtro-ok").click();
  await expect(visivel(page, "registros-encontrados")).toHaveText("4 de 9 registros encontrados");
  await expect(celula(page, "A3")).toHaveCount(0);
  await verificarCorreto(page);
});
