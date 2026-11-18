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

test("página Pro: destaque da tabela dinâmica abre a lição jogável na aba certa", async ({ page }) => {
  await page.goto("/pro");
  const destaque = page.getByTestId("secao-ferramentas");
  await expect(destaque).toContainText("Total Geral");
  await expect(destaque).toContainText("R$ 24.260,00"); // calculado pelo motor, não escrito à mão
  await expect(page.getByTestId("aba-amostra-procv")).toHaveAttribute("aria-selected", "true");
  await page.getByTestId("cta-dinamica").click();
  await expect(page.getByTestId("aba-amostra-dinamica")).toHaveAttribute("aria-selected", "true");
  const amostra = page.getByTestId("exercicio-embutido");
  await expect(amostra).toContainText("Tabela dinâmica: total por região");
  await amostra.locator('[data-celula="B3"]').click();
  await amostra.getByTestId("botao-dinamica").click();
  await amostra.getByTestId("dinamica-ok").click();
  await amostra.locator('[data-campo="Região"]').check();
  await amostra.locator('[data-campo="Valor"]').check();
  await amostra.getByTestId("verificar").click();
  await expect(amostra.getByTestId("resultado")).toContainText("Correto!");
});

test("página Pro: as seis ferramentas, com o módulo de cada uma, e a aba de gráfico", async ({ page }) => {
  await page.goto("/pro");
  const lista = page.getByTestId("lista-ferramentas");
  await expect(lista.locator("li")).toHaveCount(6);
  for (const t of ["Gráficos", "Formatação condicional", "Validação de dados", "Várias abas"]) await expect(lista).toContainText(t);
  await expect(lista).toContainText(/Várias abas\s*Módulo 13/);
  await page.getByTestId("cta-grafico").click();
  await expect(page.getByTestId("aba-amostra-grafico")).toHaveAttribute("aria-selected", "true");
  const amostra = page.getByTestId("exercicio-embutido");
  await amostra.locator('[data-celula="A3"]').click();
  await amostra.getByTestId("botao-grafico").click();
  await amostra.locator('[data-tipo-grafico="colunas"]').click();
  await amostra.getByTestId("verificar").click();
  await expect(amostra.getByTestId("resultado")).toContainText("Correto!");
});
