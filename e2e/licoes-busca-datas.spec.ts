import { expect, test, type Page } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

/** Digita a fórmula da linha em cada célula da coluna, como quem copia para baixo. */
async function preencher(page: Page, col: string, de: number, ate: number, f: (l: number) => string) {
  for (let l = de; l <= ate; l++) await digitar(page, `${col}${l}`, f(l));
}

test("busca 6: PROCV com CORRESP no número da coluna", async ({ page }) => {
  await abrir(page, "procv-coluna-variavel-corresp");
  await digitar(page, "I2", "=PROCV(G2;A2:E6;CORRESP(H2;B1:E1;0);FALSO)");
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("a coluna do Vendedor também conta");
  await digitar(page, "I2", "=PROCV(G2;A2:E6;CORRESP(H2;A1:E1;0);FALSO)");
  await expect(celula(page, "I2")).toHaveText("R$ 27.100,00");
  await verificarCorreto(page);
});

test("busca 7: PROCX por faixa com o modo de correspondência", async ({ page }) => {
  await abrir(page, "procx-faixa-modo-correspondencia");
  await preencher(page, "F", 2, 5, (l) => `=PROCX(E${l};$A$2:$A$5;$B$2:$B$5;;-1)`);
  await expect(celula(page, "F3")).toHaveText("Prata");
  await verificarCorreto(page);
});

test("busca 8: duas condições com &", async ({ page }) => {
  await abrir(page, "procx-duas-condicoes");
  await preencher(page, "H", 2, 4, (l) => `=PROCX(F${l}&G${l};$A$2:$A$9&$B$2:$B$9;$C$2:$C$9)`);
  await expect(celula(page, "H2")).toHaveText("R$ 5.300,00");
  await verificarCorreto(page);
});

test("busca 9: PROCX de baixo para cima", async ({ page }) => {
  await abrir(page, "procx-ultima-ocorrencia");
  await digitar(page, "G2", '=PROCX(F2;C2:C9;D2:D9;"Sem compra";0;-1)');
  await expect(celula(page, "G2")).toHaveText("R$ 27,30");
  await verificarCorreto(page);
});

test("busca 10: caso da conferência com SEERRO por fora do SE", async ({ page }) => {
  await abrir(page, "caso-conferencia-de-cadastro");
  await preencher(page, "C", 2, 7, (l) => `=SEERRO(SE(PROCV(A${l};$E$2:$G$7;3;FALSO)=B${l};"OK";"Valor divergente");"Não cadastrado")`);
  await expect(celula(page, "C4")).toHaveText("Não cadastrado");
  await verificarCorreto(page);
});

test("datas 6: DATAM nas parcelas", async ({ page }) => {
  await abrir(page, "datam-vencimento-das-parcelas");
  await preencher(page, "B", 2, 7, (l) => `=DATAM($E$1;A${l}-1)`);
  await expect(celula(page, "B4")).toHaveText("10/02/2027");
  await verificarCorreto(page);
});

test("datas 7: DIA.DA.SEMANA com o tipo 2", async ({ page }) => {
  await abrir(page, "dia-da-semana-fim-de-semana");
  await preencher(page, "C", 2, 6, (l) => `=SE(DIA.DA.SEMANA(B${l};2)>5;"Fim de semana";"Dia útil")`);
  await expect(celula(page, "C5")).toHaveText("Dia útil");
  await verificarCorreto(page);
});

test("datas 8: data-limite do prazo processual", async ({ page }) => {
  await abrir(page, "diatrabalho-prazo-processual");
  await preencher(page, "D", 2, 5, (l) => `=DIATRABALHO(B${l};C${l};$G$2:$G$6)`);
  await expect(celula(page, "D5")).toHaveText("30/11/2026");
  await verificarCorreto(page);
});

test("datas 9: horas trabalhadas aparecem como hora", async ({ page }) => {
  await abrir(page, "horas-trabalhadas-banco-de-horas");
  await preencher(page, "F", 2, 6, (l) => `=(C${l}-B${l})+(E${l}-D${l})`);
  await expect(celula(page, "F3")).toHaveText("09:25");
  await verificarCorreto(page);
});

test("datas 10: caso da agenda de contratos", async ({ page }) => {
  await abrir(page, "caso-agenda-de-vencimentos");
  await preencher(page, "D", 2, 6, (l) => `=DATAM(B${l};C${l})-1`);
  await preencher(page, "E", 2, 6, (l) => `=D${l}-30`);
  await preencher(page, "F", 2, 6, (l) => `=SES(D${l}<$I$1;"Vencido";E${l}<=$I$1;"Avisar já";VERDADEIRO;"Em dia")`);
  await expect(celula(page, "F4")).toHaveText("Vencido");
  await verificarCorreto(page);
});
