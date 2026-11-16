import "server-only";

/**
 * Cliente da API do Asaas (v3). Só roda no servidor: a chave dá acesso à conta
 * de cobrança.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 * - ASAAS_API_KEY: chave da API ($aact_hmlg_... no sandbox, $aact_prod_... em produção).
 *   Criada SEM permissão de saque: o site só cobra.
 * - ASAAS_AMBIENTE: "producao" usa a API real; qualquer outro valor, o sandbox.
 * - ASAAS_WEBHOOK_TOKEN: segredo que o Asaas manda em cada aviso (ver /api/asaas/webhook).
 */
const URL_API = () =>
  process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

export const asaasConfigurado = () => Boolean(process.env.ASAAS_API_KEY);

export class ErroAsaas extends Error {
  constructor(
    public status: number,
    public detalhes: { code?: string; description?: string }[],
  ) {
    super(`Asaas ${status}: ${detalhes.map((d) => d.description).join("; ") || "erro sem descrição"}`);
  }
}

async function chamar<T>(metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(URL_API() + caminho, {
    method: metodo,
    headers: {
      access_token: process.env.ASAAS_API_KEY ?? "",
      "Content-Type": "application/json",
      // O Asaas exige um User-Agent que identifique a aplicação.
      "User-Agent": "planilhes",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  const json = (await resposta.json().catch(() => ({}))) as T & { errors?: { code?: string; description?: string }[] };
  if (!resposta.ok) throw new ErroAsaas(resposta.status, json.errors ?? []);
  return json;
}

export type ClienteAsaas = { id: string };
export type CobrancaAsaas = {
  id: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
  subscription?: string;
  externalReference?: string;
};
export type AssinaturaAsaas = { id: string; status: string };

/** Cliente = quem paga. O Asaas exige CPF para emitir cobrança. */
export function criarCliente(dados: { nome: string; email: string; cpf: string; usuarioId: string }) {
  return chamar<ClienteAsaas>("POST", "/customers", {
    name: dados.nome,
    email: dados.email,
    cpfCnpj: dados.cpf,
    externalReference: dados.usuarioId,
    notificationDisabled: true, // os avisos ao aluno saem do Planilhês, não do Asaas
  });
}

/** Mensal: assinatura no cartão. O Asaas guarda o cartão e cobra sozinho todo mês. */
export function criarAssinaturaMensal(dados: { cliente: string; valor: number; hoje: string; usuarioId: string }) {
  return chamar<AssinaturaAsaas>("POST", "/subscriptions", {
    customer: dados.cliente,
    billingType: "CREDIT_CARD",
    cycle: "MONTHLY",
    value: dados.valor,
    nextDueDate: dados.hoje,
    description: "Planilhês Pro mensal",
    externalReference: dados.usuarioId,
  });
}

/** Anual: uma cobrança só; o aluno escolhe Pix ou cartão na página do Asaas. */
export function criarCobrancaAnual(dados: { cliente: string; valor: number; vencimento: string; usuarioId: string }) {
  return chamar<CobrancaAsaas>("POST", "/payments", {
    customer: dados.cliente,
    billingType: "UNDEFINED",
    value: dados.valor,
    dueDate: dados.vencimento,
    description: "Planilhês Pro anual (12 meses de acesso)",
    externalReference: dados.usuarioId,
  });
}

/** Primeira cobrança de uma assinatura (é nela que está a página de pagamento). */
export async function primeiraCobranca(assinatura: string) {
  const r = await chamar<{ data: CobrancaAsaas[] }>("GET", `/subscriptions/${assinatura}/payments`);
  return r.data.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;
}

/** Cancela a renovação. Cobranças já pagas não são afetadas. */
export function cancelarAssinatura(assinatura: string) {
  return chamar<{ deleted: boolean }>("DELETE", `/subscriptions/${assinatura}`);
}

/** Apaga uma cobrança ainda não paga (checkout abandonado). */
export function apagarCobranca(cobranca: string) {
  return chamar<{ deleted: boolean }>("DELETE", `/payments/${cobranca}`);
}
