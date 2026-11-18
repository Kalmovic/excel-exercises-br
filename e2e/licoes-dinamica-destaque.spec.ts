import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

async function inserirDinamica(page: Page) {
  await celula(page, "A2").click();
  await visivel(page, "botao-dinamica").click();
  await expect(visivel(page, "dinamica-origem")).toHaveValue("A1:E17");
  await visivel(page, "dinamica-ok").click();
  return visivel(page, "painel-dinamica");
}

async function selecionar(page: Page, de: string, ate: string) {
  await celula(page, de).click();
  await celula(page, ate).click({ modifiers: ["Shift"] });
}

test("dinâmica: Máx. da maior despesa de cada setor", async ({ page }) => {
  await abrir(page, "dinamica-maior-e-menor");
  const painel = await inserirDinamica(page);
  await painel.locator('[data-campo="Setor"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await expect(celula(page, "H1")).toHaveText("Soma de Valor");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Soma de Valor");
  await painel.getByTestId("funcao-valor").selectOption("max");
  await expect(celula(page, "H1")).toHaveText("Máx. de Valor");
  await verificarCorreto(page);
});

test("dinâmica: filtro com vários itens (janeiro e fevereiro)", async ({ page }) => {
  await abrir(page, "dinamica-filtro-varios-itens");
  const painel = await inserirDinamica(page);
  await painel.locator('[data-campo="Setor"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await painel.locator('[data-campo="Mês"]').check(); // vai para Colunas
  await painel.getByLabel("Mover Mês").selectOption("filtros");
  await expect(celula(page, "G1")).toHaveText("Mês");
  await painel.getByTestId("itens-filtro-dinamica").click();
  const menu = visivel(page, "menu-itens-dinamica");
  await menu.getByText("(Tudo)").click();
  await menu.locator('[data-item-dinamica="Jan"]').check();
  await menu.locator('[data-item-dinamica="Fev"]').check();
  await menu.getByTestId("itens-dinamica-ok").click();
  await expect(celula(page, "H1")).toHaveText("(Vários itens)");
  await verificarCorreto(page);
});

test("condicional: prazos vencidos com É Menor do que uma data", async ({ page }) => {
  await abrir(page, "destaque-prazos-vencidos");
  await selecionar(page, "D2", "D11");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="menor"]').click();
  const janela = visivel(page, "janela-regra");
  await janela.getByTestId("regra-valor").fill("18/11/2026");
  await janela.getByTestId("regra-ok").click();
  await expect(celula(page, "D2")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "D5")).not.toHaveAttribute("data-destaque", /.+/); // o prazo de hoje não venceu
  await verificarCorreto(page);
});

test("condicional: Texto que Contém uma palavra no meio do assunto", async ({ page }) => {
  await abrir(page, "destaque-texto-contem");
  await selecionar(page, "C2", "C11");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="texto"]').click();
  const janela = visivel(page, "janela-regra");
  await janela.getByTestId("regra-valor").fill("trabalhista");
  await janela.getByTestId("regra-estilo").selectOption("amarelo");
  await janela.getByTestId("regra-ok").click();
  await expect(celula(page, "C4")).toHaveAttribute("data-destaque", "amarelo");
  await verificarCorreto(page);
});
