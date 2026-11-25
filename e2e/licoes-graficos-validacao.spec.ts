import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

async function selecionar(page: Page, de: string, ate: string) {
  await celula(page, de).click();
  await celula(page, ate).click({ modifiers: ["Shift"] });
}

async function inserirGrafico(page: Page, tipo: string) {
  await visivel(page, "botao-grafico").click();
  await visivel(page, "menu-grafico").locator(`[data-tipo-grafico="${tipo}"]`).click();
}

async function titulo(page: Page, texto: string) {
  const campo = visivel(page, "painel-grafico").getByTestId("grafico-titulo");
  await campo.fill(texto);
  await campo.press("Enter");
}

async function digitar(page: Page, end: string, texto: string) {
  await celula(page, end).click();
  await page.keyboard.insertText(texto);
  await page.keyboard.press("Enter");
}

async function abrirValidacao(page: Page) {
  await visivel(page, "botao-validacao").click();
  return visivel(page, "janela-validacao");
}

test.describe("gráficos: lições 6 a 10", () => {
  test("escolher o gráfico pela pergunta: linhas para a evolução", async ({ page }) => {
    await abrir(page, "grafico-escolher-tipo");
    await celula(page, "A2").click();
    await inserirGrafico(page, "linhas");
    await expect(visivel(page, "grafico-0").locator("[data-linha-grafico]")).toHaveCount(1);
    await verificarCorreto(page);
  });

  test("colunas empilhadas: uma coluna por mês com as três áreas", async ({ page }) => {
    await abrir(page, "grafico-empilhadas");
    await celula(page, "B3").click();
    await inserirGrafico(page, "empilhadas");
    await expect(visivel(page, "grafico-0").locator("[data-barra-grafico]")).toHaveCount(18);
    await verificarCorreto(page);
  });

  test("realizado em colunas e meta em linha", async ({ page }) => {
    await abrir(page, "grafico-realizado-meta");
    await celula(page, "A1").click();
    await inserirGrafico(page, "combinado");
    const g = visivel(page, "grafico-0");
    await expect(g.locator("[data-barra-grafico]")).toHaveCount(12);
    await expect(g.locator("[data-linha-grafico]")).toHaveCount(1);
    await verificarCorreto(page);
  });

  test("do lançamento ao gráfico: SOMASE no resumo e colunas", async ({ page }) => {
    await abrir(page, "grafico-resumo-formulas");
    for (let i = 2; i <= 5; i++) await digitar(page, `F${i}`, `=SOMASE($B$2:$B$15;E${i};$C$2:$C$15)`);
    await expect(celula(page, "F4")).toHaveText("R$ 964,10");
    await selecionar(page, "E1", "F5");
    await inserirGrafico(page, "colunas");
    await expect(visivel(page, "grafico-0").locator("[data-barra-grafico]")).toHaveCount(4);
    await verificarCorreto(page);
  });

  test("painel do trimestre: dois gráficos com título, rótulos e posição", async ({ page }) => {
    await abrir(page, "grafico-painel-trimestre");
    await celula(page, "A1").click();
    await inserirGrafico(page, "combinado");
    await titulo(page, "Realizado x Meta");
    await celula(page, "A8").click();
    await inserirGrafico(page, "pizza");
    const painel = visivel(page, "painel-grafico");
    await painel.getByTestId("grafico-rotulos").check();
    await titulo(page, "Vendas por canal");
    await painel.getByTestId("grafico-posicao").fill("E12");
    await painel.getByTestId("grafico-posicao").press("Enter");
    await expect(visivel(page, "grafico-1").locator("[data-rotulo-grafico]")).toHaveCount(4);
    await verificarCorreto(page);
  });

  test("celular: o gráfico inserido cabe na área visível da grade e a prévia não corta", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, baseURL: test.info().project.use.baseURL });
    const page = await ctx.newPage();
    await abrir(page, "grafico-colunas-certas");
    await celula(page, "A1").click();
    await celula(page, "C7").click({ modifiers: ["Shift"] });
    await inserirGrafico(page, "colunas");
    const grade = visivel(page, "grade");
    const grafico = visivel(page, "grafico-0");
    await expect(grafico.locator("[data-barra-grafico]")).toHaveCount(12);
    await page.waitForTimeout(400);
    const g = (await grade.boundingBox())!;
    const c = (await grafico.boundingBox())!;
    expect(c.width).toBeLessThanOrEqual(g.width);
    expect(c.x).toBeGreaterThanOrEqual(g.x);
    expect(c.x + c.width).toBeLessThanOrEqual(g.x + g.width + 1);
    const previa = visivel(page, "previa-grafico");
    const p = (await previa.boundingBox())!;
    const s = (await previa.locator("svg").boundingBox())!;
    expect(s.x + s.width).toBeLessThanOrEqual(p.x + p.width + 1);
    await ctx.close();
  });
});

test.describe("validação: lições 6 a 10", () => {
  test("lista que vem da aba Listas", async ({ page }) => {
    await abrir(page, "validacao-lista-outra-aba");
    await selecionar(page, "C2", "C10");
    const janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("lista");
    await janela.getByTestId("validacao-fonte").fill("=Listas!$A$2:$A$6");
    await janela.getByTestId("validacao-ok").click();
    await celula(page, "C3").click();
    await visivel(page, "seta-lista").click();
    await expect(visivel(page, "itens-lista").locator("[data-item-lista]")).toHaveCount(5);
    await visivel(page, "itens-lista").locator('[data-item-lista="Família"]').click();
    await expect(celula(page, "C3")).toHaveText("Família");
    await verificarCorreto(page);
  });

  test("alerta Aviso: configurar o estilo", async ({ page }) => {
    await abrir(page, "validacao-alerta-aviso");
    await selecionar(page, "C2", "C10");
    const janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("decimal");
    await janela.getByTestId("validacao-valor1").fill("0");
    await janela.getByTestId("validacao-valor2").fill("500");
    await janela.locator('[data-aba-validacao="erro"]').click();
    await janela.getByTestId("validacao-estilo").selectOption("aviso");
    await janela.getByTestId("validacao-erro-titulo").fill("Valor alto");
    await janela.getByTestId("validacao-erro-texto").fill("Acima de R$ 500,00 precisa da aprovação do gestor.");
    await janela.getByTestId("validacao-ok").click();
    await verificarCorreto(page);
  });

  test("alerta Aviso: Não volta para editar, Sim grava", async ({ page }) => {
    await abrir(page, "validacao-alerta-aviso-variacao-b");
    await digitar(page, "C4", "1280");
    const alerta = visivel(page, "alerta-validacao");
    await expect(alerta).toContainText("Valor alto: Acima de R$ 500,00 precisa da aprovação do gestor. Deseja continuar?");
    await alerta.getByTestId("alerta-nao").click();
    await expect(visivel(page, "alerta-validacao")).toHaveCount(0);
    await page.keyboard.press("Enter");
    await visivel(page, "alerta-validacao").getByTestId("alerta-sim").click();
    await expect(celula(page, "C4")).toHaveText("R$ 1.280,00");
    await verificarCorreto(page);
  });

  test("personalizado: desconto até 10% do pedido", async ({ page }) => {
    await abrir(page, "validacao-personalizada");
    await selecionar(page, "C2", "C10");
    const janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("personalizado");
    await janela.getByTestId("validacao-formula").fill("=E(C2>=0;C2<=B2*10%)");
    await janela.getByTestId("validacao-ok").click();
    await digitar(page, "C5", "900");
    await expect(page.getByText("Este valor não corresponde às restrições").filter({ visible: true }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await digitar(page, "C5", "850");
    await expect(celula(page, "C5")).toHaveText("R$ 850,00");
    await verificarCorreto(page);
  });

  test("sem repetir: CONT.SE na regra barra a nota lançada duas vezes", async ({ page }) => {
    await abrir(page, "validacao-sem-repetir");
    await selecionar(page, "A2", "A20");
    const janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("personalizado");
    await janela.getByTestId("validacao-formula").fill("=CONT.SE($A$2:$A$20;A2)=1");
    await janela.getByTestId("validacao-ok").click();
    await digitar(page, "A8", "1503");
    await expect(page.getByText("Este valor não corresponde às restrições").filter({ visible: true }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(celula(page, "A8")).toHaveText("");
    await verificarCorreto(page);
  });

  test("cadastro de clientes: CPF com duas condições e UF da aba Listas", async ({ page }) => {
    await abrir(page, "validacao-cadastro-clientes");
    await selecionar(page, "B2", "B13");
    let janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("personalizado");
    await janela.getByTestId("validacao-formula").fill("=E(NÚM.CARACT(B2)=11;CONT.SE($B$2:$B$13;B2)=1)");
    await janela.getByTestId("validacao-ok").click();
    await selecionar(page, "C2", "C13");
    janela = await abrirValidacao(page);
    await janela.getByTestId("validacao-permitir").selectOption("lista");
    await janela.getByTestId("validacao-fonte").fill("=Listas!$A$2:$A$8");
    await janela.getByTestId("validacao-ok").click();
    await verificarCorreto(page);
  });
});
