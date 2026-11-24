import { expect, test } from "@playwright/test";
import { abrir, celula, digitar, limparArmazenamento, verificarCorreto } from "./ajuda";

test.beforeEach(async ({ page }) => limparArmazenamento(page));

/** Digita a fórmula em cada linha da coluna (`#` vira o número da linha), como quem escreve e copia. */
async function coluna(page: import("@playwright/test").Page, col: string, de: number, ate: number, f: string) {
  for (let l = de; l <= ate; l++) await digitar(page, `${col}${l}`, f.replaceAll("#", String(l)));
}

test("Lógica 6: prazo vencido comparando com a data de hoje", async ({ page }) => {
  await abrir(page, "se-prazo-vencido");
  await coluna(page, "E", 2, 7, '=SE(C#<$H$1;"Vencido";"No prazo")');
  await expect(celula(page, "E3")).toHaveText("No prazo"); // vence hoje
  await expect(celula(page, "E4")).toHaveText("Vencido");
  await verificarCorreto(page);
});

test("Lógica 7: NÃO com OU no reembolso", async ({ page }) => {
  await abrir(page, "nao-despesa-reembolsavel");
  await coluna(page, "D", 2, 7, '=SE(NÃO(OU(B#="Multa";B#="Pessoal"));"Sim";"Não")');
  await expect(celula(page, "D3")).toHaveText("Não");
  await verificarCorreto(page);
});

test("Lógica 8: ÉCÉL.VAZIA separa o vazio do zero", async ({ page }) => {
  await abrir(page, "ecel-vazia-horas-extras");
  await coluna(page, "D", 2, 7, '=SE(C#=0;"Falta lançar";B#*C#)');
  await expect(celula(page, "D4")).toHaveText("Falta lançar"); // a Carla lançou 0
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Célula vazia vale 0");
  await coluna(page, "D", 2, 7, '=SE(ÉCÉL.VAZIA(C#);"Falta lançar";B#*C#)');
  await expect(celula(page, "D3")).toHaveText("Falta lançar");
  await expect(celula(page, "D4")).toHaveText(/0,00/);
  await verificarCorreto(page);
});

test("Lógica 9: honorários de êxito", async ({ page }) => {
  await abrir(page, "honorarios-de-exito");
  await coluna(page, "E", 2, 7, '=SE(D#="Sim";SES(C#="Procedente";B#*$H$1;C#="Acordo";B#*$H$2;VERDADEIRO;0);"Aguardando")');
  await expect(celula(page, "E2")).toHaveText(/17\.000,00/);
  await expect(celula(page, "E4")).toHaveText("Aguardando");
  await verificarCorreto(page);
});

test("Lógica 10: classificação de clientes", async ({ page }) => {
  await abrir(page, "caso-classificacao-clientes");
  await coluna(page, "F", 2, 9, '=SES(E#>30;"Bloqueado";E(B#+C#>=100000;D#>=3);"Ouro";OU(B#+C#>=50000;D#>=5);"Prata";VERDADEIRO;"Bronze")');
  await expect(celula(page, "F5")).toHaveText("Bloqueado");
  await expect(celula(page, "F8")).toHaveText("Bronze");
  await verificarCorreto(page);
});

test("Condicionais 7: CONT.SE com curinga", async ({ page }) => {
  await abrir(page, "cont-se-curinga-ltda");
  await digitar(page, "G1", '=CONT.SE(A2:A11;"Ltda")');
  await page.getByTestId("verificar").click();
  await expect(page.getByTestId("resultado")).toContainText("Sem curinga");
  await digitar(page, "G1", '=CONT.SE(A2:A11;"*Ltda")');
  await expect(celula(page, "G1")).toHaveText("6");
  await verificarCorreto(page);
});

test("Condicionais 8: SOMASES entre duas datas", async ({ page }) => {
  await abrir(page, "somases-periodo-datas");
  await digitar(page, "G3", '=SOMASES(C2:C11;A2:A11;">="&G1;A2:A11;"<="&G2)');
  await expect(celula(page, "G3")).toHaveText(/11\.080,00/);
  await verificarCorreto(page);
});

test("Condicionais 9: vazio e diferente de", async ({ page }) => {
  await abrir(page, "criterios-diferente-vazio");
  await digitar(page, "H1", '=SOMASES(C2:C20;D2:D20;"";E2:E20;"<>Cancelada")');
  await expect(celula(page, "H1")).toHaveText(/8\.980,00/);
  await verificarCorreto(page);
});

test("Condicionais 10: relatório mensal por responsável", async ({ page }) => {
  await abrir(page, "caso-relatorio-por-responsavel");
  const per = '$A$2:$A$17;">="&$H$1;$A$2:$A$17;"<="&$H$2;$E$2:$E$17;"<>Cancelado"';
  await coluna(page, "H", 5, 8, `=CONT.SES($B$2:$B$17;G#;${per})`);
  await coluna(page, "I", 5, 8, `=SOMASES($D$2:$D$17;$B$2:$B$17;G#;${per})`);
  await coluna(page, "J", 5, 8, "=SEERRO(I#/H#;0)");
  await expect(celula(page, "H6")).toHaveText("4");
  await expect(celula(page, "J8")).toHaveText(/0,00/);
  await verificarCorreto(page);
});
