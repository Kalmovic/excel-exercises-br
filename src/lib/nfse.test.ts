import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { cancelarNotas, emitirNota, formatarNbs, separarNumero, tomadorDoCliente } = await import("./nfse");
type LinhaNota = import("./nfse").LinhaNota;

vi.stubEnv("ASAAS_API_KEY", "teste");
vi.stubEnv("NFSE_SERVICO_ID", "429606");
vi.stubEnv("NFSE_ISS", "2");

/** Banco em memória. */
function registroFalso() {
  const linhas = new Map<string, LinhaNota>();
  return {
    linhas,
    buscar: async (o: string) => linhas.get(o) ?? null,
    salvar: async ({ origem, ...c }: Partial<LinhaNota> & { origem: string }) => {
      const a = linhas.get(origem);
      if (!a && c.valor === undefined) return;
      linhas.set(origem, { ...(a ?? ({} as LinhaNota)), origem, ...c } as LinhaNota);
    },
    porPagamento: async (p: string) => [...linhas.values()].filter((l) => l.pagamento === p),
  };
}

/** Asaas falso: guarda as chamadas e responde por rota. */
let chamadas: { metodo: string; caminho: string; corpo?: Record<string, unknown> }[] = [];
let respostas: Record<string, () => { status?: number; json: unknown }> = {};
vi.stubGlobal("fetch", async (url: string, init: { method: string; body?: string }) => {
  const caminho = url.replace(/^https:\/\/[^/]+\/v3\//, "");
  const metodo = init.method;
  chamadas.push({ metodo, caminho, corpo: init.body ? JSON.parse(init.body) : undefined });
  const chave = `${metodo} ${caminho.split("?")[0]}`;
  const r = (respostas[chave] ?? (() => ({ json: { data: [] } })))();
  return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
});

const CLIENTE = {
  id: "cus_1",
  name: "Marta Souza",
  email: "marta@example.com",
  address: { line1: "Rua das Flores, 123", line2: "apto 201", postal_code: "20040-020", city: "Rio de Janeiro", state: "RJ", country: "BR" },
  tax_ids: { data: [{ type: "br_cpf", value: "518.159.152-34" }] },
};
const stripeFalso = (cliente: object = CLIENTE) =>
  ({
    customers: { retrieve: vi.fn(async () => cliente) },
    invoicePayments: { list: vi.fn(async () => ({ data: [{ payment: { payment_intent: "pi_mensal" } }] })) },
  }) as unknown as Stripe;

const anual = {
  id: "evt_1",
  type: "checkout.session.completed",
  created: Date.UTC(2026, 10, 19, 15) / 1000,
  data: { object: { id: "cs_1", mode: "payment", payment_status: "paid", customer: "cus_1", amount_total: 23880, payment_intent: "pi_1", metadata: { usuario_id: "u1", plano: "anual" } } },
} as unknown as Stripe.Event;

describe("NFS-e pelo Asaas", () => {
  beforeEach(() => {
    chamadas = [];
    respostas = {
      "POST customers": () => ({ json: { id: "cus_asaas_1" } }),
      "POST invoices": () => ({ json: { id: "inv_1", status: "SCHEDULED" } }),
      "POST invoices/inv_1/authorize": () => ({ json: { id: "inv_1", status: "SYNCHRONIZED" } }),
    };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("separa rua e número do endereço do Stripe", () => {
    expect(separarNumero("Rua das Flores, 123")).toEqual({ endereco: "Rua das Flores", numero: "123" });
    expect(separarNumero("Av. Brasil 4500B")).toEqual({ endereco: "Av. Brasil", numero: "4500B" });
    expect(separarNumero("Rua Sete, nº 7")).toEqual({ endereco: "Rua Sete", numero: "7" });
    expect(separarNumero("Estrada sem número")).toEqual({ endereco: "Estrada sem número", numero: "S/N" });
  });

  it("tomador: precisa de CPF/CNPJ e CEP; sem um deles, não emite", () => {
    expect(tomadorDoCliente(CLIENTE as unknown as Stripe.Customer)).toMatchObject({ cpfCnpj: "51815915234", cep: "20040020", numero: "123" });
    expect(tomadorDoCliente({ ...CLIENTE, tax_ids: { data: [] } } as unknown as Stripe.Customer)).toBeNull();
    expect(tomadorDoCliente({ ...CLIENTE, address: { ...CLIENTE.address, postal_code: null } } as unknown as Stripe.Customer)).toBeNull();
  });

  it("anual pago: cadastra o aluno, cria a nota com a origem e pede a emissão", async () => {
    const registro = registroFalso();
    expect(await emitirNota(anual, { stripe: stripeFalso(), registro, agora: new Date("2026-11-19T15:00:00Z") })).toBe("emitida");
    const nota = chamadas.find((c) => c.metodo === "POST" && c.caminho === "invoices")!.corpo!;
    expect(nota).toMatchObject({ customer: "cus_asaas_1", value: 238.8, externalReference: "cs_1", municipalServiceId: "429606", effectiveDate: "2026-11-19" });
    expect(nota.taxes).toMatchObject({ iss: 2, retainIss: false });
    expect(nota.taxes).not.toHaveProperty("nbsCode"); // só vai quando NFSE_NBS existe
    expect(nota.serviceDescription).toContain("de 19/11/2026 a 19/11/2027");
    expect(chamadas.some((c) => c.caminho === "invoices/inv_1/authorize")).toBe(true);
    expect(registro.linhas.get("cs_1")).toMatchObject({ status: "emitida", asaas_nota: "inv_1", pagamento: "pi_1", usuario_id: "u1" });
  });

  it("aviso repetido depois de emitida: não chama o Asaas de novo", async () => {
    const registro = registroFalso();
    await emitirNota(anual, { stripe: stripeFalso(), registro });
    chamadas = [];
    expect(await emitirNota(anual, { stripe: stripeFalso(), registro })).toBe("ja_emitida");
    expect(chamadas).toEqual([]);
  });

  it("caiu entre criar a nota e gravar: na nova tentativa acha a nota pela origem e não cria outra", async () => {
    const registro = registroFalso();
    respostas["GET invoices"] = () => ({ json: { data: [{ id: "inv_velha", status: "AUTHORIZED" }] } });
    expect(await emitirNota(anual, { stripe: stripeFalso(), registro })).toBe("emitida");
    expect(chamadas.some((c) => c.metodo === "POST" && c.caminho === "invoices")).toBe(false);
    expect(chamadas.some((c) => c.caminho.endsWith("/authorize"))).toBe(false); // já autorizada
    expect(registro.linhas.get("cs_1")?.asaas_nota).toBe("inv_velha");
  });

  it("aluno já cadastrado no Asaas: atualiza os dados em vez de duplicar", async () => {
    respostas["GET customers"] = () => ({ json: { data: [{ id: "cus_asaas_9" }] } });
    respostas["PUT customers/cus_asaas_9"] = () => ({ json: { id: "cus_asaas_9" } });
    await emitirNota(anual, { stripe: stripeFalso(), registro: registroFalso() });
    expect(chamadas.some((c) => c.metodo === "POST" && c.caminho === "customers")).toBe(false);
    expect(chamadas.find((c) => c.caminho === "invoices" && c.metodo === "POST")!.corpo!.customer).toBe("cus_asaas_9");
  });

  it("sem CPF no Stripe: marca sem_dados e não chama o Asaas", async () => {
    const registro = registroFalso();
    expect(await emitirNota(anual, { stripe: stripeFalso({ ...CLIENTE, tax_ids: { data: [] } }), registro })).toBe("sem_dados");
    expect(chamadas).toEqual([]);
    expect(registro.linhas.get("cs_1")?.status).toBe("sem_dados");
  });

  it("dado recusado pelo Asaas (400): status erro, sem repetir; Asaas fora do ar (503): lança para o Stripe reenviar", async () => {
    const registro = registroFalso();
    respostas["POST invoices/inv_1/authorize"] = () => ({ status: 400, json: { errors: [{ description: "CEP do cliente é inválido." }] } });
    expect(await emitirNota(anual, { stripe: stripeFalso(), registro })).toBe("erro");
    expect(registro.linhas.get("cs_1")).toMatchObject({ status: "erro", erro: expect.stringContaining("CEP do cliente é inválido") });

    respostas["POST customers"] = () => ({ status: 503, json: {} });
    await expect(emitirNota({ ...anual, data: { object: { ...(anual.data.object as object), id: "cs_2" } } } as Stripe.Event, { stripe: stripeFalso(), registro })).rejects.toThrow("Asaas 503");
  });

  it("mensal: valor pago da fatura, período e o PaymentIntent da fatura", async () => {
    const registro = registroFalso();
    const fatura = {
      id: "evt_2",
      type: "invoice.paid",
      created: Date.UTC(2026, 10, 19) / 1000,
      data: {
        object: {
          id: "in_1",
          customer: "cus_1",
          amount_paid: 3490,
          lines: { data: [{ period: { start: Date.UTC(2026, 10, 19, 12) / 1000, end: Date.UTC(2026, 11, 19, 12) / 1000 } }] },
          parent: { subscription_details: { subscription: "sub_1", metadata: { usuario_id: "u1" } } },
        },
      },
    } as unknown as Stripe.Event;
    expect(await emitirNota(fatura, { stripe: stripeFalso(), registro })).toBe("emitida");
    const nota = chamadas.find((c) => c.metodo === "POST" && c.caminho === "invoices")!.corpo!;
    expect(nota).toMatchObject({ value: 34.9, externalReference: "in_1" });
    expect(nota.serviceDescription).toContain("mensal, de 19/11/2026 a 19/12/2026");
    expect(registro.linhas.get("in_1")?.pagamento).toBe("pi_mensal");
  });

  it("cupom de 100% (R$ 0): não emite nota", async () => {
    const gratis = { ...anual, data: { object: { ...(anual.data.object as object), amount_total: 0 } } } as Stripe.Event;
    expect(await emitirNota(gratis, { stripe: stripeFalso(), registro: registroFalso() })).toBe("ignorada");
  });

  it("reembolso: cancela só as notas emitidas daquele pagamento", async () => {
    const registro = registroFalso();
    await emitirNota(anual, { stripe: stripeFalso(), registro });
    respostas["POST invoices/inv_1/cancel"] = () => ({ json: { id: "inv_1", status: "CANCELLATION_PENDING" } });
    expect(await cancelarNotas("pi_1", registro)).toBe(1);
    expect(registro.linhas.get("cs_1")?.status).toBe("cancelada");
    expect(await cancelarNotas("pi_1", registro)).toBe(0);
  });

  it("com NFSE_SERVICO_CODIGO (Emissor Nacional): manda só o código, sem o id; NBS quando existe", async () => {
    vi.stubEnv("NFSE_SERVICO_CODIGO", "01.05.01");
    vi.stubEnv("NFSE_NBS", "115062100");
    await emitirNota(anual, { stripe: stripeFalso(), registro: registroFalso() });
    const nota = chamadas.find((c) => c.metodo === "POST" && c.caminho === "invoices")!.corpo!;
    expect(nota.municipalServiceCode).toBe("01.05.01");
    expect(nota).not.toHaveProperty("municipalServiceId");
    expect(nota.taxes).toMatchObject({ nbsCode: "1.1506.21.00" });
    expect(formatarNbs("1.1506.21.00")).toBe("1.1506.21.00");
    expect(formatarNbs(undefined)).toBeNull();
    vi.stubEnv("NFSE_SERVICO_CODIGO", "");
    vi.stubEnv("NFSE_NBS", "");
  });

  it("trava de modo: Stripe de teste com Asaas de produção (e o contrário) não emite nada", async () => {
    vi.stubEnv("ASAAS_URL", "https://api.asaas.com/v3");
    expect(await emitirNota({ ...anual, livemode: false } as Stripe.Event, { stripe: stripeFalso(), registro: registroFalso() })).toBe("modo_misturado");
    expect(await emitirNota({ ...anual, livemode: true } as Stripe.Event, { stripe: stripeFalso(), registro: registroFalso() })).toBe("emitida");
    vi.stubEnv("ASAAS_URL", "");
    chamadas = [];
    expect(await emitirNota({ ...anual, livemode: true } as Stripe.Event, { stripe: stripeFalso(), registro: registroFalso() })).toBe("modo_misturado");
    expect(chamadas).toEqual([]); // nem chegou a chamar o Asaas
  });
});
