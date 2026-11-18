import { beforeEach, describe, expect, it, vi } from "vitest";
import { zerarLimites } from "@/lib/limite";
import { POST } from "./route";

const enviar = (corpo: string, ip = "1.1.1.1") =>
  POST(new Request("http://x/api/erros", { method: "POST", headers: { "x-forwarded-for": ip }, body: corpo }));

describe("erros do navegador", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  beforeEach(() => {
    zerarLimites();
    log.mockClear();
  });

  it("relatório válido: grava uma linha e responde 204", async () => {
    expect((await enviar(JSON.stringify({ mensagem: "x is undefined", url: "/trilha" }))).status).toBe(204);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({ tipo: "erro_cliente", mensagem: "x is undefined", url: "/trilha" });
  });

  it.each(["null", "42", '"texto"', "[1,2]", "true", "não é json"])("corpo %s: 400, sem quebrar", async (corpo) => {
    expect((await enviar(corpo)).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });

  it("campos que não são texto não quebram a rota", async () => {
    expect((await enviar(JSON.stringify({ mensagem: { toString: 1 }, pilha: [1] }))).status).toBe(204);
  });

  it("muitos relatórios do mesmo IP: 429", async () => {
    for (let i = 0; i < 20; i++) expect((await enviar("{}")).status).toBe(204);
    expect((await enviar("{}")).status).toBe(429);
    expect((await enviar("{}", "2.2.2.2")).status).toBe(204);
  });
});
