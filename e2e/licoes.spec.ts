import { expect, test } from "@playwright/test";
import { celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

const visivel = (page: import("@playwright/test").Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeEach(async ({ page }) => limparArmazenamento(page));

test("lição de 5 questões: principal, variações, pegadinha e múltipla escolha", async ({ page }) => {
  await page.goto("/exercicios/soma-total-de-vendas");
  const passos = visivel(page, "passos-licao");
  await expect(passos.getByRole("link")).toHaveCount(5);
  await digitar(page, "B8", "=SOMA(B2:B7)");
  await verificarCorreto(page);
  await expect(passos.locator("[data-feito]")).toHaveCount(1);
  await page.getByRole("link", { name: "Próximo exercício →" }).click();
  await expect(page).toHaveURL(/soma-total-de-vendas-variacao-a$/);

  // pegadinha: a fórmula errada já está na célula
  await page.goto("/exercicios/soma-total-de-vendas-pegadinha");
  await expect(celula(page, "B8")).toHaveText(/2\.520,00/);
  await digitar(page, "B8", "=SOMA(B2:B7)");
  await verificarCorreto(page);

  // múltipla escolha: alternativa errada mostra a dica dela
  await page.goto("/exercicios/soma-total-de-vendas-conceito");
  const alternativas = visivel(page, "alternativas");
  await alternativas.getByText("B2 e B7").click();
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("ponto e vírgula");
  await alternativas.getByText("De B2 até B7").click();
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
});

test("a lição só conta no mapa quando as 5 questões estão feitas", async ({ page }) => {
  await page.evaluate(() => {
    const feito = { versao: 1, status: "concluido", tentativas: 1, conteudos: {}, atualizadoEm: "2026-11-11T10:00:00Z" };
    const p: Record<string, unknown> = {};
    for (const e of [1, 2, 3, 4]) p[`soma-total-de-vendas#${e}`] = feito;
    localStorage.setItem("excel-br:progresso:v1", JSON.stringify(p));
  });
  await page.goto("/trilha");
  await expect(page.getByTestId("regiao-fundamentos")).toContainText("0/7");
  // a última questão (múltipla escolha) fecha a lição
  await page.goto("/exercicios/soma-total-de-vendas-conceito");
  await visivel(page, "alternativas").getByText("De B2 até B7").click();
  await visivel(page, "verificar").click();
  await expect(visivel(page, "resultado")).toContainText("Correto!");
  await page.goto("/trilha");
  await expect(page.getByTestId("regiao-fundamentos")).toContainText("1/7");
});

test("teste do módulo: 4 de 5 aprova; quem erra recebe as lições para revisar", async ({ page }) => {
  await page.goto("/teste/condicionais");
  const respostas = ['=CONT.SE(A2:A8;"Carla")', "=1", '=CONT.SES(B2:B8;"Norte";D2:D8;"Pago")', '=SOMASE(D2:D8;"Pendente";C2:C8)'];
  for (const r of respostas) {
    await digitar(page, "G1", r);
    await visivel(page, "verificar").click();
    await visivel(page, "proxima-teste").click();
  }
  await visivel(page, "alternativas").getByText('=SOMASES(B2:B8;"Sul";C2:C8)').click();
  await visivel(page, "verificar").click();
  await visivel(page, "proxima-teste").click();
  const resultado = page.getByTestId("resultado-teste");
  await expect(resultado).toContainText("acertou 3 de 5");
  await expect(page.getByTestId("revisar")).toContainText("SOMASE");

  await resultado.getByRole("button", { name: "Refazer o teste" }).click();
  for (const r of ['=CONT.SE(A2:A8;"Carla")', '=SOMASE(B2:B8;"Sul";C2:C8)', '=CONT.SES(B2:B8;"Norte";D2:D8;"Pago")', '=SOMASE(D2:D8;"Pendente";C2:C8)']) {
    await digitar(page, "G1", r);
    await visivel(page, "verificar").click();
    await visivel(page, "proxima-teste").click();
  }
  await visivel(page, "alternativas").getByText('=SOMASES(C2:C8;B2:B8;"Sul")').click();
  await visivel(page, "verificar").click();
  await visivel(page, "proxima-teste").click();
  await expect(page.getByTestId("resultado-teste")).toContainText("Aprovado! Você acertou 5 de 5");
});
