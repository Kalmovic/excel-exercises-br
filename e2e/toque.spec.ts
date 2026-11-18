import { devices, expect, test } from "@playwright/test";

// Celular de verdade: tela de toque, sem mouse nem teclado físico.
const { defaultBrowserType: _ignorado, ...pixel } = devices["Pixel 7"];
void _ignorado;
test.use(pixel);

const cel = (page: import("@playwright/test").Page, end: string) => page.locator(`[data-celula="${end}"]`).first();
const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test("celular: exercício de setas vira 'toque em C3' e aceita o toque", async ({ page }) => {
  await page.goto("/exercicios/navegar-pelo-teclado");
  await expect(page.locator("main")).toContainText("No celular não há setas");
  await cel(page, "C3").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: enunciado acima da planilha e intervalo selecionado em dois toques", async ({ page }) => {
  await page.goto("/exercicios/selecionar-intervalo");
  const enunciado = page.getByText("depois em B2").filter({ visible: true });
  await expect(enunciado).toBeVisible(); // o texto de toque entra depois de a página carregar
  const yEnunciado = (await enunciado.boundingBox())!.y;
  const yGrade = (await cel(page, "A1").boundingBox())!.y;
  expect(yEnunciado).toBeLessThan(yGrade);
  await expect(page.getByTestId("atalhos")).toBeHidden(); // atalhos de teclado não aparecem
  await page.getByTestId("selecionar-intervalo").tap();
  await expect(page.getByTestId("ajuda-toque")).toContainText("primeira célula");
  await cel(page, "B2").tap();
  await expect(page.getByTestId("ajuda-toque")).toContainText("última célula");
  await cel(page, "D5").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: preencher para baixo copia a fórmula sem Ctrl+D", async ({ page }) => {
  await page.goto("/exercicios/se-aninhado-otimo-bom");
  await cel(page, "C2").dblclick(); // toque duplo: edição
  await page.keyboard.insertText('=SE(B2>=9;"Ótimo";SE(B2>=7;"Bom";"Recuperação"))');
  await page.keyboard.press("Enter");
  await page.getByTestId("selecionar-intervalo").tap();
  await cel(page, "C2").tap();
  await cel(page, "C6").tap();
  await page.getByTestId("preencher-abaixo").tap();
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: um toque seleciona sem abrir o teclado; o toque duplo abre", async ({ page }) => {
  await page.goto("/exercicios/digitar-um-valor");
  const editor = page.getByTestId("editor-celula");
  await cel(page, "B3").tap();
  await expect(editor).toHaveAttribute("inputmode", "none"); // teclado do celular fechado
  await page.getByTestId("selecionar-intervalo").tap(); // botão também não abre
  await page.getByTestId("selecionar-intervalo").tap(); // (liga e desliga o modo, sem mudar dados)
  await expect(editor).toHaveAttribute("inputmode", "none");
  await cel(page, "B3").dblclick();
  await expect(editor).toHaveAttribute("inputmode", "text"); // agora o teclado abre
  await expect(editor).toBeFocused();
  await page.keyboard.insertText("150");
  await page.keyboard.press("Enter");
  await expect(editor).toHaveAttribute("inputmode", "none"); // confirmou: fecha de novo
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: sem a linha de atalhos de teclado embaixo da grade", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await expect(visivel(page, "verificar")).toBeVisible();
  await expect(page.getByTestId("atalhos")).toHaveCount(0);
});

/** O número da linha `l` aparece inteiro dentro da grade e à esquerda da célula `end`. */
async function numeroDaLinhaAVista(page: import("@playwright/test").Page, l: number, end: string) {
  const grade = await visivel(page, "grade").boundingBox();
  const num = await page.locator(`[data-cabecalho="${l}"]`).filter({ visible: true }).boundingBox();
  const c = await cel(page, end).boundingBox();
  if (!grade || !num || !c) return false;
  return num.x >= grade.x - 1 && num.x + num.width <= grade.x + grade.width + 1 && c.x >= num.x + num.width - 1;
}

test("celular: a grade rola até E4 e os números das linhas continuam à vista (N8, #1)", async ({ page }) => {
  await page.goto("/exercicios/nome-da-celula");
  await expect(visivel(page, "grade")).toBeVisible();
  await expect.poll(() => visivel(page, "grade").evaluate((g) => g.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => numeroDaLinhaAVista(page, 4, "E4")).toBe(true);
  // E4 inteira, sem ficar por baixo da coluna fixa dos números.
  const grade = (await visivel(page, "grade").boundingBox())!;
  const e4 = (await cel(page, "E4").boundingBox())!;
  expect(e4.x + e4.width).toBeLessThanOrEqual(grade.x + grade.width + 1);
});

test("celular: gráfico inserido maior que a tela aparece a partir do começo, ao lado dos números das linhas (#27)", async ({ page }) => {
  await page.goto("/exercicios/grafico-vendas-por-mes");
  await expect(visivel(page, "verificar")).toBeVisible();
  await cel(page, "A2").tap();
  await visivel(page, "botao-grafico").tap();
  await page.locator('[data-tipo-grafico="colunas"]').filter({ visible: true }).tap();
  const grafico = visivel(page, "grafico-0");
  await expect(grafico).toBeVisible();
  await expect
    .poll(async () => {
      const g = (await visivel(page, "grade").boundingBox())!;
      const num = (await page.locator('[data-cabecalho="1"]').filter({ visible: true }).boundingBox())!;
      const gr = (await grafico.boundingBox())!;
      // O começo do gráfico logo depois da coluna fixa dos números (que segue dentro da grade).
      return num.x >= g.x - 1 && Math.abs(gr.x - (num.x + num.width)) <= 2;
    })
    .toBe(true);
});

test("celular: tocar em B6 na demonstração da página inicial não esconde os números das linhas (#19)", async ({ page }) => {
  await page.goto("/");
  const b6 = cel(page, "B6");
  await b6.scrollIntoViewIfNeeded();
  await b6.tap();
  await expect(page.getByTestId("editor-celula")).toBeFocused(); // depois do toque, a grade pega o foco
  await expect.poll(() => numeroDaLinhaAVista(page, 6, "B6")).toBe(true);
});

test("celular: toque duplo numa célula com fórmula seleciona o texto, e digitar substitui (N2)", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas-pegadinha");
  await expect(visivel(page, "verificar")).toBeVisible();
  await cel(page, "B8").dblclick();
  const editor = page.getByTestId("editor-celula");
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue("=SOMA(B2;B7)");
  await expect
    .poll(() => editor.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd]))
    .toEqual([0, "=SOMA(B2;B7)".length]);
  await page.keyboard.insertText("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await expect(cel(page, "B8")).toHaveText(/7\.675,00/);
  await visivel(page, "verificar").tap();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("celular: errar o intervalo explica o botão de seleção por toque, não o mouse (#18)", async ({ page }) => {
  await page.goto("/exercicios/selecionar-intervalo");
  await expect(page.getByText("depois em B2").filter({ visible: true })).toBeVisible();
  await cel(page, "B2").tap();
  await visivel(page, "verificar").tap();
  const r = visivel(page, "resultado");
  await expect(r).toContainText("Toque em ▦ Selecionar intervalo e depois em B2 e D5");
  await expect(r).not.toContainText("mouse");
});
