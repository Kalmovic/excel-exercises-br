import { expect, test } from "@playwright/test";
import { limparArmazenamento } from "./ajuda";

test("mapa: usuário novo, casa atual, balão e todos os módulos", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/trilha");
  const mapa = page.getByTestId("mapa");
  await expect(page.getByTestId("casa-nome-da-celula")).toHaveAttribute("data-mapa-atual", "true");
  await expect(page.getByTestId("pino")).toBeVisible();
  await expect(page.getByTestId("casa-procv-preco-pelo-codigo-exato")).toBeVisible();
  await expect(page.getByTestId("progresso-geral").filter({ visible: true })).toContainText("0 de 52 exercícios");

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
  await expect(page.getByTestId("card-desafio").filter({ visible: true })).toContainText("Você ainda não jogou hoje");
  await expect(page.getByTestId("progresso-geral").filter({ visible: true })).toContainText("10 de 52 exercícios");
});

test("balão: fecha ao sair e voltar, e não cobre nenhuma casa", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/trilha");
  const visivel = () => page.getByRole("dialog").filter({ visible: true });

  // abre o balão de uma casa à direita, que antes abria por cima das outras
  await page.getByTestId("casa-navegar-pelo-teclado").click();
  const balao = await visivel().boundingBox();
  const casas = page.locator("[data-mapa-casa]").filter({ visible: true });
  for (let i = 0; i < (await casas.count()); i++) {
    const c = await casas.nth(i).boundingBox();
    if (!c || !balao) continue;
    const sobrepoe = c.x < balao.x + balao.width && c.x + c.width > balao.x && c.y < balao.y + balao.height && c.y + c.height > balao.y;
    expect(sobrepoe, `casa ${i} sob o balão`).toBe(false);
  }

  // entra pelo balão e volta: o balão não pode reaparecer aberto
  await visivel().getByRole("link").click();
  await expect(page).toHaveURL(/navegar-pelo-teclado/);
  await page.goBack();
  await expect(page).toHaveURL(/\/trilha$/);
  await expect(page.getByTestId("mapa").filter({ visible: true })).toBeVisible();
  await expect(visivel()).toHaveCount(0);

  // mesmo saindo por outro link (cabeçalho), o balão fecha
  await page.getByTestId("casa-digitar-um-valor").filter({ visible: true }).click();
  await expect(visivel()).toHaveCount(1);
  await page.getByRole("link", { name: "Desafio do dia" }).click();
  await expect(page).toHaveURL(/\/desafio$/);
  await page.goBack();
  await expect(visivel()).toHaveCount(0);
});
