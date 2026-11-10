import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

// O servidor dos testes roda com DESAFIO_HOJE=2026-11-12 (desafio #3, quinta, nível 3).
const HOJE = "Liste os pedidos de um status";
const AMANHA = "Tabela de frete";
const ONTEM = "Ficha do funcionário pela matrícula";

test("desafio de hoje: nível, sem dica, erro e acerto com FILTRO, card de compartilhamento", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await limparArmazenamento(page);
  await page.goto("/desafio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HOJE);
  await expect(page.getByTestId("selo-nivel")).toHaveText("Nível 3");
  await expect(page.getByRole("button", { name: "Ver dica" })).toHaveCount(0);

  // erro: critério escrito na fórmula em vez de usar F1
  await celula(page, "F2").click();
  await page.keyboard.insertText('=CONT.SE(C2:C21;"Atrasado")');
  await page.keyboard.press("Enter");
  await celula(page, "E5").click();
  await page.keyboard.insertText('=FILTRO(A2:A21;C2:C21="Atrasado")');
  await page.keyboard.press("Enter");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("não acompanha mudanças");
  await expect(page.getByTestId("explicacao")).toHaveCount(0);

  // acerto: usando F1
  await celula(page, "F2").click();
  await page.keyboard.insertText("=CONT.SE(C2:C21;F1)");
  await page.keyboard.press("Enter");
  await celula(page, "E5").click();
  await page.keyboard.insertText("=FILTRO(A2:A21;C2:C21=F1)");
  await page.keyboard.press("Enter");
  await expect(celula(page, "E6")).not.toHaveText("");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
  await expect(page.getByTestId("explicacao")).toBeVisible();

  const texto = page.getByTestId("texto-compartilhar");
  await expect(texto).toContainText("Desafio de Excel #3 · 12/11 · Nível 3");
  await expect(texto).toContainText("🟥🟩 em 2 tentativas");
  await page.getByRole("button", { name: "Compartilhar resultado" }).click();
  await expect(page.getByRole("button", { name: /Copiado/ })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Nível 3");

  // depois de recarregar: resultado e FILTRO continuam (células derramadas não são salvas como valor)
  await page.reload();
  await expect(page.getByTestId("texto-compartilhar")).toContainText("🟥🟩");
  await expect(celula(page, "E6")).not.toHaveText("");
  await expect(celula(page, "E5")).not.toHaveText("#DESPEJAR!");
});

test("o HTML de hoje não traz o desafio de amanhã", async ({ request }) => {
  const html = await (await request.get("/desafio")).text();
  expect(html).toContain(HOJE);
  expect(html).not.toContain(AMANHA);
  expect(html).not.toContain("desafio-2026-11-13");
});

test("solução: publicada só para dias que já passaram, sem navegar pelo arquivo", async ({ page }) => {
  await page.goto("/desafio/2026-11-11");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ONTEM);
  await expect(page.locator("main")).toContainText('=PROCX(G1;A2:A21;B2:B21;"Não encontrado")');
  await expect(page.locator("main")).toContainText("Nível 2");
  await expect(page.getByRole("link", { name: /Desafio #1/ })).toHaveCount(0);

  for (const data of ["2026-11-12", "2026-11-13"]) {
    await page.goto(`/desafio/${data}`);
    await expect(page.locator("main")).not.toContainText(AMANHA);
    await expect(page.locator("main")).not.toContainText("FILTRO(A2");
    await expect(page.getByTestId("tabela-solucao")).toHaveCount(0);
  }
});

test("arquivo de anteriores é Pro: a lista nem vai no HTML", async ({ page, request }) => {
  const html = await (await request.get("/desafio/anteriores")).text();
  expect(html).not.toContain(ONTEM);
  expect(html).not.toContain("Vendas grandes da região escolhida"); // 10/11
  expect(html).toContain("noindex");

  await page.goto("/desafio/anteriores");
  await expect(page.getByTestId("arquivo-bloqueado")).toContainText("plano Pro");
  await expect(page.getByTestId("lista-anteriores")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /solução de ontem/ })).toHaveAttribute("href", "/desafio/2026-11-11");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/desafio/2026-11-11");
  expect(sitemap).not.toContain("/desafio/2026-11-12");
  expect(sitemap).not.toContain("/desafio/anteriores");
});

test("nenhum desafio vai no JavaScript enviado ao navegador", () => {
  const arquivos: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (statSync(p).isDirectory()) andar(p);
      else arquivos.push(p);
    }
  };
  andar(path.join(__dirname, "..", ".next", "static"));
  const vazou = arquivos.filter((f) => /Tabela de frete|desafio-2026-|Liste os pedidos|Ficha do funcionário/.test(readFileSync(f, "utf8")));
  expect(vazou).toEqual([]);
});
