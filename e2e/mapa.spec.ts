import { expect, test } from "@playwright/test";
import { limparArmazenamento } from "./ajuda";

test("mapa: usuário novo, casa atual, balão e módulos em breve", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/trilha");
  const mapa = page.getByTestId("mapa");
  await expect(page.getByTestId("casa-nome-da-celula")).toHaveAttribute("data-mapa-atual", "true");
  await expect(page.getByTestId("pino")).toBeVisible();
  await expect(page.getByTestId("regiao-busca")).toContainText("Em breve");
  await expect(page.getByTestId("progresso-geral")).toContainText("0 de 15 exercícios");

  // a lista por baixo do desenho é navegável e acessível
  await expect(mapa.getByRole("list", { name: "Mapa da trilha" })).toBeVisible();
  await page.getByTestId("casa-clicar-em-uma-celula").click();
  const balao = page.getByRole("dialog");
  await expect(balao).toContainText("Selecionar uma célula com o mouse");
  await expect(balao).toContainText("Nível 1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByTestId("casa-nome-da-celula").click();
  await page.getByRole("dialog").getByRole("link", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/nome-da-celula/);
});

test("mapa: módulo concluído recolhe e o desafio do dia mostra se já jogou", async ({ page }) => {
  await limparArmazenamento(page);
  await page.evaluate(() => {
    const slugs = ["nome-da-celula", "clicar-em-uma-celula", "navegar-pelo-teclado", "selecionar-intervalo", "digitar-um-valor",
      "editar-uma-celula", "ler-a-barra-de-formulas", "primeira-formula", "formato-moeda", "formato-porcentagem"];
    const p: Record<string, unknown> = {};
    slugs.forEach((s, i) => (p[s] = { versao: 1, status: "concluido", tentativas: 1, conteudos: {}, atualizadoEm: `2026-11-10T10:0${i}:00Z` }));
    localStorage.setItem("excel-br:progresso:v1", JSON.stringify(p));
    localStorage.setItem("excel-br:trofeus:v1", JSON.stringify({ intro: "2026-11-10T10:10:00Z" }));
  });
  await page.goto("/trilha");
  const intro = page.getByTestId("regiao-intro");
  await expect(intro).toContainText("Concluído");
  await expect(page.getByTestId("casa-nome-da-celula")).toHaveCount(0); // recolhido
  await expect(page.getByTestId("trofeu-home-intro")).toBeVisible();
  await expect(page.getByTestId("casa-soma-total-de-vendas")).toHaveAttribute("data-mapa-atual", "true");
  await intro.getByRole("button", { name: "Ver casas" }).click();
  await expect(page.getByTestId("casa-nome-da-celula")).toHaveAccessibleName(/\(feito\)/);
  await expect(page.getByTestId("card-desafio")).toContainText("Você ainda não jogou hoje");
  await expect(page.getByTestId("progresso-geral")).toContainText("10 de 15 exercícios");
});
