import { expect, test } from "@playwright/test";

test("páginas por público: texto no HTML, sem JavaScript", async ({ request }) => {
  for (const [url, trecho] of [
    ["/teste-de-excel", "Passe no teste de Excel da entrevista"],
    ["/excel-para-concurso", "Excel para concurso, praticando de verdade"],
    ["/empresas", "Piloto de 30 dias"],
    ["/universidades", "Piloto de um semestre"],
  ]) {
    const r = await request.get(url);
    expect(r.status(), url).toBe(200);
    const html = await r.text();
    expect(html, url).toContain(trecho);
    expect(html, url).toContain('rel="canonical"');
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/universidades");
});

test("formulário de empresa: valida, envia e agradece", async ({ page }) => {
  await page.goto("/empresas");
  const form = page.getByTestId("form-contato");
  await form.getByRole("button", { name: "Falar com a gente" }).click();
  await expect(form.getByRole("alert")).toContainText("Escreva seu nome");
  await form.getByLabel("Seu nome").fill("Maria Teste");
  await form.getByLabel("E-mail de trabalho").fill("maria@empresa.com.br");
  await form.getByLabel("Empresa").fill("Empresa Teste");
  await form.getByRole("button", { name: "Falar com a gente" }).click();
  await expect(form.getByRole("alert")).toContainText("autorização");
  await form.getByRole("checkbox").check();
  const resposta = page.waitForResponse("**/api/contato");
  await form.getByRole("button", { name: "Falar com a gente" }).click();
  expect((await resposta).status()).toBe(204);
  await expect(page.getByTestId("form-enviado")).toContainText("Recebemos sua mensagem");
});

test("indicação de empresa registra quem indicou", async ({ page }) => {
  await page.goto("/empresas#indicar");
  const form = page.getByTestId("form-indicacao");
  await form.getByLabel("Seu nome").fill("João Indicador");
  await form.getByLabel("Seu e-mail").fill("joao@email.com");
  await form.getByLabel("Empresa ou faculdade indicada").fill("Contabilidade Silva");
  await form.getByRole("checkbox").check();
  const req = page.waitForRequest("**/api/contato");
  await form.getByRole("button", { name: "Enviar indicação" }).click();
  expect((await req).postDataJSON()).toMatchObject({ formulario: "indicacao", nome: "João Indicador", organizacao: "Contabilidade Silva" });
  await expect(page.getByTestId("form-enviado")).toContainText("Obrigado pela indicação");
});

test("API recusa dados inválidos e descarta robôs", async ({ request }) => {
  expect((await request.post("/api/contato", { data: { formulario: "contato" } })).status()).toBe(400);
  const robo = await request.post("/api/contato", {
    data: { formulario: "indicacao", nome: "Bot", email: "b@b.com", organizacao: "X Ltda", consentimento: true, site: "http://spam" },
  });
  expect(robo.status()).toBe(400); // campo-armadilha preenchido não passa no esquema
});
