import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("ARRED: parcelas que fecham o total", async ({ page }) => {
  await abrir(page, "arred-parcelas-que-fecham");
  await digitar(page, "B5", "=ARRED($B$1/$B$2;2)");
  await digitar(page, "B6", "=ARRED($B$1/$B$2;2)");
  await digitar(page, "B7", "=ARRED($B$1/$B$2;2)");
  await expect(celula(page, "B8")).toHaveText(/999,99/);
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("falta um centavo");
  await digitar(page, "B7", "=B1-SOMA(B5:B6)");
  await expect(celula(page, "B8")).toHaveText(/1\.000,00/);
  await verificarCorreto(page);
});

test("SOMARPRODUTO: o total do pedido", async ({ page }) => {
  await abrir(page, "somarproduto-total-do-pedido");
  await digitar(page, "B8", "=SOMA(B2:B6)*SOMA(C2:C6)");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("própria linha");
  await digitar(page, "B8", "=SOMARPRODUTO(B2:B6;C2:C6)");
  await expect(celula(page, "B8")).toHaveText(/1\.666,40/);
  await verificarCorreto(page);
});

test("orçamento: totais, diferença e participação com $ misto", async ({ page }) => {
  await abrir(page, "orcamento-do-departamento");
  await digitar(page, "B7", "=SOMA(B2:B6)");
  await digitar(page, "C7", "=SOMA(C2:C6)");
  for (let l = 2; l <= 7; l++) await digitar(page, `D${l}`, `=C${l}-B${l}`);
  for (let l = 2; l <= 6; l++) {
    await digitar(page, `E${l}`, `=B${l}/B$7`);
    await digitar(page, `F${l}`, `=C${l}/C$7`);
  }
  await expect(celula(page, "D7")).toHaveText(/1\.800,00/);
  await expect(celula(page, "E3")).toHaveText(/76,5/);
  await verificarCorreto(page);
});

test("TEXTO: data e valor dentro de uma frase", async ({ page }) => {
  await abrir(page, "texto-data-e-valor-na-frase");
  await digitar(page, "D2", '="Valor de R$ "&B2&" com vencimento em "&C2');
  await expect(celula(page, "D2")).toHaveText("Valor de R$ 1250 com vencimento em 46361");
  for (let l = 2; l <= 4; l++)
    await digitar(page, `D${l}`, `="Valor de R$ "&TEXTO(B${l};"#.##0,00")&" com vencimento em "&TEXTO(C${l};"dd/mm/aaaa")`);
  await expect(celula(page, "D3")).toHaveText("Valor de R$ 3.480,50 com vencimento em 10/12/2026");
  await verificarCorreto(page);
});

test("LOCALIZAR duas vezes: o número entre os hífens", async ({ page }) => {
  await abrir(page, "localizar-entre-dois-hifens");
  for (let l = 2; l <= 5; l++) {
    await digitar(page, `B${l}`, `=LOCALIZAR("-";A${l})`);
    await digitar(page, `C${l}`, `=LOCALIZAR("-";A${l};B${l}+1)`);
    await digitar(page, `D${l}`, `=EXT.TEXTO(A${l};B${l}+1;C${l}-B${l}-1)`);
  }
  await expect(celula(page, "D4")).toHaveText("31877");
  await expect(celula(page, "D5")).toHaveText("7");
  await verificarCorreto(page);
});

test("lista de clientes: nome, CPF com 11 dígitos e UF", async ({ page }) => {
  await abrir(page, "caso-lista-de-clientes");
  for (let l = 2; l <= 5; l++) {
    await digitar(page, `D${l}`, `=PRI.MAIÚSCULA(ARRUMAR(A${l}))`);
    await digitar(page, `E${l}`, `=TEXTO(B${l};"00000000000")`);
    await digitar(page, `F${l}`, `=MAIÚSCULA(ARRUMAR(C${l}))`);
  }
  await expect(celula(page, "D2")).toHaveText("João Pereira");
  await expect(celula(page, "E4")).toHaveText("00345678901");
  await expect(celula(page, "F3")).toHaveText("RJ");
  await verificarCorreto(page);
});
