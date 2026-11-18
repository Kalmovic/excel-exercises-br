import { expect, test } from "@playwright/test";
import { abrir, celula, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("inserir colunas, dar título, trocar o tipo e recarregar", async ({ page }) => {
  await abrir(page, "grafico-vendas-por-mes-variacao-b");
  await celula(page, "A3").click();
  await visivel(page, "botao-grafico").click();
  await visivel(page, "menu-grafico").locator('[data-tipo-grafico="colunas"]').click();
  const grafico = visivel(page, "grafico-0");
  await expect(grafico.locator("[data-barra-grafico]")).toHaveCount(6);
  const painel = visivel(page, "painel-grafico");
  await painel.getByTestId("grafico-titulo").fill("Vendas do 1º semestre");
  await painel.getByTestId("grafico-titulo").press("Enter");
  await expect(grafico.locator("[data-titulo]")).toHaveText("Vendas do 1º semestre");
  await verificarCorreto(page);

  await painel.locator('[data-mudar-tipo="linhas"]').click();
  await expect(grafico.locator("[data-linha-grafico]")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await expect(visivel(page, "grafico-0").locator("[data-linha-grafico]")).toHaveCount(1);
});

test("pegadinha do total: corrigir o intervalo no painel", async ({ page }) => {
  await abrir(page, "grafico-vendas-por-mes-pegadinha");
  await celula(page, "B2").click();
  await visivel(page, "botao-grafico").click();
  await visivel(page, "menu-grafico").locator('[data-tipo-grafico="colunas"]').click();
  await expect(visivel(page, "grafico-0").locator("[data-barra-grafico]")).toHaveCount(7);
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("uma categoria a mais");
  const dados = visivel(page, "painel-grafico").getByTestId("grafico-dados");
  await dados.fill("A1:B7");
  await dados.press("Enter");
  await expect(visivel(page, "grafico-0").locator("[data-barra-grafico]")).toHaveCount(6);
  await verificarCorreto(page);
});

test("pizza com rótulos e Alternar Linha/Coluna", async ({ page }) => {
  await abrir(page, "grafico-participacao-canal-variacao-b");
  await celula(page, "A2").click();
  await visivel(page, "botao-grafico").click();
  await visivel(page, "menu-grafico").locator('[data-tipo-grafico="pizza"]').click();
  await visivel(page, "painel-grafico").getByTestId("grafico-rotulos").check();
  await expect(visivel(page, "grafico-0").locator("[data-rotulo-grafico]")).toHaveCount(4);
  await verificarCorreto(page);

  await abrir(page, "grafico-participacao-canal-pegadinha");
  await celula(page, "B2").click();
  await visivel(page, "botao-grafico").click();
  await visivel(page, "menu-grafico").locator('[data-tipo-grafico="colunas"]').click();
  await visivel(page, "painel-grafico").getByTestId("grafico-alternar").click();
  await verificarCorreto(page);
});
