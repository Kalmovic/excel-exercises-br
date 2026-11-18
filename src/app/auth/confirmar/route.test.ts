import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_CHAVE_PUBLICA: "chave", contasLigadas: () => true }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) }));

const { GET } = await import("./route");
const abrir = async (proximo: string) =>
  (await GET(new NextRequest(`https://planilhes.com.br/auth/confirmar?code=abc&proximo=${encodeURIComponent(proximo)}`))).headers.get("location");

describe("link do e-mail de login", () => {
  it("volta para o caminho pedido, no próprio site", async () => {
    expect(await abrir("/exercicios/soma?x=1")).toBe("https://planilhes.com.br/exercicios/soma?x=1");
  });

  it.each(["/\\evil.com", "/\t/evil.com", "//evil.com", "https://evil.com", "https:evil.com"])("não leva para outro site: %j", async (p) => {
    expect(await abrir(p)).toBe("https://planilhes.com.br/trilha");
  });
});
