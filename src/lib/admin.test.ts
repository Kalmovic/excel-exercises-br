import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const importar = async () => {
  vi.resetModules();
  return import("./admin");
};

afterEach(() => vi.unstubAllEnvs());

describe("senha de admin", () => {
  it("sem ADMIN_TOKEN, o admin fica desligado", async () => {
    vi.stubEnv("ADMIN_TOKEN", "");
    const a = await importar();
    expect(a.adminConfigurado()).toBe(false);
    expect(a.senhaCorreta("qualquer-coisa")).toBe(false);
    expect(await a.ehAdmin()).toBe(false);
  });

  it("senha curta demais também desliga", async () => {
    vi.stubEnv("ADMIN_TOKEN", "curta");
    expect((await importar()).adminConfigurado()).toBe(false);
  });

  it("confere a senha e o cookie não contém a senha", async () => {
    vi.stubEnv("ADMIN_TOKEN", "uma-senha-bem-longa");
    const a = await importar();
    expect(a.senhaCorreta("uma-senha-bem-longa")).toBe(true);
    expect(a.senhaCorreta("uma-senha-bem-longaX")).toBe(false);
    expect(a.senhaCorreta("")).toBe(false);
    const cookie = a.valorDoCookie();
    expect(cookie).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie).not.toContain("senha");
  });
});
