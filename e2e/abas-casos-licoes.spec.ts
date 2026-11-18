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

test("abas: consolidar despesas por categoria com SOMASE em cada mês", async ({ page }) => {
  await abrir(page, "abas-consolidar-despesas");
  await aba(page, "Fev").click();
  await expect(celula(page, "B2")).toHaveText("Aluguel");
  await aba(page, "Resumo").click();
  for (const [col, mes] of [["B", "Jan"], ["C", "Fev"], ["D", "Mar"]]) {
    await digitar(page, `${col}2`, `=SOMASE(${mes}!$B$2:$B$8;$A2;${mes}!$C$2:$C$8)`);
    await arrastarAlca(page, `${col}2`, `${col}4`);
  }
  await expect(celula(page, "B3")).toHaveText(/505,30/);
  await expect(celula(page, "D4")).toHaveText(/397,00/);
  await verificarCorreto(page);
});

test("abas: conferir recebimentos (notas × extrato) com SE e CONT.SE", async ({ page }) => {
  await abrir(page, "abas-conferir-recebimentos");
  await digitar(page, "D2", '=SE(CONT.SE(Extrato!$A$2:$A$5;A2)>0;"Recebida";"Em aberto")');
  await arrastarAlca(page, "D2", "D7");
  await expect(celula(page, "D2")).toHaveText("Recebida");
  await expect(celula(page, "D4")).toHaveText("Em aberto");
  await verificarCorreto(page);
});

test("casos: boleto em atraso, com multa, juros pro rata e total", async ({ page }) => {
  await abrir(page, "boleto-em-atraso");
  await digitar(page, "E2", "=D2-C2");
  await digitar(page, "F2", "=B2*$K$1");
  await digitar(page, "G2", "=B2*$K$2/30*E2");
  await digitar(page, "H2", "=B2+F2+G2");
  for (const col of ["E", "F", "G", "H"]) await arrastarAlca(page, `${col}2`, `${col}4`);
  await expect(celula(page, "E3")).toHaveText("42");
  await expect(celula(page, "H3")).toHaveText(/1\.364,88/);
  await verificarCorreto(page);
});
