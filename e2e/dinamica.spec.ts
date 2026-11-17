import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("inserir, marcar campos, trocar a conta, desfazer e recarregar", async ({ page }) => {
  await abrir(page, "dinamica-total-por-regiao-pegadinha");
  await celula(page, "B3").click();
  await visivel(page, "botao-dinamica").click();
  await expect(visivel(page, "dinamica-origem")).toHaveValue("A1:E15");
  await expect(visivel(page, "dinamica-destino")).toHaveValue("G1");
  await visivel(page, "dinamica-ok").click();
  await expect(visivel(page, "dinamica-vazia")).toBeVisible();

  const painel = visivel(page, "painel-dinamica");
  await painel.locator('[data-campo="Produto"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await expect(celula(page, "G1")).toHaveText("Rótulos de Linha");
  await expect(celula(page, "H1")).toHaveText("Soma de Valor");
  await expect(celula(page, "G5")).toHaveText("Total Geral");

  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Soma de Valor");

  await painel.getByTestId("funcao-valor").selectOption("media");
  await expect(celula(page, "H1")).toHaveText("Média de Valor");
  await verificarCorreto(page);

  // digitar dentro da tabela dinâmica é recusado
  await celula(page, "H2").click();
  await page.keyboard.insertText("1");
  await expect(page.getByText("Não é possível alterar esta parte de uma tabela dinâmica").filter({ visible: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await expect(celula(page, "H1")).toHaveText("Média de Valor");
});

test("Colunas e Filtros pelo menu Mover e pela lista de itens", async ({ page }) => {
  await abrir(page, "dinamica-regiao-por-canal-variacao-b");
  await celula(page, "A2").click();
  await visivel(page, "botao-dinamica").click();
  await visivel(page, "dinamica-ok").click();
  const painel = visivel(page, "painel-dinamica");
  await painel.locator('[data-campo="Produto"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await painel.locator('[data-campo="Canal"]').check(); // vai para Colunas
  await expect(celula(page, "H1")).toHaveText("Rótulos de Coluna");
  await painel.getByLabel("Mover Canal").selectOption("filtros");
  await expect(celula(page, "G1")).toHaveText("Canal");
  await expect(celula(page, "H1")).toHaveText("(Tudo)");
  await painel.getByTestId("itens-filtro-dinamica").click();
  const menu = visivel(page, "menu-itens-dinamica");
  await menu.getByText("(Tudo)").click();
  await menu.locator('[data-item-dinamica="Site"]').check();
  await menu.getByTestId("itens-dinamica-ok").click();
  await expect(celula(page, "H1")).toHaveText("Site");
  await verificarCorreto(page);
});

test("fórmula lendo a tabela dinâmica que o exercício já traz", async ({ page }) => {
  await abrir(page, "dinamica-usar-resultado");
  await expect(celula(page, "G4")).toHaveText("Sul");
  await digitar(page, "H8", "=H4/H5");
  await expect(celula(page, "H8")).toHaveText(/51,5/);
  await verificarCorreto(page);
});
