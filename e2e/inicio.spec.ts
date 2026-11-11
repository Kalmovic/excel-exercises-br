import { expect, test } from "@playwright/test";
import { limparArmazenamento } from "./ajuda";

test("usuário novo começa pelo Intro, com opção de ir para Fundamentos", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/trilha");
  const cta = page.getByTestId("cta");
  await expect(cta.getByRole("link", { name: "Começar pelo básico" })).toHaveAttribute("href", "/exercicios/nome-da-celula");
  await cta.getByRole("link", { name: /Já sei o básico/ }).click();
  await expect(page).toHaveURL(/soma-total-de-vendas/);
  await page.goto("/trilha");
  await expect(page.getByTestId("cta")).toContainText("Começar Fundamentos");
});

test("quem já tinha progresso em Fundamentos não é mandado para o Intro", async ({ page }) => {
  await limparArmazenamento(page);
  // Progresso salvo no formato de antes do Intro
  await page.evaluate(() =>
    localStorage.setItem(
      "excel-br:progresso:v1",
      JSON.stringify({
        "soma-total-de-vendas": {
          versao: 1,
          status: "concluido",
          tentativas: 1,
          conteudos: { B8: "=SOMA(B2:B7)" },
          atualizadoEm: "2026-11-09T12:00:00.000Z",
        },
      }),
    ),
  );
  await page.goto("/trilha");
  await expect(page.getByTestId("cta")).toContainText("Continuar: MÉDIA: a venda de um mês típico");
  await expect(page.getByTestId("regiao-fundamentos")).toContainText("1/7");
  // o pino fica no próximo exercício de Fundamentos, não no Intro
  await expect(page.getByTestId("casa-media-mensal-de-vendas")).toHaveAttribute("data-mapa-atual", "true");
});
