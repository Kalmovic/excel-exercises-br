import { expect, test } from "@playwright/test";
import { abrir, celula, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("realçar: menor do que, pela janela, com cor na grade e progresso restaurado", async ({ page }) => {
  await abrir(page, "destaque-vendas-baixas"); // já abre com C2:C11 selecionado
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="menor"]').click();
  const janela = visivel(page, "janela-regra");
  await expect(janela.getByTestId("regra-intervalo")).toHaveValue("C2:C11");
  await janela.getByTestId("regra-valor").fill("500");
  await janela.getByTestId("regra-ok").click();
  await expect(celula(page, "C3")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "C2")).not.toHaveAttribute("data-destaque", /.+/);
  await verificarCorreto(page);
  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await expect(celula(page, "C3")).toHaveAttribute("data-destaque", "vermelho");
});

test("linha inteira com fórmula, e o gerenciador exclui a regra", async ({ page }) => {
  await abrir(page, "destaque-linha-inteira");
  await celula(page, "A2").click();
  await celula(page, "D11").click({ modifiers: ["Shift"] });
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="formula"]').click();
  await visivel(page, "regra-formula").fill('=$D2="Atrasado"');
  await visivel(page, "regra-ok").click();
  await expect(celula(page, "A3")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "C3")).toHaveAttribute("data-destaque", "vermelho");
  await verificarCorreto(page);

  await visivel(page, "botao-condicional").click();
  await visivel(page, "gerenciar-regras").click();
  await visivel(page, "gerenciador-regras").getByRole("button", { name: "Excluir" }).click();
  await expect(celula(page, "A3")).not.toHaveAttribute("data-destaque", /.+/);
});

test("barras de dados aplicam direto na seleção", async ({ page }) => {
  await abrir(page, "destaque-linha-inteira-variacao-b");
  await celula(page, "C2").click();
  await celula(page, "C11").click({ modifiers: ["Shift"] });
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="barras"]').click();
  await expect(celula(page, "C10").locator("[data-barra]")).toBeVisible();
  await verificarCorreto(page);
});

test("Esc fecha o Gerenciador de Regras e o botão não abre o menu por cima dele", async ({ page }) => {
  await abrir(page, "destaque-vendas-baixas");
  for (const valor of ["500", "600"]) {
    await visivel(page, "botao-condicional").click();
    await visivel(page, "menu-condicional").locator('[data-regra="menor"]').click();
    await visivel(page, "regra-valor").fill(valor);
    await visivel(page, "regra-ok").click();
  }
  await visivel(page, "botao-condicional").click();
  await visivel(page, "gerenciar-regras").click();
  await page.keyboard.press("Escape");
  await expect(visivel(page, "gerenciador-regras")).toHaveCount(0);

  await visivel(page, "botao-condicional").click();
  await visivel(page, "gerenciar-regras").click();
  await visivel(page, "botao-condicional").click();
  await expect(visivel(page, "gerenciador-regras")).toHaveCount(0);
  await expect(visivel(page, "menu-condicional")).toHaveCount(0);
});
