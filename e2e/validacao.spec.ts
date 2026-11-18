import { expect, test } from "@playwright/test";
import { abrir, celula, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("criar a lista, usar a setinha, digitação fora da lista é recusada e o progresso volta", async ({ page }) => {
  await abrir(page, "validacao-lista-status"); // abre com C2:C10 selecionado
  await visivel(page, "botao-validacao").click();
  const janela = visivel(page, "janela-validacao");
  await janela.getByTestId("validacao-permitir").selectOption("lista");
  await janela.getByTestId("validacao-fonte").fill("Pago;Pendente;Cancelado");
  await janela.getByTestId("validacao-ok").click();
  await verificarCorreto(page);

  await celula(page, "C4").click();
  await visivel(page, "seta-lista").click();
  await visivel(page, "itens-lista").locator('[data-item-lista="Cancelado"]').click();
  await expect(celula(page, "C4")).toHaveText("Cancelado");

  await celula(page, "C5").click();
  await page.keyboard.insertText("Aprovado");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Este valor não corresponde às restrições").filter({ visible: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(celula(page, "C5")).toHaveText("");

  await page.reload();
  await expect(page.getByTestId("verificar")).toBeVisible();
  await celula(page, "C6").click();
  await expect(visivel(page, "seta-lista")).toBeVisible();
});

test("Circular Dados Inválidos marca e some ao corrigir", async ({ page }) => {
  await abrir(page, "validacao-dados-antigos");
  await visivel(page, "botao-circular").click();
  await expect(page.locator("[data-circulo-invalido]").filter({ visible: true })).toHaveCount(3);
  await expect(visivel(page, "total-invalidos")).toHaveText("3 valores inválidos");
  for (const end of ["B3", "B5", "B7"]) {
    await celula(page, end).click();
    await page.keyboard.insertText("1");
    await page.keyboard.press("Enter");
  }
  await expect(visivel(page, "total-invalidos")).toHaveText("nenhum valor inválido");
  await verificarCorreto(page);
});

test("mensagem de entrada aparece ao selecionar a célula", async ({ page }) => {
  await abrir(page, "validacao-dados-antigos-variacao-b");
  await celula(page, "B2").click();
  await celula(page, "B10").click({ modifiers: ["Shift"] });
  await visivel(page, "botao-validacao").click();
  const janela = visivel(page, "janela-validacao");
  await janela.getByTestId("validacao-permitir").selectOption("inteiro");
  await janela.getByTestId("validacao-valor1").fill("1");
  await janela.getByTestId("validacao-valor2").fill("100");
  await janela.locator('[data-aba-validacao="entrada"]').click();
  await janela.getByTestId("validacao-entrada-texto").fill("Digite um número de 1 a 100");
  await janela.getByTestId("validacao-ok").click();
  await celula(page, "B4").click();
  await expect(visivel(page, "mensagem-entrada")).toContainText("Digite um número de 1 a 100");
  await verificarCorreto(page);
});

test("comprimento do texto: CPF com 11 dígitos", async ({ page }) => {
  await abrir(page, "validacao-cpf"); // abre com B2:B10 selecionado
  await visivel(page, "botao-validacao").click();
  const janela = visivel(page, "janela-validacao");
  await janela.getByTestId("validacao-permitir").selectOption("comprimento");
  await janela.getByTestId("validacao-operador").selectOption("igual");
  await janela.getByTestId("validacao-valor1").fill("11");
  await janela.getByTestId("validacao-ok").click();
  await verificarCorreto(page);

  await celula(page, "B3").click();
  await page.keyboard.insertText("1234567890");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Este valor não corresponde às restrições").filter({ visible: true }).first()).toBeVisible();
});

test("data dentro de um período", async ({ page }) => {
  await abrir(page, "validacao-periodo"); // abre com C2:C9 selecionado
  await visivel(page, "botao-validacao").click();
  const janela = visivel(page, "janela-validacao");
  await janela.getByTestId("validacao-permitir").selectOption("data");
  await janela.getByTestId("validacao-operador").selectOption("entre");
  await janela.getByTestId("validacao-valor1").fill("01/11/2026");
  await janela.getByTestId("validacao-valor2").fill("30/11/2026");
  await janela.getByTestId("validacao-ok").click();
  await verificarCorreto(page);
});
