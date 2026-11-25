import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

/** Nenhuma célula visível mostra "###" (coluna estreita demais para o valor). */
async function semCerquilhas(page: Page) {
  await expect(page.locator("[data-celula]").filter({ visible: true }).filter({ hasText: "###" })).toHaveCount(0);
}

/** Na seta do filtro da coluna, deixa marcados só estes itens. */
async function filtrarSo(page: Page, coluna: string, valores: string[]) {
  await visivel(page, `seta-filtro-${coluna}`).click();
  const menu = visivel(page, "menu-filtro");
  await menu.getByTestId("filtro-selecionar-tudo").uncheck();
  for (const v of valores) await menu.locator(`[data-valor-filtro="${v}"]`).check();
  await menu.getByTestId("filtro-ok").click();
}

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("CLASSIFICARPOR: os nomes na ordem do salário", async ({ page }) => {
  await abrir(page, "classificarpor-salario");
  await digitar(page, "F2", "=CLASSIFICARPOR(A2:A9;D2:D9;-1)");
  await expect(celula(page, "F2")).toHaveText("Diego Alves");
  await expect(celula(page, "F9")).toHaveText("Fábio Nunes");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("FILTRO por pedaço do texto com ÉNÚM e LOCALIZAR", async ({ page }) => {
  await abrir(page, "filtro-texto-parcial");
  await digitar(page, "E2", '=FILTRO(A2:C9;ÉNÚM(LOCALIZAR("Ltda";A2:A9)))');
  await expect(celula(page, "E5")).toHaveText("Ômega Alimentos ltda");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("SEQUÊNCIA: o cronograma de parcelas numa fórmula", async ({ page }) => {
  await abrir(page, "sequencia-cronograma");
  await digitar(page, "B6", "=DATAM(B3;SEQUÊNCIA(B2)-1)");
  await expect(celula(page, "B6")).toHaveText("10/02/2027");
  await expect(celula(page, "B11")).toHaveText("10/07/2027");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("FILTRO dentro do UNIRTEXTO: a lista de cobrança numa célula", async ({ page }) => {
  await abrir(page, "filtro-dentro-de-funcoes");
  await digitar(page, "G4", '=UNIRTEXTO(", ";VERDADEIRO;FILTRO(A2:A9;D2:D9=G1))');
  await expect(celula(page, "G4")).toHaveText("Auto Peças Silva, Escola Aprender, Farmácia Central, Lanchonete Sabor");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("caso: o relatório de pendências com FILTRO e CLASSIFICAR", async ({ page }) => {
  await abrir(page, "caso-relatorio-pendencias");
  await digitar(page, "G4", '=CLASSIFICAR(FILTRO(A2:C11;E2:E11="Pendente");2;1)');
  await expect(celula(page, "G4")).toHaveText("Proc. 078");
  await expect(celula(page, "H4")).toHaveText("27/11/2026");
  await expect(celula(page, "I10")).toHaveText("Clínica Vida");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("Classificar…: dois níveis na janela, setor e salário", async ({ page }) => {
  await abrir(page, "dados-classificar-niveis");
  await celula(page, "B3").click();
  await visivel(page, "classificar-niveis").click();
  const janela = visivel(page, "dialogo-classificar");
  await janela.getByTestId("nivel-coluna-0").selectOption({ label: "Setor" });
  await janela.getByTestId("nivel-ordem-0").selectOption({ label: "De A a Z" });
  await janela.getByTestId("adicionar-nivel").click();
  await janela.getByTestId("nivel-coluna-1").selectOption({ label: "Salário" });
  await janela.getByTestId("nivel-ordem-1").selectOption({ label: "Do Maior para o Menor" });
  await janela.getByTestId("classificar-ok").click();
  await expect(janela).toHaveCount(0);
  await expect(celula(page, "A1")).toHaveText("Funcionário");
  await expect(celula(page, "A2")).toHaveText("Fernanda Costa");
  await expect(celula(page, "A9")).toHaveText("Lucas Ferreira");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("SUBTOTAL(1): a média só do que o filtro mostra", async ({ page }) => {
  await abrir(page, "dados-subtotal-outras-contas");
  await digitar(page, "D13", "=SUBTOTAL(1;D2:D11)");
  await expect(celula(page, "D13")).toHaveText(/1\.564,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("relatório de contas: filtrar, classificar e totalizar", async ({ page }) => {
  await abrir(page, "dados-relatorio-contas");
  await celula(page, "B3").click();
  await page.keyboard.press("Control+Shift+L");
  await filtrarSo(page, "E", ["A pagar"]);
  await expect(visivel(page, "registros-encontrados")).toHaveText("7 de 10 registros encontrados");
  await celula(page, "B3").click();
  await visivel(page, "classificar-asc").click();
  await expect(celula(page, "A5")).toHaveText("Papelaria Central");
  await digitar(page, "C13", "=SUBTOTAL(9;C2:C11)");
  await expect(celula(page, "C13")).toHaveText(/6\.995,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("duplicados: coluna de ocorrência com CONT.SE e filtro nas cópias", async ({ page }) => {
  await abrir(page, "dados-achar-duplicados");
  for (let l = 2; l <= 11; l++) await digitar(page, `D${l}`, `=CONT.SE($A$2:A${l};A${l})`);
  await expect(celula(page, "D11")).toHaveText("3");
  await celula(page, "A2").click();
  await page.keyboard.press("Control+Shift+L");
  await visivel(page, "seta-filtro-D").click();
  const menu = visivel(page, "menu-filtro");
  await menu.locator('[data-valor-filtro="1"]').uncheck();
  await menu.getByTestId("filtro-ok").click();
  await expect(visivel(page, "registros-encontrados")).toHaveText("3 de 10 registros encontrados");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("caso: a pauta de audiências da base de processos", async ({ page }) => {
  await abrir(page, "dados-caso-base-processos");
  await celula(page, "D2").click();
  await page.keyboard.press("Control+Shift+L");
  await filtrarSo(page, "D", ["Audiência"]);
  await celula(page, "E2").click();
  await visivel(page, "classificar-asc").click();
  await expect(celula(page, "A2")).toHaveText("Proc. 104");
  await digitar(page, "F13", "=SUBTOTAL(3;A2:A11)");
  await expect(celula(page, "F13")).toHaveText("5");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("etapa 5 vira questão de concurso; com a fórmula no enunciado, a planilha é só para consulta", async ({ page }) => {
  await abrir(page, "sequencia-cronograma-conceito");
  await expect(visivel(page, "planilha-de-teste")).toHaveAttribute("data-so-consulta", "true");
  await celula(page, "A1").click();
  await page.keyboard.type("=SOMA(SEQUÊNCIA(4;1;10;5))");
  await page.keyboard.press("Enter");
  await expect(celula(page, "A1")).not.toHaveText("70"); // colar a fórmula não entrega a resposta
  const alternativas = visivel(page, "alternativas");
  await alternativas.locator("label").nth(2).click(); // (c) 85
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("começa no próprio 10");
  await alternativas.locator("label").nth(0).click(); // (a) 70
  await verificarCorreto(page);
});
