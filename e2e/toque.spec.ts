import { devices, expect, test } from "@playwright/test";

// Celular de verdade: tela de toque, sem mouse nem teclado físico.
const { defaultBrowserType: _ignorado, ...pixel } = devices["Pixel 7"];
void _ignorado;
test.use(pixel);

const cel = (page: import("@playwright/test").Page, end: string) => page.locator(`[data-celula="${end}"]`).first();
const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test("celular: exercício de setas vira 'toque em C3' e aceita o toque", async ({ page }) => {
  await page.goto("/exercicios/navegar-pelo-teclado");
  await expect(page.locator("main")).toContainText("No celular não há setas");
  await cel(page, "C3").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: enunciado acima da planilha e intervalo selecionado com ↔ Estender", async ({ page }) => {
  await page.goto("/exercicios/selecionar-intervalo");
  const enunciado = page.getByText("toque em B2").filter({ visible: true });
  await expect(enunciado).toBeVisible(); // o texto de toque entra depois de a página carregar
  const yEnunciado = (await enunciado.boundingBox())!.y;
  const yGrade = (await cel(page, "A1").boundingBox())!.y;
  expect(yEnunciado).toBeLessThan(yGrade);
  await expect(page.getByTestId("atalhos")).toBeHidden(); // atalhos de teclado não aparecem
  await cel(page, "B2").tap();
  await page.getByTestId("estender-selecao").tap();
  await cel(page, "D5").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: preencher para baixo copia a fórmula sem Ctrl+D", async ({ page }) => {
  await page.goto("/exercicios/se-aninhado-otimo-bom");
  await cel(page, "C2").tap();
  await page.keyboard.insertText('=SE(B2>=9;"Ótimo";SE(B2>=7;"Bom";"Recuperação"))');
  await page.keyboard.press("Enter");
  await cel(page, "C2").tap();
  await page.getByTestId("estender-selecao").tap();
  await cel(page, "C6").tap();
  await page.getByTestId("preencher-abaixo").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});
