import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("P3-1: autocompletar e dica de argumentos", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.type("=so");
  const lista = visivel(page, "sugestoes");
  await expect(lista.getByRole("option").first()).toHaveText(/^SOMA/);
  await expect(lista).toContainText("SOMASE");

  await page.keyboard.press("Enter"); // escolhe, não confirma a célula
  const editor = page.getByTestId("editor-celula");
  await expect(editor).toHaveValue("=SOMA(");
  const dica = visivel(page, "dica-argumentos");
  await expect(dica.locator("strong")).toHaveText("núm1");
  await page.keyboard.type("B2:B7;");
  await expect(dica.locator("strong")).toHaveText("[núm2]");

  await page.keyboard.press("Backspace");
  await page.keyboard.type(")");
  await expect(dica).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
});

test("P3-1: Esc fecha só a lista, sem cancelar a edição; acento é opcional", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.type("=med");
  await expect(visivel(page, "sugestoes")).toContainText("MÉDIA");
  await page.keyboard.press("Escape");
  await expect(visivel(page, "sugestoes")).toHaveCount(0);
  await expect(page.getByTestId("editor-celula")).toHaveValue("=med");
});

test("P3-2: F4 alterna o $ da referência", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "C2").click();
  await page.keyboard.type("=B2");
  const editor = page.getByTestId("editor-celula");
  for (const esperado of ["=$B$2", "=B$2", "=$B2", "=B2"]) {
    await page.keyboard.press("F4");
    await expect(editor).toHaveValue(esperado);
  }
  // na barra de fórmulas também
  const barra = page.getByTestId("barra-formulas");
  await barra.click();
  await page.keyboard.press("End");
  await page.keyboard.press("F4");
  await expect(barra).toHaveValue("=$B$2");
});

test("P3-3: setas apontam a referência, com cores na grade", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.type("=SOMA(");
  await page.keyboard.press("ArrowUp");
  const editor = page.getByTestId("editor-celula");
  await expect(editor).toHaveValue("=SOMA(B7");
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowUp");
  await expect(editor).toHaveValue("=SOMA(B2:B7");
  await expect(page.locator('[data-testid="referencia-colorida"][data-intervalo="B2:B7"]')).toBeVisible();
  await page.keyboard.type(")");
  await expect(editor).toHaveValue("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
});

test("P3-3: arrastar sobre a grade insere um intervalo", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "C2").click();
  await page.keyboard.type("=SOMA(");
  await celula(page, "B2").hover();
  await page.mouse.down();
  await celula(page, "B5").hover();
  await page.mouse.up();
  await expect(page.getByTestId("editor-celula")).toHaveValue("=SOMA(B2:B5");
  // clicar em outra célula logo depois troca a referência apontada
  await celula(page, "B6").click();
  await expect(page.getByTestId("editor-celula")).toHaveValue("=SOMA(B6");
});

test("P3-4: Ctrl+setas, Home, Ctrl+Home/End, Ctrl+A e cabeçalhos", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  const nome = page.getByTestId("caixa-nome");
  await celula(page, "A1").click();
  await page.keyboard.press("Control+ArrowDown");
  await expect(nome).toHaveText("A8");
  await page.keyboard.press("Control+ArrowDown");
  await expect(nome).toHaveText("A10");
  await page.keyboard.press("Control+ArrowUp");
  await expect(nome).toHaveText("A8");
  await celula(page, "B5").click();
  await page.keyboard.press("Home");
  await expect(nome).toHaveText("A5");
  await page.keyboard.press("Control+End");
  await expect(nome).toHaveText("B8");
  await page.keyboard.press("Control+Home");
  await expect(nome).toHaveText("A1");
  await page.keyboard.press("Control+Shift+ArrowDown");
  await expect(nome).toHaveText("A1:A8");
  await page.keyboard.press("Control+a");
  await expect(nome).toHaveText(/^A1:[A-Z]+\d+$/);
  await page.locator('[data-cabecalho="B"]').filter({ visible: true }).click();
  await expect(nome).toHaveText("B1:B10");
});

test("P3-6: a correção explica o erro (intervalo curto)", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B6)");
  await page.keyboard.press("Enter");
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("termina cedo demais");
});

test("P3-5: texto longo invade a vizinha vazia; número que não cabe vira ####", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "C2").click();
  await page.keyboard.insertText("Observação bem comprida sobre janeiro");
  await page.keyboard.press("Enter");
  const camada = celula(page, "C2").locator("span");
  await expect(camada).toHaveText("Observação bem comprida sobre janeiro");
  expect((await camada.boundingBox())!.width).toBeGreaterThan(150);

  await celula(page, "B8").click();
  await page.keyboard.insertText("=B2*1000000000");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/^#+$/);

  // duplo clique na borda do cabeçalho ajusta a coluna e o número aparece
  await page.locator('[data-borda-coluna="B"]').filter({ visible: true }).dblclick();
  await expect(celula(page, "B8")).toHaveText(/1\.200\.000\.000\.000,00/);
});

test("P3-5: arrastar a borda do cabeçalho muda a largura", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  const antes = (await celula(page, "C2").boundingBox())!.width;
  const borda = page.locator('[data-borda-coluna="C"]').filter({ visible: true });
  const b = (await borda.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + b.height / 2, { steps: 4 });
  await page.mouse.up();
  expect((await celula(page, "C2").boundingBox())!.width).toBeGreaterThan(antes + 40);
});

test("P3-7: Ctrl+Z desfaz a formatação e Ctrl+Y refaz", async ({ page }) => {
  await page.goto("/exercicios/formato-moeda");
  await celula(page, "B2").click();
  await page.getByTestId("formatar-moeda").click();
  await expect(celula(page, "B2")).toHaveText(/R\$\s2,50/);
  await celula(page, "B2").click(); // devolve o foco para a grade
  await page.keyboard.press("Control+z");
  await expect(celula(page, "B2")).toHaveText("2,5");
  await page.keyboard.press("Control+y");
  await expect(celula(page, "B2")).toHaveText(/R\$\s2,50/);
});
