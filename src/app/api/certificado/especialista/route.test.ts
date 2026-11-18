import { beforeEach, describe, expect, it, vi } from "vitest";
import { modulosDoEspecialista } from "@/lib/especialista";
import { zerarLimites } from "@/lib/limite";

const banco = { certificados: [] as Record<string, unknown>[], perfis: [{ id: "u1", nome: null }] as Record<string, unknown>[] };
vi.mock("@/lib/supabase/servidor", () => ({ usuarioAtual: async () => ({ id: "u1" }) }));
vi.mock("@/lib/acesso", () => ({ usuarioEhPro: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: (t: "certificados" | "perfis") => {
      const f: [string, unknown][] = [];
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => (f.push([c, v]), q),
        returns: async () => ({ data: banco[t].filter((l) => f.every(([c, v]) => l[c] === v)) }),
        insert: async (l: Record<string, unknown>) => (banco[t].push(l), { error: null }),
        update: (m: Record<string, unknown>) => ({ eq: async (c: string, v: unknown) => (banco[t].filter((l) => l[c] === v).forEach((l) => Object.assign(l, m)), { error: null }) }),
      };
      return q;
    },
  }),
}));

const pedir = (nome = "Ana Souza") => new Request("http://x", { method: "POST", body: JSON.stringify({ nome }) });
const certificar = (modulos: string[]) =>
  modulos.forEach((m, i) => banco.certificados.push({ codigo: `AAAA-${2222 + i}`, usuario_id: "u1", modulo: m }));

describe("certificado de Especialista", async () => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "teste");
  const { POST } = await import("./route");
  beforeEach(() => {
    banco.certificados = [];
    zerarLimites();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("falta um módulo: recusa e diz qual", async () => {
    const todos = modulosDoEspecialista();
    certificar(todos.slice(0, -1));
    const r = await POST(pedir());
    expect(r.status).toBe(422);
    expect((await r.json()).erro).toContain("Casos reais");
  });

  it("todos os módulos: emite, e emitir de novo mantém o código", async () => {
    certificar(modulosDoEspecialista());
    const a = await (await POST(pedir())).json();
    expect(a.codigo).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const b = await (await POST(pedir("Outra Pessoa"))).json();
    expect(b.codigo).toBe(a.codigo);
    const especialista = banco.certificados.filter((c) => c.modulo === "especialista");
    expect(especialista).toHaveLength(1);
    expect(especialista[0].nome).toBe("Ana Souza"); // o nome não muda depois de emitido
  });

  it("muitos pedidos seguidos: 429", async () => {
    let ultimo = 0;
    for (let i = 0; i < 6; i++) ultimo = (await POST(pedir())).status;
    expect(ultimo).toBe(429);
  });
});
