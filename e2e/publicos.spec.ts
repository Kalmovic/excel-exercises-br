import { expect, test } from "@playwright/test";

test("páginas por público: texto no HTML, sem JavaScript", async ({ request }) => {
  for (const [url, trecho] of [
    ["/teste-de-excel", "Passe no teste de Excel da entrevista"],
    ["/excel-para-concurso", "Excel para concurso, praticando de verdade"],
  ]) {
    const r = await request.get(url);
    expect(r.status(), url).toBe(200);
    const html = await r.text();
    expect(html, url).toContain(trecho);
    expect(html, url).toContain('rel="canonical"');
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/excel-para-concurso");
});

test("API recusa dados inválidos e descarta robôs", async ({ request }) => {
  expect((await request.post("/api/contato", { data: { formulario: "contato" } })).status()).toBe(400);
  const robo = await request.post("/api/contato", {
    data: { formulario: "indicacao", nome: "Bot", email: "b@b.com", organizacao: "X Ltda", consentimento: true, site: "http://spam" },
  });
  expect(robo.status()).toBe(400); // campo-armadilha preenchido não passa no esquema
});
