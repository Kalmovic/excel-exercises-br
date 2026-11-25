import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

const aba = (page: Page, nome: string) => page.locator(`[data-aba="${nome}"]`).filter({ visible: true });

/** Copia a célula `de` até `ate` arrastando a alça de preenchimento, como o aluno faria. */
async function arrastarAlca(page: Page, de: string, ate: string) {
  await celula(page, de).click();
  const alca = await page.getByTestId("alca").boundingBox();
  const fim = await celula(page, ate).boundingBox();
  await page.mouse.move(alca!.x + 3, alca!.y + 3);
  await page.mouse.down();
  await page.mouse.move(fim!.x + 20, fim!.y + 10, { steps: 8 });
  await page.mouse.up();
}

/** Nenhuma célula visível mostra "#####" (coluna estreita demais). */
async function semCerquilhas(page: Page) {
  await expect(page.locator("[data-celula]").filter({ visible: true }).filter({ hasText: "###" })).toHaveCount(0);
}

test("abas 6: comissão e meta lidas da aba Config", async ({ page }) => {
  await abrir(page, "abas-parametros-config");
  await aba(page, "Config").click();
  await expect(celula(page, "B1")).toHaveText("5%");
  await aba(page, "Vendas").click();
  await digitar(page, "C2", "=B2*Config!$B$1");
  await digitar(page, "D2", '=SE(B2>=Config!$B$2;"Sim";"Não")');
  await arrastarAlca(page, "C2", "C6");
  await arrastarAlca(page, "D2", "D6");
  await expect(celula(page, "C5")).toHaveText(/1\.560,00/);
  await expect(celula(page, "D4")).toHaveText("Sim");
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("abas 7: trimestre com referência 3D", async ({ page }) => {
  await abrir(page, "abas-referencia-3d");
  await digitar(page, "B2", "=soma(jan:mar!b2)");
  await expect(celula(page, "B2")).toHaveText(/144\.920,00/);
  await arrastarAlca(page, "B2", "B5");
  await expect(celula(page, "B5")).toHaveText(/329\.500,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("abas 8: painel de processos com CONT.SES copiado na tabela", async ({ page }) => {
  await abrir(page, "abas-painel-processos");
  await digitar(page, "B2", "=CONT.SES(Processos!$B$2:$B$13;$A2;Processos!$C$2:$C$13;B$1)");
  await arrastarAlca(page, "B2", "B4");
  for (const l of [2, 3, 4]) {
    await digitar(page, `C${l}`, `=CONT.SES(Processos!$B$2:$B$13;$A${l};Processos!$C$2:$C$13;C$1)`);
  }
  await digitar(page, "D2", '=SOMASES(Processos!$D$2:$D$13;Processos!$B$2:$B$13;A2;Processos!$C$2:$C$13;"Ativo")');
  await arrastarAlca(page, "D2", "D4");
  await expect(celula(page, "B2")).toHaveText("3");
  await expect(celula(page, "D4")).toHaveText(/1\.166\.000,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("abas 9: painel que muda de mês com INDIRETO", async ({ page }) => {
  await abrir(page, "abas-indireto-mes");
  await digitar(page, "B3", '=INDIRETO($B$1&"!B2")');
  await digitar(page, "B4", '=INDIRETO($B$1&"!B3")');
  await digitar(page, "B5", "=B3-B4");
  await expect(celula(page, "B3")).toHaveText(/79\.800,00/);
  await expect(celula(page, "B5")).toHaveText(/15\.650,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("abas 10: fechamento do mês com Vendas, Devoluções e Config", async ({ page }) => {
  await abrir(page, "abas-fechamento-mensal");
  await digitar(page, "B2", "=SOMASE(Vendas!$B$2:$B$11;A2;Vendas!$D$2:$D$11)");
  await digitar(page, "C2", "=SOMASE(Devoluções!$A$2:$A$4;A2;Devoluções!$B$2:$B$4)");
  await digitar(page, "D2", "=B2-C2");
  await digitar(page, "E2", "=D2*Config!$B$1+SE(D2>=Config!$B$2;Config!$B$3;0)");
  for (const col of ["B", "C", "D", "E"]) await arrastarAlca(page, `${col}2`, `${col}5`);
  await expect(celula(page, "E2")).toHaveText(/1\.004,00/);
  await expect(celula(page, "D5")).toHaveText(/8\.400,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("casos 6: folha com horas extras e faltas", async ({ page }) => {
  await abrir(page, "folha-horas-extras");
  await digitar(page, "E2", "=B2/$K$1");
  await digitar(page, "F2", "=C2*E2*(1+$K$2)");
  await digitar(page, "G2", "=B2/30*D2");
  await digitar(page, "H2", "=B2+F2-G2");
  for (const col of ["E", "F", "G", "H"]) await arrastarAlca(page, `${col}2`, `${col}5`);
  await expect(celula(page, "F2")).toHaveText(/225,00/);
  await expect(celula(page, "G3")).toHaveText(/161,33/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("casos 7: fluxo de caixa com saldo acumulado", async ({ page }) => {
  await abrir(page, "fluxo-de-caixa");
  await digitar(page, "D4", "=B4-C4");
  await arrastarAlca(page, "D4", "D9");
  await digitar(page, "E4", "=B1+D4");
  await digitar(page, "E5", "=E4+D5");
  await arrastarAlca(page, "E5", "E9");
  await expect(celula(page, "E7")).toHaveText(/1\.950,00/);
  await expect(celula(page, "E9")).toHaveText(/14\.350,00/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("casos 8: reajuste do aluguel pelo IPCA acumulado", async ({ page }) => {
  await abrir(page, "reajuste-ipca");
  await digitar(page, "C2", "=1+B2");
  await digitar(page, "C3", "=C2*(1+B3)");
  await arrastarAlca(page, "C3", "C13");
  await digitar(page, "F2", "=C13-1");
  await digitar(page, "F3", "=ARRED(F1*(1+F2);2)");
  await expect(celula(page, "F2")).toHaveText("3,88%");
  await expect(celula(page, "F3")).toHaveText(/3\.999,22/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("casos 9: conciliação bancária com CONT.SES", async ({ page }) => {
  await abrir(page, "conciliacao-bancaria");
  await digitar(page, "D2", '=SE(CONT.SES(Extrato!$A$2:$A$9;A2;Extrato!$C$2:$C$9;C2)>0;"Conciliado";"Pendente")');
  await arrastarAlca(page, "D2", "D9");
  await digitar(page, "G2", '=SOMASE(D2:D9;"Pendente";C2:C9)');
  await expect(celula(page, "D7")).toHaveText("Pendente");
  await expect(celula(page, "G2")).toHaveText(/389,90/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});

test("casos 10: proposta de honorários com PROCV, desconto e imposto por dentro", async ({ page }) => {
  await abrir(page, "proposta-de-honorarios");
  await digitar(page, "D2", "=PROCV(B2;Tabela!$A$2:$B$4;2;FALSO)");
  await digitar(page, "E2", "=C2*D2");
  await arrastarAlca(page, "D2", "D6");
  await arrastarAlca(page, "E2", "E6");
  await digitar(page, "B8", "=SOMA(E2:E6)");
  await digitar(page, "B9", "=SE(B8>=Tabela!$B$6;B8*Tabela!$B$7;0)");
  await digitar(page, "B10", "=(B8-B9)/(1-Tabela!$B$8)");
  await expect(celula(page, "B10")).toHaveText(/25\.862,35/);
  await semCerquilhas(page);
  await verificarCorreto(page);
});
