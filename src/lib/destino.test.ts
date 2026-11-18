import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino";

const ORIGEM = "https://planilhes.com.br";

describe("destino depois do login", () => {
  it.each([
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r\n/evil.com",
    "//evil.com",
    "///evil.com",
    "/\\/evil.com",
    "https://evil.com",
    "https:evil.com",
    "https:/evil.com",
    "http://planilhes.com.br/trilha", // mesmo site, mas sem ser caminho: recusa (simples e seguro)
    "javascript:alert(1)",
    "evil.com",
    "%2F%2Fevil.com",
    " /trilha",
    "",
  ])("recusa %j", (p) => {
    expect(destinoSeguro(p, ORIGEM)).toBe("/trilha");
  });

  it("caminho codificado continua no site (o servidor não decodifica %5C para virar outro site)", () => {
    const r = destinoSeguro("/%5Cevil.com", ORIGEM);
    expect(new URL(r, ORIGEM).origin).toBe(ORIGEM);
    expect(destinoSeguro("/%2F/evil.com", ORIGEM).startsWith("//")).toBe(false);
    expect(new URL(destinoSeguro("/%2F/evil.com", ORIGEM), ORIGEM).origin).toBe(ORIGEM);
  });

  it.each(["/exercicios/soma?x=1#topo", "/conta", "/certificado/emitir?modulo=busca", "/"])("aceita %j", (p) => {
    expect(destinoSeguro(p, ORIGEM)).toBe(p);
  });

  it("sem proximo, ou origem quebrada: vai para a trilha", () => {
    expect(destinoSeguro(null, ORIGEM)).toBe("/trilha");
    expect(destinoSeguro("/conta", "não é url")).toBe("/trilha");
    expect(destinoSeguro("/" + "a".repeat(3000), ORIGEM)).toBe("/trilha");
  });

  it("caminho com .. fica dentro do site", () => {
    expect(destinoSeguro("/a/../../conta", ORIGEM)).toBe("/conta");
  });
});
