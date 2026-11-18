import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });
const aba = (page: import("@playwright/test").Page, nome: string) => page.locator(`[data-aba="${nome}"]`).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("trocar de aba, digitar a referência (nome da aba sem diferenciar maiúsculas) e o progresso volta", async ({ page }) => {
  await abrir(page, "abas-total-de-outra-aba");
  await expect(aba(page, "Resumo")).toHaveAttribute("aria-selected", "true");
  await aba(page, "Jan").click();
  await expect(celula(page, "A2")).toHaveText("Ana");
  await aba(page, "Resumo").click();
  await digitar(page, "B2", "=SOMA(jan!B2:B6)");
  await expect(celula(page, "B2")).toHaveText(/6\.355,00/);
  await celula(page, "B2").click();
  await expect(visivel(page, "barra-formulas")).toHaveValue("=SOMA(Jan!B2:B6)");
  await verificarCorreto(page);
  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await expect(celula(page, "B2")).toHaveText(/6\.355,00/);
});

test("apontar em outra aba: clicar na aba no meio da fórmula, arrastar e Enter volta", async ({ page }) => {
  await abrir(page, "abas-total-de-outra-aba-variacao-a");
  await celula(page, "B2").click();
  await page.keyboard.insertText("=MÉDIA(");
  await aba(page, "Fev").click();
  await expect(visivel(page, "aviso-apontar")).toBeVisible();
  await celula(page, "B2").hover();
  await page.mouse.down();
  await celula(page, "B6").hover();
  await page.mouse.up();
  await expect(visivel(page, "barra-formulas")).toHaveValue("=MÉDIA(Fev!B2:B6");
  await page.keyboard.type(")");
  await page.keyboard.press("Enter");
  await expect(aba(page, "Resumo")).toHaveAttribute("aria-selected", "true");
  await expect(celula(page, "B2")).toHaveText(/1\.284,00/);
  await verificarCorreto(page);
});

test("aba com espaço: sem aspas a fórmula é recusada com a explicação", async ({ page }) => {
  await abrir(page, "abas-total-de-outra-aba-pegadinha");
  await celula(page, "B2").click();
  await page.keyboard.insertText("=SOMA(Vendas 2025!B2:B6)");
  await page.keyboard.press("Enter");
  await expect(visivel(page, "mensagem-formula")).toContainText("aspas simples");
  await page.keyboard.press("Escape");
  await digitar(page, "B2", "=SOMA('Vendas 2025'!B2:B6)");
  await verificarCorreto(page);
});
