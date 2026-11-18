import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, simularCorrecao } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("N1: no teste, 'Próxima questão' aparece no retorno, com foco e à vista, e a questão respondida trava", async ({ page }) => {
  await simularCorrecao(page, [false, true, true, true, true]);
  await page.goto("/teste/intro");
  const campo = visivel(page, "campo-resposta");
  await campo.fill("F9");
  await visivel(page, "verificar").click();
  const resultado = visivel(page, "resultado");
  await expect(resultado).toContainText("Resposta registrada");
  const proxima = resultado.getByTestId("proxima-teste");
  await expect(proxima).toBeFocused();
  await expect(proxima).toBeInViewport();
  // Travada: o campo é só leitura e a grade não aceita digitação.
  await expect(campo).toHaveAttribute("readonly", "");
  await campo.click({ force: true }).catch(() => {});
  await page.keyboard.type("A1");
  await expect(campo).toHaveValue("F9");
  await expect(page.locator("[data-travada]").filter({ visible: true })).toHaveCount(1);
  await proxima.click();
  await expect(page.getByTestId("questao-teste")).toContainText("Questão 2 de 5");
  // A próxima questão vem destravada.
  await expect(page.locator("[data-travada]")).toHaveCount(0);
});

test("#12: Formatação Condicional com uma célula só em 'Aplica-se a' avisa, sem adivinhar", async ({ page }) => {
  await abrir(page, "destaque-vendas-baixas-variacao-a");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="maior"]').click();
  const janela = visivel(page, "janela-regra");
  await expect(janela.getByTestId("regra-intervalo")).toHaveValue("A1");
  await expect(janela.getByTestId("aviso-uma-celula")).toContainText("Só a célula A1 vai receber a regra");
  await janela.getByTestId("regra-intervalo").fill("C2:C11");
  await expect(janela.getByTestId("aviso-uma-celula")).toHaveCount(0);
});

test("#24: aba com espaço sem aspas não pinta o intervalo da aba atual", async ({ page }) => {
  await abrir(page, "abas-total-de-outra-aba-pegadinha");
  await celula(page, "B2").click();
  await page.keyboard.insertText("=SOMA(Vendas 2025!B2:B6");
  await expect(visivel(page, "barra-formulas")).toHaveValue("=SOMA(Vendas 2025!B2:B6");
  await expect(page.locator('[data-testid="referencia-colorida"]').filter({ visible: true })).toHaveCount(0);
  // Uma referência da própria aba continua pintada.
  await page.keyboard.insertText(";C2");
  await expect(page.locator('[data-testid="referencia-colorida"][data-intervalo="C2"]').filter({ visible: true })).toHaveCount(1);
});

/** A célula inteira dentro da área visível da grade. */
async function celulaAVista(page: Page, end: string) {
  const amostra = page.getByTestId("exercicio-embutido");
  const grade = amostra.getByTestId("grade");
  const alvo = amostra.locator(`[data-celula="${end}"]`);
  await expect(alvo).toBeVisible();
  await expect
    .poll(async () => {
      const g = (await grade.boundingBox())!;
      const c = (await alvo.boundingBox())!;
      return c.x >= g.x - 1 && c.x + c.width <= g.x + g.width + 1 && c.y >= g.y - 1 && c.y + c.height <= g.y + g.height + 1;
    })
    .toBe(true);
}

test("#20 e 23: PROCV no /pro abre com G2 à vista, e o acerto não solta confete sobre a página", async ({ page }) => {
  await page.goto("/pro");
  await expect(page.getByTestId("aba-amostra-procv")).toHaveAttribute("aria-selected", "true");
  const yAntes = await page.evaluate(() => window.scrollY);
  await celulaAVista(page, "G2");
  // Sem rolar a página nem puxar o foco para a grade.
  expect(await page.evaluate(() => window.scrollY)).toBe(yAntes);
  await digitar(page, "G2", "=PROCV(F2;A2:C6;3;FALSO)");
  const amostra = page.getByTestId("exercicio-embutido");
  await amostra.getByTestId("verificar").click();
  await expect(amostra.getByTestId("resultado")).toContainText("Correto!");
  await page.waitForTimeout(300);
  await expect(page.locator("canvas")).toHaveCount(0);
});

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("#20: PROCV no /pro, no celular, também abre com G2 à vista", async ({ page }) => {
    await page.goto("/pro");
    await celulaAVista(page, "G2");
  });
});
