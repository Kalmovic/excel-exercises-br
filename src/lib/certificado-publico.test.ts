import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn(() => ({ maybeSingle: async () => ({ data: { codigo: "ABCD-2345", nome: "Ana" } }) }));
vi.mock("server-only", () => ({}));
vi.mock("./supabase/publico", () => ({ supabasePublico: () => ({ rpc }) }));

const { buscarCertificado } = await import("./certificado-publico");

describe("busca do certificado pelo código", () => {
  it("escape quebrado na URL: não existe (404), em vez de erro (500)", async () => {
    await expect(buscarCertificado("%E0%A4%A")).resolves.toBeNull();
    await expect(buscarCertificado("%")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("código fora do formato: nem consulta o banco", async () => {
    await expect(buscarCertificado("abc")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("código válido, em minúsculas e codificado: consulta em maiúsculas", async () => {
    await expect(buscarCertificado("abcd%2D2345")).resolves.toMatchObject({ codigo: "ABCD-2345" });
    expect(rpc).toHaveBeenCalledWith("verificar_certificado", { codigo_buscado: "ABCD-2345" });
  });
});
