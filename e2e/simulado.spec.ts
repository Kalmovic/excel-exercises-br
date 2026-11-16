import { expect, test } from "@playwright/test";
import { celula, digitar, limparArmazenamento } from "./ajuda";

test("simulado de vaga: tempo, ir e voltar sem perder a resposta, nota só na entrega", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/simulado");
  await expect(page.getByTestId("niveis-simulado")).toContainText("Intermediário");
  await page.getByTestId("simulado-basico").click();

  await page.getByTestId("comecar-simulado").click();
  await expect(page.getByTestId("cronometro")).toHaveText(/^(20:00|19:5\d)$/);
  await expect(page.getByTestId("verificar")).toHaveCount(0); // sem correção durante a prova
  await expect(page.getByTestId("painel-admin")).toHaveCount(0); // o gabarito nunca aparece ao aluno

  // Tarefa 1: total de cada venda (F2 e Ctrl+D até F9)
  await digitar(page, "F2", "=D2*E2");
  await celula(page, "F2").click();
  await page.keyboard.press("Shift+ArrowDown");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Control+d");
  await expect(celula(page, "F9")).toContainText("519,60");

  // Tarefa 2: resumo
  await page.getByTestId("proxima-tarefa").click();
  await expect(page.getByTestId("tarefa").filter({ visible: true })).toContainText("Resumo das vendas");
  await digitar(page, "F11", "=SOMA(F2:F9)");
  await digitar(page, "F12", "=MÉDIA(F2:F9)");
  await digitar(page, "F13", "=MÁXIMO(F2:F9)");
  await digitar(page, "F14", "=MÍNIMO(F2:F9)");

  // Volta para a 1: a resposta continua lá
  await page.getByRole("button", { name: "1", exact: true }).click();
  await expect(page.getByTestId("tarefa").filter({ visible: true })).toContainText("Total de cada venda");
  await expect(celula(page, "F2")).toContainText("6.400,00");

  page.once("dialog", (d) => d.accept());
  await page.getByTestId("entregar-simulado").click();
  const resultado = page.getByTestId("resultado-simulado");
  await expect(resultado).toContainText("2 de 8 tarefas certas");
  await expect(resultado).toContainText("Ainda não");
  await expect(page.getByTestId("tarefas-resultado").getByLabel("acertou")).toHaveCount(2);

  // O melhor resultado aparece na lista de níveis
  await page.getByRole("link", { name: "Outros níveis" }).click();
  await expect(page.getByTestId("niveis-simulado")).toContainText("Melhor: 2/8");
});
