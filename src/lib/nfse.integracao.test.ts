/**
 * Teste de ponta a ponta contra o Stripe (modo teste) e o sandbox do Asaas.
 * Não roda na suíte normal (precisa de rede e das chaves). Para rodar:
 *
 *   NFSE_INTEGRACAO=1 STRIPE_SECRET_KEY=sk_test_... ASAAS_API_KEY=... NFSE_SERVICO_ID=429606 npx vitest run src/lib/nfse.integracao.test.ts
 *
 * Assina o mensal com o cartão de teste, pega o aviso invoice.paid de verdade,
 * emite a nota no Asaas, espera a prefeitura (simulada) autorizar, reembolsa e
 * confere que a nota foi cancelada.
 */
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { cancelarNotas, emitirNota } = await import("./nfse");
type LinhaNota = import("./nfse").LinhaNota;

const ligado = process.env.NFSE_INTEGRACAO === "1";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cpfValido() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const n of [10, 11]) {
    const r = (d.reduce((s, x, i) => s + x * (n - i), 0) * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  return d.join("");
}

async function asaas(caminho: string) {
  const url = process.env.ASAAS_URL || "https://api-sandbox.asaas.com/v3";
  const r = await fetch(`${url}/${caminho}`, { headers: { access_token: process.env.ASAAS_API_KEY ?? "", "User-Agent": "planilhes" } });
  return r.json() as Promise<Record<string, string>>;
}

describe.runIf(ligado)("NFS-e de ponta a ponta (Stripe teste + Asaas sandbox)", () => {
  it("assinatura paga → nota autorizada → reembolso → nota cancelada", { timeout: 180_000 }, async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { httpClient: Stripe.createFetchHttpClient() });
    const usuario = `teste-nfse-${Date.now()}`;
    const linhas = new Map<string, LinhaNota>();
    const registro = {
      buscar: async (o: string) => linhas.get(o) ?? null,
      salvar: async ({ origem, ...c }: Partial<LinhaNota> & { origem: string }) => {
        linhas.set(origem, { ...(linhas.get(origem) ?? ({} as LinhaNota)), origem, ...c } as LinhaNota);
      },
      porPagamento: async (p: string) => [...linhas.values()].filter((l) => l.pagamento === p),
    };

    // 1. O aluno como o checkout deixaria: CPF e endereço no cliente do Stripe.
    const cpf = cpfValido();
    const cliente = await stripe.customers.create({
      name: "Aluno Teste Planilhês",
      email: "aluno-teste@example.com",
      address: { line1: "Avenida Rio Branco, 1", line2: "sala 101", postal_code: "20040-020", city: "Rio de Janeiro", state: "RJ", country: "BR" },
      tax_id_data: [{ type: "br_cpf", value: `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` }],
      payment_method: "pm_card_br",
      invoice_settings: { default_payment_method: "pm_card_br" },
    });
    try {
      const [preco] = (await stripe.prices.list({ lookup_keys: ["planilhes_pro_mensal"], active: true })).data;
      const assinatura = await stripe.subscriptions.create({ customer: cliente.id, items: [{ price: preco.id }], metadata: { usuario_id: usuario } });
      const faturaId = typeof assinatura.latest_invoice === "string" ? assinatura.latest_invoice : assinatura.latest_invoice!.id!;

      // 2. O aviso invoice.paid de verdade (chega em alguns segundos).
      let evento: Stripe.Event | undefined;
      for (let i = 0; i < 15 && !evento; i++) {
        evento = (await stripe.events.list({ type: "invoice.paid", limit: 20 })).data.find((e) => (e.data.object as Stripe.Invoice).id === faturaId);
        if (!evento) await espera(2000);
      }
      expect(evento, "aviso invoice.paid").toBeDefined();
      // O subscription_details.metadata do aviso vem da assinatura.
      expect((evento!.data.object as Stripe.Invoice).parent?.subscription_details?.metadata?.usuario_id).toBe(usuario);

      // 3. Emite.
      expect(await emitirNota(evento!, { stripe, registro })).toBe("emitida");
      const linha = linhas.get(faturaId)!;
      expect(linha).toMatchObject({ status: "emitida", valor: 34.9, usuario_id: usuario });
      expect(linha.pagamento).toMatch(/^pi_/);
      // Repetir o aviso não cria outra nota.
      expect(await emitirNota(evento!, { stripe, registro })).toBe("ja_emitida");

      // 4. A prefeitura (simulada no sandbox) autoriza.
      let nota: Record<string, string> = {};
      for (let i = 0; i < 20 && nota.status !== "AUTHORIZED"; i++) {
        nota = await asaas(`invoices/${linha.asaas_nota}`);
        if (nota.status !== "AUTHORIZED") await espera(3000);
      }
      console.log("NOTA", JSON.stringify({ id: nota.id, status: nota.status, numero: nota.number, valor: nota.value, pdf: nota.pdfUrl }));
      expect(nota.status).toBe("AUTHORIZED");
      expect(nota.externalReference).toBe(faturaId);
      const tomador = await asaas(`customers/${nota.customer}`);
      expect(tomador.cpfCnpj).toBe(cpf);

      // 5. Reembolso: cancela a nota.
      await stripe.refunds.create({ payment_intent: linha.pagamento! });
      expect(await cancelarNotas(linha.pagamento!, registro)).toBe(1);
      // Passa por PROCESSING_CANCELLATION até a prefeitura (simulada) confirmar.
      let cancelada: Record<string, string> = {};
      for (let i = 0; i < 20 && cancelada.status !== "CANCELED"; i++) {
        cancelada = await asaas(`invoices/${linha.asaas_nota}`);
        if (cancelada.status !== "CANCELED") await espera(3000);
      }
      console.log("CANCELADA", cancelada.status);
      expect(cancelada.status).toBe("CANCELED");
      await stripe.subscriptions.cancel(assinatura.id);
    } finally {
      await stripe.customers.del(cliente.id);
    }
  });
});
