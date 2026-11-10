import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { celula, limparArmazenamento } from "./ajuda";

// O servidor dos testes roda com DESAFIO_HOJE=2026-11-12 (desafio #3).

test("desafio de hoje: sem dica, erro e acerto, card de compartilhamento", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await limparArmazenamento(page);
  await page.goto("/desafio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quantos pedidos já chegaram?");
  await expect(page.getByText("#3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver dica" })).toHaveCount(0);

  // erro primeiro: valor digitado à mão
  await celula(page, "E1").click();
  await page.keyboard.insertText("4");
  await page.keyboard.press("Enter");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Ainda não");
  await expect(page.getByTestId("explicacao")).toHaveCount(0); // explicação só depois de acertar

  await celula(page, "E1").click();
  await page.keyboard.insertText('=CONT.SE(B2:B9;"Entregue")');
  await page.keyboard.press("Enter");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Correto!");
  await expect(page.getByTestId("explicacao")).toBeVisible();

  const texto = page.getByTestId("texto-compartilhar");
  await expect(texto).toContainText("Desafio de Excel #3 · 12/11");
  await expect(texto).toContainText("🟥🟩 em 2 tentativas");
  await page.getByRole("button", { name: "Compartilhar resultado" }).click();
  await expect(page.getByRole("button", { name: /Copiado/ })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("🟥🟩");

  // o resultado continua lá depois de recarregar
  await page.reload();
  await expect(page.getByTestId("texto-compartilhar")).toContainText("🟥🟩");
});

test("o HTML de hoje não traz o desafio de amanhã", async ({ request }) => {
  const html = await (await request.get("/desafio")).text();
  expect(html).toContain("Quantos pedidos já chegaram?");
  expect(html).not.toContain("Black Friday"); // 13/11
  expect(html).not.toContain("desafio-2026-11-13");
});

test("solução: publicada só para dias que já passaram", async ({ page }) => {
  await page.goto("/desafio/2026-11-11");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quem passou?");
  await expect(page.getByTestId("tabela-solucao")).toContainText("Aprovado");
  await expect(page.locator("main")).toContainText('=SE(B2>=7;"Aprovado";"Reprovado")');

  for (const data of ["2026-11-12", "2026-11-13"]) {
    await page.goto(`/desafio/${data}`);
    await expect(page.locator("main")).not.toContainText("Black Friday");
    await expect(page.locator("main")).not.toContainText("CONT.SE");
    await expect(page.getByTestId("tabela-solucao")).toHaveCount(0);
  }
});

test("arquivo lista só os anteriores e o sitemap também", async ({ page, request }) => {
  await page.goto("/desafio/anteriores");
  const lista = page.getByTestId("lista-anteriores");
  await expect(lista).toContainText("Quem passou?");
  await expect(lista).toContainText("Quanto saiu do bolso este mês?");
  await expect(lista).not.toContainText("Quantos pedidos");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/desafio/2026-11-11");
  expect(sitemap).not.toContain("/desafio/2026-11-12");
  expect(sitemap).not.toContain("/desafio/2026-11-13");
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
  const vazou = arquivos.filter((f) => /Black Friday|desafio-2026-|Quantos pedidos/.test(readFileSync(f, "utf8")));
  expect(vazou).toEqual([]);
});
