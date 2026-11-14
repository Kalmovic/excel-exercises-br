import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("P0-1: voltar para um exercício pelo navegador mantém a planilha funcionando", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.getByRole("link", { name: "Trilha", exact: true }).click();
  await expect(page).toHaveURL(/\/trilha$/);
  await page.goBack();
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B7)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Correto!");

  // o mesmo no desafio
  await page.goto("/desafio");
  await page.getByRole("link", { name: "Trilha", exact: true }).click();
  await expect(page).toHaveURL(/\/trilha$/); // sem isso, o "voltar" dispara antes de a navegação terminar
  await page.goBack();
  await expect(page).toHaveURL(/\/desafio$/);
  await celula(page, "F2").click();
  await page.keyboard.insertText("=CONT.SE(C2:C21;F1)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "F2")).not.toHaveText("");
  expect(erros).toEqual([]);
});

test("P0-3: Recomeçar no desafio não apaga as tentativas", async ({ page }) => {
  await page.goto("/desafio");
  await visivel(page, "verificar").click();
  await visivel(page, "verificar").click();
  await page.getByRole("button", { name: "Recomeçar" }).click();
  await celula(page, "F2").click();
  await page.keyboard.insertText("=CONT.SE(C2:C21;F1)");
  await page.keyboard.press("Enter");
  await celula(page, "E5").click();
  await page.keyboard.insertText("=FILTRO(A2:A21;C2:C21=F1)");
  await page.keyboard.press("Enter");
  await visivel(page, "verificar").click();
  const texto = visivel(page, "texto-compartilhar");
  await expect(texto).toContainText("🟨🟨🟩");
  await expect(texto).toContainText("Resolvido na 3ª tentativa");
});

test("P0-4: fórmula com erro de sintaxe é recusada com explicação", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  await celula(page, "B8").click();
  await page.keyboard.insertText("=SOMA(B2:B7");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("mensagem-formula")).toContainText("Faltou fechar um parêntese");
  await page.keyboard.insertText(")");
  await page.keyboard.press("Enter");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);
  await expect(page.locator("[data-celula]").filter({ hasText: "#ERROR!" })).toHaveCount(0);
});

test("P0-5: copiar, recortar e colar com a área de transferência do sistema", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/exercicios/soma-total-de-vendas");
  const ler = () => page.evaluate(() => navigator.clipboard.readText());

  // colar texto de fora numa célula (sem estar editando)
  await page.evaluate(() => navigator.clipboard.writeText("=SOMA(B2:B7)"));
  await celula(page, "B8").click();
  await page.keyboard.press("Control+v");
  await expect(celula(page, "B8")).toHaveText(/7\.675,00/);

  // Ctrl+C grava no sistema
  await page.keyboard.press("Control+c");
  expect(await ler()).toBe("=SOMA(B2:B7)");

  // bloco vindo de outra planilha (tab e quebra de linha)
  await page.evaluate(() => navigator.clipboard.writeText("10\t20\n30\t40"));
  await page.keyboard.press("Escape"); // tira a marca da cópia interna
  await celula(page, "C2").click();
  await page.keyboard.press("Control+v");
  await expect(celula(page, "D3")).toHaveText("40");
  await expect(page.getByTestId("caixa-nome")).toHaveText("C2:D3");

  // Ctrl+X: vai para o sistema e sai da célula
  await celula(page, "C2").click();
  await page.keyboard.press("Control+x");
  expect(await ler()).toBe("10");
  await expect(celula(page, "C2")).toHaveText("");
});

test("P0-6: card do desafio na trilha usa o desafio de hoje do servidor", async ({ page }) => {
  await page.goto("/trilha");
  const card = visivel(page, "card-desafio");
  await expect(card).toContainText("#3"); // DESAFIO_HOJE=2026-11-12
  await expect(card).toContainText("Nível 3");
  await expect(card).toContainText("Jogar →");
  await page.evaluate(() =>
    localStorage.setItem(
      "excel-br:progresso:v1",
      JSON.stringify({
        "desafio-2026-11-12": { versao: 1, status: "concluido", tentativas: 2, historico: [false, true], conteudos: {}, atualizadoEm: "2026-11-12T12:00:00Z" },
      }),
    ),
  );
  await page.reload();
  await expect(visivel(page, "card-desafio")).toContainText("🟨🟩");
});

test.describe("P0-2: celular", () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });

  for (const url of ["/", "/trilha", "/desafio", "/pro", "/excel-basico-para-iniciantes", "/exercicios/soma-total-de-vendas"]) {
    test(`sem rolagem horizontal em ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForTimeout(800);
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw, `largura da página ${sw} > tela ${cw}`).toBeLessThanOrEqual(cw);
    });
  }

  test("menu do celular abre e navega", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("botao-menu").click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link")).toHaveCount(5);
    await menu.getByRole("link", { name: "Trilha" }).click();
    await expect(page).toHaveURL(/\/trilha$/);
    await expect(page.getByRole("navigation", { name: "Menu" })).toHaveCount(0);
  });
});
