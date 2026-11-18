import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, limparArmazenamento } from "./ajuda";

// Só teclado: a grade não prende o Tab, os botões respondem a Enter/Espaço,
// os menus abrem com o foco dentro e fecham com Esc (A1, A2, A5 da revisão).

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const focado = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName);

/** Aperta Tab até o foco chegar no elemento (ou falha depois de `max` tentativas). */
async function tabAte(page: Page, testid: string, max = 30) {
  for (let i = 0; i < max; i++) {
    if ((await focado(page)) === testid) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab não chegou em ${testid} (parou em ${await focado(page)})`);
}

/** Sai da grade como o atalho manda: Esc e depois Tab. */
async function sairDaGrade(page: Page) {
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  expect(await focado(page)).not.toBe("editor-celula");
}

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("fórmula do começo ao Verificar só com o teclado", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  // A grade já abre com o foco (a digitação vai para ela).
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowDown");
  await expect(visivel(page, "editor-celula")).toHaveAttribute("aria-label", /^Célula B8/);
  await page.keyboard.type("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
  // No modo pronto o Tab anda para a direita, como no Excel...
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  await expect(visivel(page, "editor-celula")).toHaveAttribute("aria-label", /^Célula C8/);
  // ...e Esc + Tab sai da grade.
  await sairDaGrade(page);
  await tabAte(page, "verificar");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
});

test("Shift+Tab também sai, e o foco não volta sozinho para a grade", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+Tab");
  const fora = await focado(page);
  expect(fora).not.toBe("editor-celula");
  await page.waitForTimeout(300);
  expect(await focado(page)).toBe(fora);
});

test("filtro do começo ao Verificar só com o teclado (Alt+↓ abre o menu)", async ({ page }) => {
  await abrir(page, "dados-filtrar-regiao");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Control+Shift+L");
  await expect(visivel(page, "seta-filtro-B")).toBeVisible();
  await page.keyboard.press("ArrowUp"); // B1, o cabeçalho com a seta
  await page.keyboard.press("Alt+ArrowDown");
  const menu = visivel(page, "menu-filtro");
  await expect(menu).toBeVisible();
  // O foco entra no menu.
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="menu-filtro"]'))).toBe(true);
  await tabAte(page, "filtro-selecionar-tudo");
  await page.keyboard.press("Space");
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if ((await page.evaluate(() => document.activeElement?.getAttribute("data-valor-filtro"))) === "Sul") break;
  }
  await page.keyboard.press("Space");
  await tabAte(page, "filtro-ok");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
  await expect(visivel(page, "registros-encontrados")).toHaveText("4 de 9 registros encontrados");
  // O foco volta para a grade.
  await sairDaGrade(page);
  await tabAte(page, "verificar");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
});

test("botões da barra respondem a Enter e Espaço", async ({ page }) => {
  await abrir(page, "dados-filtrar-regiao");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("ArrowDown");
  await page.getByTestId("botao-filtro").focus();
  await page.keyboard.press("Enter");
  await expect(visivel(page, "seta-filtro-A")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(visivel(page, "seta-filtro-A")).toHaveCount(0);
});

test("Esc fecha os menus e as janelas, e o foco volta", async ({ page }) => {
  // Formatação condicional: menu, janela da regra e gerenciador.
  await abrir(page, "destaque-vendas-baixas");
  const botaoCond = visivel(page, "botao-condicional");
  await botaoCond.focus();
  await page.keyboard.press("Enter");
  const menuCond = visivel(page, "menu-condicional");
  await expect(menuCond).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("role"))).toBe("menuitem");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-regra="menor"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(visivel(page, "gerenciar-regras")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator('[data-regra="maior"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuCond).toHaveCount(0);
  await expect(botaoCond).toBeFocused();

  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter"); // "É Menor do que…"
  const janela = visivel(page, "janela-regra");
  await expect(janela).toHaveAttribute("role", "dialog");
  await expect(visivel(page, "regra-valor")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(janela).toHaveCount(0);
  await expect(botaoCond).toBeFocused();

  // Gráfico.
  await abrir(page, "grafico-vendas-por-mes");
  const botaoGraf = visivel(page, "botao-grafico");
  await botaoGraf.focus();
  await page.keyboard.press("Space");
  await expect(visivel(page, "menu-grafico")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(visivel(page, "menu-grafico")).toHaveCount(0);
  await expect(botaoGraf).toBeFocused();

  // Validação de dados: janela com abas nas setas, e a lista com Alt+↓.
  await abrir(page, "validacao-lista-status");
  const botaoVal = visivel(page, "botao-validacao");
  await botaoVal.focus();
  await page.keyboard.press("Enter");
  const janelaVal = visivel(page, "janela-validacao");
  await expect(janelaVal).toHaveAttribute("role", "dialog");
  await expect(visivel(page, "validacao-permitir")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(janelaVal).toHaveCount(0);
  await expect(botaoVal).toBeFocused();
});

test("lista da validação: Alt+↓ abre, setas escolhem, Enter grava, Esc fecha", async ({ page }) => {
  await abrir(page, "validacao-lista-status");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  // Cria a lista só com o teclado.
  await sairDaGrade(page);
  await page.getByTestId("botao-validacao").filter({ visible: true }).focus();
  await page.keyboard.press("Enter");
  await visivel(page, "validacao-permitir").selectOption("lista");
  await visivel(page, "validacao-fonte").fill("Pago;Pendente;Cancelado");
  await visivel(page, "validacao-fonte").press("Enter");
  await expect(visivel(page, "janela-validacao")).toHaveCount(0);
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Alt+ArrowDown");
  const lista = visivel(page, "itens-lista");
  await expect(lista).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(lista).toHaveCount(0);
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("Alt+ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(celula(page, "C2")).toHaveText("Pendente");
});

test("tabela dinâmica criada e configurada só com o teclado", async ({ page }) => {
  await abrir(page, "dinamica-total-por-regiao");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("ArrowDown");
  const botao = visivel(page, "botao-dinamica");
  await botao.focus();
  await page.keyboard.press("Enter");
  await expect(visivel(page, "dinamica-origem")).toBeFocused();
  await page.keyboard.press("Enter"); // OK com o intervalo sugerido
  await expect(visivel(page, "painel-dinamica")).toBeVisible();
  await expect.poll(() => focado(page)).toBe("editor-celula");
  // Do editor, Esc + Tab até as caixas dos campos.
  await page.keyboard.press("Escape");
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    if ((await page.evaluate(() => document.activeElement?.getAttribute("data-campo"))) === "Região") break;
  }
  await page.keyboard.press("Space");
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    if ((await page.evaluate(() => document.activeElement?.getAttribute("data-campo"))) === "Valor") break;
  }
  await page.keyboard.press("Space");
  await expect(page.locator('[data-item-area="Soma de Valor"]').filter({ visible: true })).toBeVisible();
  await tabAte(page, "verificar", 60);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
});

test.describe("celular 360 px", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test("menu do filtro aberto não cria rolagem horizontal", async ({ page }) => {
    await abrir(page, "dados-filtrar-regiao");
    await celula(page, "B3").click();
    await page.keyboard.press("Control+Shift+L");
    await visivel(page, "seta-filtro-B").click();
    await expect(visivel(page, "menu-filtro")).toBeVisible();
    const larguras = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, tela: document.documentElement.clientWidth }));
    expect(larguras.scroll).toBeLessThanOrEqual(larguras.tela);
    const caixa = await visivel(page, "menu-filtro").boundingBox();
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(360);
  });

  test("célula ativa fora da tela: a grade rola até ela na abertura (E4 no Intro 1)", async ({ page }) => {
    await page.goto("/exercicios/nome-da-celula");
    const grade = visivel(page, "grade");
    await expect(grade).toBeVisible();
    await expect.poll(async () => {
      const g = await grade.boundingBox();
      const c = await celula(page, "E4").boundingBox();
      return !!g && !!c && c.x >= g.x - 1 && c.x + c.width <= g.x + g.width + 1;
    }).toBe(true);
  });
});

test("axe sem violações num exercício com os painéis abertos", async ({ page }) => {
  await abrir(page, "dinamica-total-por-regiao");
  await expect.poll(() => focado(page)).toBe("editor-celula");
  await page.keyboard.press("ArrowDown");
  await visivel(page, "botao-dinamica").click();
  await visivel(page, "dinamica-ok").click();
  await page.locator('[data-campo="Região"]').filter({ visible: true }).check();
  await page.locator('[data-campo="Valor"]').filter({ visible: true }).check();
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

  // Formatação condicional e gráfico, com o menu aberto.
  await abrir(page, "grafico-vendas-por-mes");
  await celula(page, "A2").click();
  await visivel(page, "botao-grafico").click();
  await page.locator('[data-tipo-grafico="colunas"]').filter({ visible: true }).click();
  await expect(visivel(page, "painel-grafico")).toBeVisible();
  const r2 = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r2.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

  await abrir(page, "destaque-vendas-baixas");
  await visivel(page, "botao-condicional").click();
  const r3 = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r3.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test("/pro: a coluna da resposta do PROCV embutido aparece inteira", async ({ page }) => {
  await page.goto("/pro");
  const g2 = page.locator('[data-celula="G2"]').filter({ visible: true }).first();
  await g2.scrollIntoViewIfNeeded();
  const grade = page.getByTestId("grade").filter({ has: g2 });
  await expect
    .poll(async () => {
      const g = await grade.boundingBox();
      const c = await g2.boundingBox();
      return !!g && !!c && c.x + c.width <= g.x + g.width + 1;
    })
    .toBe(true);
});
