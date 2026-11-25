import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

async function inserirDinamica(page: Page) {
  await celula(page, "A2").click();
  await visivel(page, "botao-dinamica").click();
  await expect(visivel(page, "dinamica-origem")).toHaveValue("A1:E17");
  await visivel(page, "dinamica-ok").click();
  return visivel(page, "painel-dinamica");
}

async function selecionar(page: Page, de: string, ate: string) {
  await celula(page, de).click();
  await celula(page, ate).click({ modifiers: ["Shift"] });
}

test("dinâmica: Máx. da maior despesa de cada setor", async ({ page }) => {
  await abrir(page, "dinamica-maior-e-menor");
  const painel = await inserirDinamica(page);
  await painel.locator('[data-campo="Setor"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await expect(celula(page, "H1")).toHaveText("Soma de Valor");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Soma de Valor");
  await painel.getByTestId("funcao-valor").selectOption("max");
  await expect(celula(page, "H1")).toHaveText("Máx. de Valor");
  await verificarCorreto(page);
});

test("dinâmica: filtro com vários itens (janeiro e fevereiro)", async ({ page }) => {
  await abrir(page, "dinamica-filtro-varios-itens");
  const painel = await inserirDinamica(page);
  await painel.locator('[data-campo="Setor"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await painel.locator('[data-campo="Mês"]').check(); // vai para Colunas
  await painel.getByLabel("Mover Mês").selectOption("filtros");
  await expect(celula(page, "G1")).toHaveText("Mês");
  await painel.getByTestId("itens-filtro-dinamica").click();
  const menu = visivel(page, "menu-itens-dinamica");
  await menu.getByText("(Tudo)").click();
  await menu.locator('[data-item-dinamica="Jan"]').check();
  await menu.locator('[data-item-dinamica="Fev"]').check();
  await menu.getByTestId("itens-dinamica-ok").click();
  await expect(celula(page, "H1")).toHaveText("(Vários itens)");
  await verificarCorreto(page);
});

test("condicional: prazos vencidos com É Menor do que uma data", async ({ page }) => {
  await abrir(page, "destaque-prazos-vencidos");
  await selecionar(page, "D2", "D11");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="menor"]').click();
  const janela = visivel(page, "janela-regra");
  await janela.getByTestId("regra-valor").fill("18/11/2026");
  await janela.getByTestId("regra-ok").click();
  await expect(celula(page, "D2")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "D5")).not.toHaveAttribute("data-destaque", /.+/); // o prazo de hoje não venceu
  await verificarCorreto(page);
});

test("condicional: Texto que Contém uma palavra no meio do assunto", async ({ page }) => {
  await abrir(page, "destaque-texto-contem");
  await selecionar(page, "C2", "C11");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="texto"]').click();
  const janela = visivel(page, "janela-regra");
  await janela.getByTestId("regra-valor").fill("trabalhista");
  await janela.getByTestId("regra-estilo").selectOption("amarelo");
  await janela.getByTestId("regra-ok").click();
  await expect(celula(page, "C4")).toHaveAttribute("data-destaque", "amarelo");
  await verificarCorreto(page);
});

// ---- Lições 6 a 10 ----

async function inserirDinamicaEm(page: Page, origem: string) {
  await celula(page, "A2").click();
  await visivel(page, "botao-dinamica").click();
  await expect(visivel(page, "dinamica-origem")).toHaveValue(origem);
  await visivel(page, "dinamica-ok").click();
  return visivel(page, "painel-dinamica");
}

async function regraFormula(page: Page, de: string, ate: string, formula: string, estilo?: string) {
  await selecionar(page, de, ate);
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="formula"]').click();
  const janela = visivel(page, "janela-regra");
  await janela.getByTestId("regra-formula").fill(formula);
  if (estilo) await janela.getByTestId("regra-estilo").selectOption(estilo);
  await janela.getByTestId("regra-ok").click();
}

test("dinâmica: contagem de processos por status", async ({ page }) => {
  await abrir(page, "dinamica-contagem-status");
  const painel = await inserirDinamicaEm(page, "A1:F17");
  await painel.locator('[data-campo="Status"]').check();
  await painel.locator('[data-campo="Processo"]').check(); // texto: vai para Colunas
  await painel.getByLabel("Mover Processo").selectOption("valores");
  await expect(celula(page, "I1")).toHaveText("Contagem de Processo");
  await expect(celula(page, "I5")).toHaveText("16");
  await verificarCorreto(page);
});

test("dinâmica: o mesmo campo duas vezes (soma e média)", async ({ page }) => {
  await abrir(page, "dinamica-varios-resumos");
  const painel = await inserirDinamicaEm(page, "A1:E17");
  await painel.locator('[data-campo="Categoria"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await painel.getByLabel("Mover Soma de Valor").selectOption("duplicar");
  await expect(celula(page, "I1")).toHaveText("Soma de Valor2");
  await painel.getByTestId("funcao-valor").nth(1).selectOption("media");
  await expect(celula(page, "I1")).toHaveText("Média de Valor");
  await verificarCorreto(page);
});

test("dinâmica: Mostrar Valores como % do Total Geral", async ({ page }) => {
  await abrir(page, "dinamica-percentual-total");
  const painel = await inserirDinamicaEm(page, "A1:D16");
  await painel.locator('[data-campo="Cliente"]').check();
  await painel.locator('[data-campo="Valor"]').check();
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("% do Total Geral");
  await painel.getByTestId("mostrar-valor").selectOption("totalGeral");
  await expect(celula(page, "G6")).toHaveText("100%");
  await verificarCorreto(page);
});

test("dinâmica: PROCV no resultado da tabela dinâmica", async ({ page }) => {
  await abrir(page, "dinamica-procv-na-dinamica");
  await expect(celula(page, "E4")).toHaveText("Carla");
  await digitar(page, "I2", "=PROCV(H2;E:F;2;FALSO)");
  await expect(celula(page, "I2")).toContainText("7.800");
  await verificarCorreto(page);
});

test("dinâmica: caso completo de horas (cruzada com filtro de dois meses)", async ({ page }) => {
  await abrir(page, "dinamica-caso-horas");
  const painel = await inserirDinamicaEm(page, "A1:E19");
  await painel.locator('[data-campo="Cliente"]').check();
  await painel.locator('[data-campo="Advogado"]').check();
  await painel.locator('[data-campo="Horas"]').check();
  await painel.locator('[data-campo="Mês"]').check(); // Linhas e Colunas ocupadas: vai para Filtros
  await painel.getByTestId("itens-filtro-dinamica").click();
  const menu = visivel(page, "menu-itens-dinamica");
  await menu.getByText("(Tudo)").click();
  await menu.locator('[data-item-dinamica="Out"]').check();
  await menu.locator('[data-item-dinamica="Nov"]').check();
  await menu.getByTestId("itens-dinamica-ok").click();
  await expect(celula(page, "H1")).toHaveText("(Vários itens)");
  await verificarCorreto(page);
});

test("condicional: escala de cor só nos meses", async ({ page }) => {
  await abrir(page, "destaque-escala-de-cor");
  await selecionar(page, "B2", "D9");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "menu-condicional").locator('[data-regra="escala"]').click();
  await verificarCorreto(page);
});

test("condicional: fórmula com E (vencida e pendente)", async ({ page }) => {
  await abrir(page, "destaque-formula-e");
  await regraFormula(page, "A2", "D11", '=E($B2<$G$1;$D2="Pendente")');
  await expect(celula(page, "A3")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "A6")).not.toHaveAttribute("data-destaque", /.+/); // vence hoje
  await verificarCorreto(page);
});

test("condicional: Mover para Cima no Gerenciador de Regras", async ({ page }) => {
  await abrir(page, "destaque-ordem-das-regras");
  await expect(celula(page, "B2")).toHaveAttribute("data-destaque", "amarelo");
  await visivel(page, "botao-condicional").click();
  await visivel(page, "gerenciar-regras").click();
  const gerenciador = visivel(page, "gerenciador-regras");
  await gerenciador.getByLabel("Mover para Cima a regra Valor da célula = 0 em B2:B11").click();
  await expect(celula(page, "B2")).toHaveAttribute("data-destaque", "vermelho");
  await expect(celula(page, "B5")).toHaveAttribute("data-destaque", "amarelo");
  await gerenciador.getByRole("button", { name: "Fechar" }).click();
  await verificarCorreto(page);
});

test("condicional: orçado × realizado com fórmula relativa", async ({ page }) => {
  await abrir(page, "destaque-orcado-realizado");
  await regraFormula(page, "C2", "C11", "=C2>B2");
  await expect(celula(page, "C11")).not.toHaveAttribute("data-destaque", /.+/); // gastou exatamente o orçado
  await verificarCorreto(page);
});

test("condicional: painel de prazos com três regras", async ({ page }) => {
  await abrir(page, "destaque-caso-painel-prazos");
  await regraFormula(page, "A2", "E13", '=E($D2<$H$1;$E2="Pendente")');
  await regraFormula(page, "A2", "E13", '=E($D2>=$H$1;$D2<=$H$1+3;$E2="Pendente")', "amarelo");
  await regraFormula(page, "A2", "E13", '=$E2="Protocolado"', "verde");
  await expect(celula(page, "A4")).toHaveAttribute("data-destaque", "verde");
  await expect(celula(page, "A8")).toHaveAttribute("data-destaque", "amarelo");
  await verificarCorreto(page);
});
