import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { celula, limparArmazenamento } from "./ajuda";

/** Quantas questões a lista deve ter: as avulsas + as etapas de lição com banca (lidas do conteúdo). */
type Q = { banca?: string; tema?: string; teste?: boolean; type: string };
const ler = (f: string) => JSON.parse(readFileSync(f, "utf8")) as Q[];
const todas = [
  ...ler("src/content/concurso/questoes.json"),
  ...readdirSync("src/content/modulos").flatMap((f) => ler(`src/content/modulos/${f}`).filter((e) => !e.teste)),
].filter((q) => q.type === "multiple_choice" && q.banca && q.tema);
const daVunesp = todas.filter((q) => q.banca === "Vunesp").length;

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test("concurso: filtro por banca, planilha para testar, alternativa errada explica, acerto aparece na lista", async ({ page }) => {
  await limparArmazenamento(page);
  await page.goto("/concurso");
  await expect(page.getByTestId("lista-concurso").locator("li")).toHaveCount(todas.length);
  expect(todas.length).toBeGreaterThan(30); // as das lições entram na lista
  await page.getByTestId("banca-Vunesp").click();
  await expect(page.getByTestId("lista-concurso").locator("li")).toHaveCount(daVunesp);

  await page.getByRole("link", { name: /SOMA com intervalo e célula/ }).click();
  await expect(page.getByTestId("banca-questao")).toHaveText("Estilo Vunesp");
  // A fórmula está no enunciado: a planilha fica só para consulta (colar a fórmula daria a resposta).
  const planilha = visivel(page, "planilha-de-teste");
  await expect(planilha).toBeVisible();
  await expect(planilha).toHaveAttribute("data-so-consulta", "true");
  await expect(planilha).toContainText("só para consulta");
  await expect(planilha.getByTestId("barra-formulas")).toHaveCount(0);
  await expect(celula(page, "A1")).toHaveText("10"); // os dados continuam à vista
  await celula(page, "C1").click();
  await page.keyboard.type("=SOMA(A1:A3;B2)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "C1")).toHaveText("");

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
  await expect(page.getByText(new RegExp(`você já acertou 1 de ${todas.length}`))).toBeVisible();
});
