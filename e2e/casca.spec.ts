import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, simularCorrecao, verificarCorreto } from "./ajuda";

const visivel = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const anuncio = (page: Page) => page.getByTestId("anuncio-resultado").first();

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("resultado anunciado numa região de status, e o foco não volta para a grade ao errar", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  const regiao = anuncio(page);
  await expect(regiao).toHaveAttribute("role", "status");
  await expect(regiao).toHaveAttribute("aria-live", "polite");
  await expect(regiao).toHaveText(""); // montada antes de haver resultado
  await digitar(page, "B8", "=1");
  await page.getByTestId("verificar").click();
  await expect(regiao).toContainText("Ainda não. Tentativa 1.");
  const foco = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
  expect(foco).not.toBe("editor-celula");
  await digitar(page, "B8", "=SOMA(B2:B7)");
  await verificarCorreto(page);
  await expect(regiao).toContainText("Correto!");
});

test("Recomeçar depois de errar: o acerto seguinte não é 'de primeira'", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  await digitar(page, "B8", "=1");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Tentativa 1");
  await page.getByRole("button", { name: "Recomeçar" }).click();
  await digitar(page, "B8", "=SOMA(B2:B7)");
  await verificarCorreto(page);
  await expect(page.getByTestId("resultado")).not.toContainText("Acertou de primeira");
  // O histórico também sobrevive ao recarregar: errar de novo continua contando.
  await page.reload();
  await expect(page.getByTestId("ja-resolvido")).toBeVisible();
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem("excel-br:progresso:v1") ?? "{}"));
  expect(salvo["soma-total-de-vendas#1"]).toMatchObject({ status: "concluido", tentativas: 2, historico: [false, true] });
});

test("barra de progresso conta as etapas feitas da lição", async ({ page }) => {
  await page.evaluate(() => {
    const feito = { versao: 1, status: "concluido", tentativas: 1, conteudos: {}, atualizadoEm: "2026-11-11T10:00:00Z" };
    const p: Record<string, unknown> = {};
    for (const e of [1, 2, 3, 4]) p[`soma-total-de-vendas#${e}`] = feito;
    localStorage.setItem("excel-br:progresso:v1", JSON.stringify(p));
  });
  await page.goto("/exercicios/soma-total-de-vendas-conceito");
  await expect(visivel(page, "contador-progresso")).toHaveText(/^4 de \d+ etapas$/);
  await expect(visivel(page, "progresso-modulo").getByTestId("segmento-feito")).toHaveCount(1);
});

test("itálico do conteúdo aparece sem os asteriscos", async ({ page }) => {
  await page.evaluate(() => {
    const feito = { versao: 1, status: "concluido", tentativas: 1, conteudos: {}, atualizadoEm: "2026-11-11T10:00:00Z" };
    localStorage.setItem("excel-br:progresso:v1", JSON.stringify({ "dados-classificar-maior-valor#1": feito }));
  });
  await abrir(page, "dados-classificar-maior-valor");
  const explicacao = visivel(page, "explicacao");
  await expect(explicacao.locator("em", { hasText: "Classificar do Maior para o Menor" })).toBeVisible();
  await expect(explicacao).not.toContainText("*");
});

test("teste do módulo: correção no servidor, uma tentativa, sem dica, e o resultado sobrevive ao recarregar", async ({ page }) => {
  const corpos = await simularCorrecao(page, [true, false, true, true, true], { forcar: true, atraso: 400, falhar: 1 });
  await page.goto("/teste/intro");

  // Questão 1: a primeira tentativa de envio falha na rede e não conta.
  await visivel(page, "campo-resposta").fill("F9");
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("não foi contada");
  await expect(anuncio(page)).toContainText("não foi contada");
  await expect(visivel(page, "proxima-teste")).toHaveCount(0);
  await visivel(page, "verificar").click(); // reenvia
  await expect(visivel(page, "verificar")).toHaveText("Conferindo…");
  await expect(visivel(page, "resultado")).toContainText("Certo!");
  await expect(visivel(page, "verificar")).toHaveCount(0); // uma tentativa só
  expect(corpos[0]).toMatchObject({ modulo: "intro", indice: 0, resposta: { resposta: "F9" } });

  // Sem dica, solução, explicação, "Tentativa" nem "último exercício".
  const main = page.locator("main");
  await expect(main.getByRole("button", { name: /dica/i })).toHaveCount(0);
  await expect(main).not.toContainText("Tentativa");
  await expect(main).not.toContainText("último exercício");
  await expect(page.getByTestId("explicacao")).toHaveCount(0);
  await visivel(page, "proxima-teste").click();

  // Questão 2 errada: só "Errado.", sem a mensagem do corretor.
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Errado.");
  await expect(main.getByRole("button", { name: /dica/i })).toHaveCount(0);
  expect(corpos[1]).toMatchObject({ modulo: "intro", indice: 1 });

  // Recarregar no meio: a questão respondida não volta.
  await page.reload();
  await expect(visivel(page, "questao-teste")).toHaveText("Questão 3 de 5");

  for (let i = 2; i < 5; i++) {
    await visivel(page, "verificar").click();
    await visivel(page, "proxima-teste").click();
  }
  const resultado = page.getByTestId("resultado-teste");
  await expect(resultado).toContainText("Aprovado!");
  // Aprovado: o próximo passo é o certificado (aqui sem contas, o aviso honesto).
  await expect(page.getByTestId("certificado-em-breve")).toContainText("Seu certificado do Módulo 0");

  await page.reload();
  await expect(page.getByTestId("resultado-teste")).toContainText("Aprovado!");
  await expect(page.getByTestId("questoes-teste").getByLabel("errou")).toHaveCount(1);

  // A página de emissão não fica em branco.
  await page.goto("/certificado/emitir?modulo=intro");
  await expect(page.getByTestId("certificado-em-breve")).toBeVisible();
  await page.goto("/certificado/emitir");
  await expect(page.getByTestId("aprovacoes-guardadas")).toContainText("Módulo 0: Intro");
  await page.goto("/certificado/emitir?modulo=graficos");
  await expect(page.getByTestId("sem-aprovacao")).toContainText("Fazer o teste do módulo");
});

test("home e /pro: os números vêm do conteúdo", async ({ page }) => {
  await page.goto("/");
  const modulos = page.locator('[data-testid^="modulo-home-"]');
  const n = await modulos.count();
  expect(n).toBeGreaterThanOrEqual(15);
  await expect(page.getByTestId("modulo-home-casos")).toContainText(`Módulo ${n - 1}`);
  await expect(page.getByTestId("planos")).toContainText("1ª lição de cada módulo");
  await expect(page.getByTestId("planos")).toContainText("Progresso salvo no seu navegador");

  await page.goto("/pro");
  const tabela = page.getByTestId("comparacao");
  await expect(tabela).toContainText(`Todas as lições dos ${n} módulos`);
  await expect(tabela).toContainText(`Teste de cada módulo (${n} testes)`);
  await expect(tabela).toContainText("Progresso salvo neste navegador");
  await expect(page.getByTestId("secao-especialista")).toContainText(`cada um dos ${n} módulos`);
});

test("trilha: índice de módulos e o cartão do módulo abre a lição", async ({ page }) => {
  await page.goto("/trilha");
  const indice = page.getByTestId("indice-modulos");
  await indice.locator("summary").click();
  await indice.getByRole("link", { name: /Tabela dinâmica/ }).click();
  await expect(page).toHaveURL(/#modulo-dinamica$/);
  await page.getByTestId("regiao-dinamica").click({ position: { x: 200, y: 50 } });
  await expect(page).toHaveURL(/\/exercicios\/dinamica-/);
});

test("Verificar com a célula em edição inválida avisa em vez de ficar em silêncio", async ({ page }) => {
  await abrir(page, "soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B7))");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("aviso-verificar")).toBeVisible();
  await expect(anuncio(page)).toContainText("ainda está em edição");
});
