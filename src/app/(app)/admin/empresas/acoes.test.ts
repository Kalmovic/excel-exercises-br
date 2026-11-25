import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Organizacao } from "@/lib/empresas";

// --- dublês: admin, banco (chave secreta) e Stripe -----------------------------
const admin = { eh: true };
vi.mock("@/lib/admin", () => ({ ehAdmin: async () => admin.eh }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const banco = {
  inseridos: [] as object[],
  atualizados: [] as object[],
  org: null as Organizacao | null,
  erroInsert: null as { code: string; message: string } | null,
};
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: (tabela: string) => {
      expect(tabela).toBe("organizacoes");
      return {
        insert: (linha: object) => {
          banco.inseridos.push(linha);
          return { select: () => ({ single: async () => (banco.erroInsert ? { data: null, error: banco.erroInsert } : { data: { id: "org-novo" }, error: null }) }) };
        },
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: banco.org, error: null }) }) }),
        update: (campos: object) => ({
          eq: async () => {
            banco.atualizados.push(campos);
            return { error: null };
          },
        }),
      };
    },
  }),
}));

type Chamada = [string, ...unknown[]];
const stripe = {
  chamadas: [] as Chamada[],
  faturaAnterior: null as { id: string; status: string; hosted_invoice_url?: string; lines?: { data: unknown[] } } | null,
  produtoExiste: true,
};
const registrar =
  <T,>(nome: string, resposta: (...a: unknown[]) => T) =>
  async (...a: unknown[]) => {
    stripe.chamadas.push([nome, ...a]);
    return resposta(...a);
  };
const stripeFalso = {
  customers: {
    create: registrar("customers.create", () => ({ id: "cus_org" })),
    update: registrar("customers.update", (id) => ({ id })),
  },
  products: {
    retrieve: registrar("products.retrieve", () => {
      if (!stripe.produtoExiste) throw Object.assign(new Error("No such product"), { code: "resource_missing" });
      return { id: "planilhes_pro_empresas" };
    }),
    create: registrar("products.create", () => ({ id: "planilhes_pro_empresas" })),
  },
  invoices: {
    retrieve: registrar("invoices.retrieve", () => stripe.faturaAnterior),
    create: registrar("invoices.create", () => ({ id: "in_novo", status: "draft", lines: { data: [] } })),
    finalizeInvoice: registrar("invoices.finalizeInvoice", (id) => ({ id, status: "open" })),
    sendInvoice: registrar("invoices.sendInvoice", (id) => ({ id, status: "open", hosted_invoice_url: `https://invoice.stripe.com/i/${id}` })),
  },
  invoiceItems: { create: registrar("invoiceItems.create", () => ({ id: "ii_1" })) },
};
vi.mock("@/lib/stripe", () => ({ clienteStripe: () => stripeFalso, stripeConfigurado: () => true }));

const { criarProposta, gerarFatura } = await import("./acoes");

const formulario = (dados: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(dados)) f.set(k, v);
  f.set("$ACTION_ID_123", ""); // o Next põe campos assim no FormData
  return f;
};

const PROPOSTA = {
  nome: "Empresa Teste Ltda",
  cnpj: "11.222.333/0001-81",
  email_financeiro: "financeiro@empresa.com.br",
  gestor_email: "gestora@empresa.com.br",
  cep: "20090-003",
  logradouro: "Av. Rio Branco",
  numero: "1",
  complemento: "sala 1001",
  bairro: "Centro",
  cidade: "Rio de Janeiro",
  uf: "RJ",
  assentos: "12",
  preco_por_pessoa_ano: "180",
};

const ORG: Organizacao = {
  id: "8b1f4f9e-6c55-4d4f-9a3e-2f0d7c1b2a10",
  nome: "Empresa Teste Ltda",
  cnpj: "11222333000181",
  email_financeiro: "financeiro@empresa.com.br",
  gestor_email: "gestora@empresa.com.br",
  cep: "20090003",
  logradouro: "Av. Rio Branco",
  numero: "1",
  complemento: "sala 1001",
  bairro: "Centro",
  cidade: "Rio de Janeiro",
  uf: "RJ",
  assentos: 12,
  preco_por_pessoa_ano: 180,
  status: "proposta",
  acesso_ate: null,
  codigo_convite: "0123456789abcdef0123456789abcdef",
  gestor_id: null,
  stripe_cliente_id: null,
  stripe_fatura_id: null,
  fatura_url: null,
  criado_em: "2026-11-25T12:00:00Z",
};

const chamada = (nome: string) => stripe.chamadas.find((c) => c[0] === nome);

describe("admin → empresas", () => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_teste");
  beforeEach(() => {
    admin.eh = true;
    banco.inseridos = [];
    banco.atualizados = [];
    banco.org = { ...ORG };
    banco.erroInsert = null;
    stripe.chamadas = [];
    stripe.faturaAnterior = null;
    stripe.produtoExiste = true;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sem ser admin: nada é gravado nem cobrado", async () => {
    admin.eh = false;
    expect(await criarProposta({ ok: false }, formulario(PROPOSTA))).toEqual({ ok: false, erro: "Só o admin." });
    expect(await gerarFatura({ ok: false }, formulario({ id: ORG.id }))).toEqual({ ok: false, erro: "Só o admin." });
    expect(banco.inseridos).toEqual([]);
    expect(stripe.chamadas).toEqual([]);
  });

  it("criar proposta: valida e grava a organização limpa (sem os campos do Next)", async () => {
    expect(await criarProposta({ ok: false }, formulario(PROPOSTA))).toEqual({ ok: true, id: "org-novo" });
    expect(banco.inseridos[0]).toEqual({
      nome: "Empresa Teste Ltda",
      cnpj: "11222333000181",
      email_financeiro: "financeiro@empresa.com.br",
      gestor_email: "gestora@empresa.com.br",
      cep: "20090003",
      logradouro: "Av. Rio Branco",
      numero: "1",
      complemento: "sala 1001",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      assentos: 12,
      preco_por_pessoa_ano: 180,
    });
  });

  it("criar proposta: menos de 5 pessoas ou erro no banco viram mensagem", async () => {
    expect(await criarProposta({ ok: false }, formulario({ ...PROPOSTA, assentos: "3" }))).toMatchObject({ ok: false, erro: "Mínimo de 5 pessoas." });
    banco.erroInsert = { code: "23514", message: "check" };
    expect((await criarProposta({ ok: false }, formulario(PROPOSTA))).erro).toBe("Não foi possível gravar a proposta.");
  });

  it("gerar fatura: cliente com CNPJ e endereço, fatura send_invoice em 15 dias, item N × preço, finaliza e envia", async () => {
    stripe.produtoExiste = false;
    const r = await gerarFatura({ ok: false }, formulario({ id: ORG.id }));
    expect(r).toEqual({ ok: true, url: "https://invoice.stripe.com/i/in_novo", reaproveitada: false });

    const [, cliente, opcoesCliente] = chamada("customers.create")!;
    expect(cliente).toMatchObject({
      name: "Empresa Teste Ltda",
      email: "financeiro@empresa.com.br",
      address: { line1: "Av. Rio Branco, 1", line2: "sala 1001", city: "Rio de Janeiro", state: "RJ", postal_code: "20090003", country: "BR" },
      tax_id_data: [{ type: "br_cnpj", value: "11.222.333/0001-81" }],
      metadata: { organizacao_id: ORG.id, bairro: "Centro" },
    });
    expect(opcoesCliente).toEqual({ idempotencyKey: `empresa-cliente-${ORG.id}` });

    const [, fatura, opcoesFatura] = chamada("invoices.create")!;
    expect(fatura).toMatchObject({ customer: "cus_org", collection_method: "send_invoice", days_until_due: 15, currency: "brl", metadata: { organizacao_id: ORG.id, assentos: "12" } });
    expect(fatura).not.toHaveProperty("payment_settings"); // meios de pagamento dinâmicos
    expect(opcoesFatura).toEqual({ idempotencyKey: `empresa-fatura-${ORG.id}-primeira` });

    const [, item, opcoesItem] = chamada("invoiceItems.create")!;
    expect(item).toMatchObject({
      customer: "cus_org",
      invoice: "in_novo",
      quantity: 12,
      price_data: { currency: "brl", product: "planilhes_pro_empresas", unit_amount: 18000 },
      description: "Planilhês Pro para empresas — 12 pessoas × 12 meses",
    });
    expect(opcoesItem).toEqual({ idempotencyKey: "empresa-item-in_novo" });
    expect(chamada("products.create")).toBeTruthy(); // primeira fatura: cria o produto
    expect(stripe.chamadas.map((c) => c[0]).slice(-2)).toEqual(["invoices.finalizeInvoice", "invoices.sendInvoice"]);

    expect(banco.atualizados[0]).toMatchObject({ stripe_cliente_id: "cus_org", stripe_fatura_id: "in_novo", fatura_url: "https://invoice.stripe.com/i/in_novo" });
  });

  it("fatura em aberto: reaproveita a mesma (não cobra duas vezes) e atualiza o cliente", async () => {
    banco.org = { ...ORG, stripe_cliente_id: "cus_org", stripe_fatura_id: "in_aberta" };
    stripe.faturaAnterior = { id: "in_aberta", status: "open", hosted_invoice_url: "https://invoice.stripe.com/i/in_aberta" };
    expect(await gerarFatura({ ok: false }, formulario({ id: ORG.id }))).toEqual({ ok: true, url: "https://invoice.stripe.com/i/in_aberta", reaproveitada: true });
    expect(chamada("customers.update")?.[1]).toBe("cus_org");
    expect(chamada("customers.create")).toBeUndefined();
    expect(chamada("invoices.create")).toBeUndefined();
    expect(chamada("invoices.sendInvoice")).toBeUndefined();
  });

  it("renovação (fatura anterior paga): nova fatura com outra chave de idempotência", async () => {
    banco.org = { ...ORG, status: "ativa", stripe_cliente_id: "cus_org", stripe_fatura_id: "in_paga" };
    stripe.faturaAnterior = { id: "in_paga", status: "paid" };
    expect((await gerarFatura({ ok: false }, formulario({ id: ORG.id }))).ok).toBe(true);
    expect(chamada("invoices.create")?.[2]).toEqual({ idempotencyKey: `empresa-fatura-${ORG.id}-in_paga` });
  });

  it("rascunho de uma tentativa que caiu no meio: termina de montar sem duplicar o item", async () => {
    banco.org = { ...ORG, stripe_cliente_id: "cus_org", stripe_fatura_id: "in_rascunho" };
    stripe.faturaAnterior = { id: "in_rascunho", status: "draft", lines: { data: [{ id: "il_1" }] } };
    expect((await gerarFatura({ ok: false }, formulario({ id: ORG.id }))).url).toBe("https://invoice.stripe.com/i/in_rascunho");
    expect(chamada("invoices.create")).toBeUndefined();
    expect(chamada("invoiceItems.create")).toBeUndefined();
    expect(chamada("invoices.finalizeInvoice")?.[1]).toBe("in_rascunho");
  });

  it("organização cancelada, id inválido ou Stripe recusando: mensagem, sem gravar", async () => {
    banco.org = { ...ORG, status: "cancelada" };
    expect((await gerarFatura({ ok: false }, formulario({ id: ORG.id }))).erro).toContain("cancelada");
    expect((await gerarFatura({ ok: false }, formulario({ id: "x" }))).erro).toBe("Organização inválida.");
    banco.org = { ...ORG };
    const original = stripeFalso.invoices.create;
    stripeFalso.invoices.create = async () => {
      throw new Error("Invalid tax id");
    };
    const r = await gerarFatura({ ok: false }, formulario({ id: ORG.id }));
    stripeFalso.invoices.create = original;
    expect(r).toEqual({ ok: false, erro: "O Stripe recusou: Invalid tax id" });
    expect(banco.atualizados).toEqual([]);
  });
});
