import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zerarLimites } from "@/lib/limite";

const gravados: Record<string, unknown>[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      insert: (linha: Record<string, unknown>) => {
        gravados.push(linha);
        return { select: () => ({ single: async () => ({ data: { id: gravados.length }, error: null }) }) };
      },
    }),
  }),
}));

const { POST } = await import("./route");

const LEAD = {
  formulario: "contato",
  publico: "empresa",
  nome: "Maria Pessoal",
  email: "maria.pessoal@empresa.com.br",
  organizacao: "Empresa Secreta Ltda",
  mensagem: "Mensagem confidencial sobre 40 pessoas",
  consentimento: true,
};
const enviar = (corpo: unknown, ip = "1.1.1.1") =>
  POST(
    new Request("http://x/api/contato", {
      method: "POST",
      headers: { "x-forwarded-for": ip, referer: "https://planilhes.com.br/empresas?email=maria.pessoal@empresa.com.br" },
      body: JSON.stringify(corpo),
    }),
  );

describe("formulário B2B", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const erro = vi.spyOn(console, "error").mockImplementation(() => {});
  const tudoQueFoiParaOLog = () => JSON.stringify([...log.mock.calls, ...erro.mock.calls]);
  beforeEach(() => {
    zerarLimites();
    gravados.length = 0;
    log.mockClear();
    erro.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("com o banco: o lead vai para a tabela, e o log não tem nenhum dado pessoal", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "teste");
    expect((await enviar(LEAD)).status).toBe(204);
    expect(gravados).toHaveLength(1);
    expect(gravados[0]).toMatchObject({ formulario: "contato", publico: "empresa", dados: { nome: "Maria Pessoal", email: LEAD.email } });
    const logs = tudoQueFoiParaOLog();
    expect(logs).toContain("lead_b2b");
    for (const pessoal of ["Maria", "maria.pessoal", "Empresa Secreta", "confidencial", "referer", "planilhes.com.br/empresas"]) expect(logs).not.toContain(pessoal);
  });

  it("sem o banco: 204 e o log continua sem dados pessoais", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect((await enviar(LEAD)).status).toBe(204);
    expect(gravados).toHaveLength(0);
    for (const pessoal of ["Maria", "maria.pessoal", "Empresa Secreta", "confidencial"]) expect(tudoQueFoiParaOLog()).not.toContain(pessoal);
  });

  it("muitos envios do mesmo IP: 429", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    for (let i = 0; i < 5; i++) expect((await enviar(LEAD)).status).toBe(204);
    expect((await enviar(LEAD)).status).toBe(429);
  });
});
