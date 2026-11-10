import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("Intro completo, do primeiro exercício à medalha", async ({ page }) => {
  // 1. nome da célula: Caixa de Nome escondida, digitar no campo não perde o foco
  await abrir(page, "nome-da-celula");
  await expect(page.getByTestId("caixa-nome")).toHaveText("?");
  await page.getByTestId("campo-resposta").click();
  await page.keyboard.type("e 4");
  await expect(page.getByTestId("campo-resposta")).toHaveValue("e 4");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("resultado")).toContainText("Correto!");

  // 2. clicar em C7
  await abrir(page, "clicar-em-uma-celula");
  await celula(page, "C7").click();
  await verificarCorreto(page);

  // 3. só teclado
  await abrir(page, "navegar-pelo-teclado");
  for (const k of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown"]) await page.keyboard.press(k);
  await expect(page.getByTestId("caixa-nome")).toHaveText("C3");
  await verificarCorreto(page);

  // 4. selecionar B2:D5 arrastando
  await abrir(page, "selecionar-intervalo");
  const b2 = await celula(page, "B2").boundingBox();
  const d5 = await celula(page, "D5").boundingBox();
  await page.mouse.move(b2!.x + 10, b2!.y + 10);
  await page.mouse.down();
  await page.mouse.move(d5!.x + 10, d5!.y + 10, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId("caixa-nome")).toHaveText("B2:D5");
  await verificarCorreto(page);

  // 5. digitar 150
  await abrir(page, "digitar-um-valor");
  await digitar(page, "B3", "150");
  await verificarCorreto(page);

  // 6. editar com duplo clique; o total recalcula
  await abrir(page, "editar-uma-celula");
  await celula(page, "C2").dblclick();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("120");
  await page.keyboard.press("Enter");
  await expect(celula(page, "D2")).toHaveText("360");
  await verificarCorreto(page);

  // 7. barra de fórmulas
  await abrir(page, "ler-a-barra-de-formulas");
  await celula(page, "D4").click();
  await expect(page.getByTestId("barra-formulas")).toHaveValue("=B4+C4");
  await page.getByTestId("campo-resposta").fill("=B4+C4");
  await verificarCorreto(page);

  // 8. primeira fórmula
  await abrir(page, "primeira-formula");
  await digitar(page, "C1", "=A1+B1");
  await expect(celula(page, "C1")).toHaveText("65");
  await verificarCorreto(page);

  // 9. moeda pelo botão
  await abrir(page, "formato-moeda");
  await celula(page, "B2").click();
  await page.keyboard.down("Shift");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  await page.getByTestId("formatar-moeda").click();
  await expect(celula(page, "B2")).toHaveText(/R\$\s2,50/);
  await verificarCorreto(page);

  // 10. porcentagem pelo atalho -> medalha do Intro
  await abrir(page, "formato-porcentagem");
  await celula(page, "C2").click();
  await page.keyboard.press("Control+Shift+Digit5");
  await expect(celula(page, "C2")).toHaveText("75%");
  await verificarCorreto(page);
  const modal = page.getByTestId("trofeu");
  await expect(modal).toContainText("Intro");
  await expect(modal.getByRole("link", { name: "Ir para Fundamentos" })).toHaveAttribute(
    "href",
    "/exercicios/soma-total-de-vendas",
  );

  // trilha: medalha do Intro, sem troféu de Fundamentos
  await page.goto("/trilha");
  await expect(page.getByTestId("trofeu-home-intro")).toBeVisible();
  await expect(page.getByTestId("trofeu-home-fundamentos")).toHaveCount(0);
  await expect(page.getByTestId("cta")).toContainText("Continuar: SOMA");
});

test("só teclado: usar o mouse reprova, Recomeçar zera", async ({ page }) => {
  await abrir(page, "navegar-pelo-teclado");
  await celula(page, "B2").click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("usou o mouse");
  await page.getByRole("button", { name: "Recomeçar" }).click();
  await expect(page.getByTestId("caixa-nome")).toHaveText("A1");
  await celula(page, "A1").click(); // clicar na própria célula ativa não conta
  for (const k of ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown"]) await page.keyboard.press(k);
  await verificarCorreto(page);
});

test("pular questão: avança, não conta como feita e aparece na lista", async ({ page }) => {
  await abrir(page, "nome-da-celula");
  await page.getByTestId("pular").click();
  await expect(page).toHaveURL(/clicar-em-uma-celula/);
  // A página anterior fica montada (escondida) para preservar estado: olhar só a visível.
  await expect(page.getByTestId("progresso-modulo").filter({ visible: true })).toContainText("0 de 10");
  await page.goto("/trilha");
  await expect(page.locator("#modulo-intro")).toContainText("pulada");
  await expect(page.getByTestId("cta")).toContainText("Continuar: Selecionar uma célula com o mouse");
});

test("formatação sobrevive ao recarregar", async ({ page }) => {
  await abrir(page, "formato-porcentagem");
  await celula(page, "C2").click();
  await page.getByTestId("formatar-percentual").click();
  await page.reload();
  await expect(celula(page, "C2")).toHaveText("75%");
});

test("barra de formatação só aparece onde o exercício pede", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  await expect(page.getByTestId("formatar-moeda")).toHaveCount(0);
  await abrir(page, "formato-moeda");
  await expect(page.getByTestId("formatar-moeda")).toBeVisible();
});

test("exercício 1: a célula ativa não muda", async ({ page }) => {
  await abrir(page, "nome-da-celula");
  await celula(page, "C2").click();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("editor-celula")).toHaveAttribute("aria-label", "Célula E4");
  await expect(page.getByTestId("mensagem-formula")).toHaveText(".");
  await expect(page.getByTestId("alca")).toHaveCount(0);
});

test("exercício 7: não dá para colar a fórmula no campo de resposta", async ({ page }) => {
  await abrir(page, "ler-a-barra-de-formulas");
  await celula(page, "D4").click();
  // clicar na barra de fórmulas de uma célula de dados não mostra erro
  await page.getByTestId("barra-formulas").click();
  await expect(page.getByTestId("mensagem-formula")).not.toContainText("não pode ser alterada");
  const campo = page.getByTestId("campo-resposta");
  await campo.dispatchEvent("paste");
  await expect(page.getByTestId("aviso-colar")).toBeVisible();
  await expect(campo).toHaveValue("");
  await campo.click();
  await page.keyboard.type("=B4+C4");
  await expect(page.getByTestId("aviso-colar")).toHaveCount(0);
  await verificarCorreto(page);
});
