import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("regressão: SOMA, recusa de inglês e 'Próximo' dentro do módulo", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  await expect(page.getByTestId("caixa-nome")).toHaveText("A1");
  await expect(page.getByTestId("pular")).toHaveCount(0);
  await digitar(page, "B8", "=SUM(B2:B7)");
  await expect(page.getByTestId("mensagem-formula")).toContainText("Você quis dizer SOMA?");
  await page.keyboard.press("Escape");
  await digitar(page, "B8", "=SOMA(B2:B7)");
  await verificarCorreto(page);
  await expect(page.getByRole("link", { name: /Próximo: MÉDIA/ })).toHaveAttribute("href", "/exercicios/media-minimo-maximo");
});

test("regressão: referência absoluta com alça de preenchimento", async ({ page }) => {
  await abrir(page, "referencia-absoluta-comissao");
  await digitar(page, "C2", "=B2*$F$1");
  await celula(page, "C2").click();
  const alca = await page.getByTestId("alca").boundingBox();
  const c6 = await celula(page, "C6").boundingBox();
  await page.mouse.move(alca!.x + 3, alca!.y + 3);
  await page.mouse.down();
  await page.mouse.move(c6!.x + 20, c6!.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(celula(page, "C6")).toHaveText(/610,00/);
  await verificarCorreto(page);
});
