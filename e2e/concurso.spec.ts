import { expect, test } from "@playwright/test";
import { celula, digitar, limparArmazenamento } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test("concurso: filtro por banca, planilha para testar, alternativa errada explica, acerto aparece na lista", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/concurso");
  await expect(page.getByTestId("lista-concurso").locator("li")).toHaveCount(30);
  await page.getByTestId("banca-Vunesp").click();
  await expect(page.getByTestId("lista-concurso").locator("li")).toHaveCount(6);

  await page.getByRole("link", { name: /SOMA com intervalo e célula/ }).click();
  await expect(page.getByTestId("banca-questao")).toHaveText("Estilo Vunesp");
  // A planilha está lá para testar a fórmula da questão
  await expect(visivel(page, "planilha-de-teste")).toBeVisible();
  await digitar(page, "C1", "=SOMA(A1:A3;B2)");
  await expect(celula(page, "C1")).toHaveText("62");

  const alternativas = visivel(page, "alternativas");
  await alternativas.getByText("63").click();
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Confira qual célula de B entra na soma.");
  await alternativas.getByText("62").click();
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
  await expect(page.getByText("Este foi o último exercício do módulo")).toHaveCount(0);

  await page.getByRole("link", { name: "← Todas as questões" }).click();
  await expect(page.getByTestId("lista-concurso")).toContainText("SOMA com intervalo e célula");
  await expect(page.getByText(/você já acertou 1 de 30/)).toBeVisible();
});
