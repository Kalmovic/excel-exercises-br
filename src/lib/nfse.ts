import "server-only";
import type Stripe from "stripe";

/**
 * Nota fiscal de serviço (NFS-e) pelo Asaas, a cada pagamento confirmado no Stripe.
 *
 * O caminho: o webhook do Stripe libera o Pro e chama `emitirNota`. Ela lê o
 * pagamento do aviso, pega CPF/CNPJ e endereço do cliente no Stripe (o checkout
 * pede os dois), cadastra o aluno no Asaas e pede a nota. O Asaas registra na
 * prefeitura e manda o PDF por e-mail ao aluno.
 *
 * Idempotência: uma linha por pagamento em `notas_fiscais` (origem = id do
 * checkout ou da fatura). A nota no Asaas leva a mesma origem em
 * `externalReference`, então, mesmo se o servidor cair entre criar a nota e
 * gravar a linha, a próxima tentativa acha a nota em vez de criar outra.
 *
 * Variáveis de ambiente:
 * - ASAAS_API_KEY: chave da API do Asaas (sandbox ou produção).
 * - ASAAS_URL: https://api-sandbox.asaas.com/v3 (padrão) ou https://api.asaas.com/v3.
 * - NFSE_SERVICO_CODIGO: código do serviço (ex.: 01.05.01). No Emissor Nacional (Rio) vai só
 *   o código, sem o id. Tem prioridade sobre NFSE_SERVICO_ID.
 * - NFSE_SERVICO_ID: id do serviço municipal no Asaas (GET /invoices/municipalServices).
 * - NFSE_SERVICO_NOME: o nome desse serviço.
 * - NFSE_ISS: alíquota de ISS em % (o contador informa).
 * - NFSE_NBS: código NBS do serviço, se a prefeitura exigir (Emissor Nacional).
 */

export const nfseConfigurada = () => Boolean(process.env.ASAAS_API_KEY && (process.env.NFSE_SERVICO_CODIGO || process.env.NFSE_SERVICO_ID));

/** NBS como o Asaas espera: "115062100" (como o contador passa) vira "1.1506.21.00". */
export function formatarNbs(nbs: string | undefined): string | null {
  const d = (nbs ?? "").replace(/\D/g, "");
  return d.length === 9 ? `${d[0]}.${d.slice(1, 5)}.${d.slice(5, 7)}.${d.slice(7)}` : nbs || null;
}

const config = () => ({
  url: process.env.ASAAS_URL || "https://api-sandbox.asaas.com/v3",
  chave: process.env.ASAAS_API_KEY ?? "",
  servicoCodigo: process.env.NFSE_SERVICO_CODIGO || null,
  servicoId: process.env.NFSE_SERVICO_ID ?? "",
  servicoNome: process.env.NFSE_SERVICO_NOME || "Licenciamento de uso de programa de computação",
  iss: Number(process.env.NFSE_ISS || "0"),
  nbs: formatarNbs(process.env.NFSE_NBS),
});

/** Erro devolvido pelo Asaas. 4xx = dado errado (tentar de novo não resolve); 5xx = fora do ar. */
export class ErroAsaas extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(`Asaas ${status}: ${mensagem}`);
  }
  get definitivo() {
    return this.status >= 400 && this.status < 500 && this.status !== 429;
  }
}

async function asaas<T>(caminho: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { url, chave } = config();
  const r = await fetch(`${url}/${caminho}`, {
    method: init?.method ?? "GET",
    headers: { access_token: chave, "Content-Type": "application/json", "User-Agent": "planilhes" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const corpo = (await r.json().catch(() => ({}))) as { errors?: { description?: string }[] };
  if (!r.ok) throw new ErroAsaas(r.status, corpo.errors?.map((e) => e.description).join("; ") || `HTTP ${r.status}`);
  return corpo as T;
}

// ---------------------------------------------------------------------------
// Registro (tabela notas_fiscais). Interface para os testes não precisarem do banco.

export type StatusNota = "pendente" | "emitida" | "sem_dados" | "erro" | "cancelada";
export type LinhaNota = {
  origem: string;
  usuario_id: string | null;
  pagamento: string | null;
  valor: number;
  descricao: string;
  status: StatusNota;
  asaas_cliente: string | null;
  asaas_nota: string | null;
  erro: string | null;
};
export interface RegistroNotas {
  buscar(origem: string): Promise<LinhaNota | null>;
  /** Cria ou atualiza pela origem. */
  salvar(linha: Partial<LinhaNota> & { origem: string }): Promise<void>;
  porPagamento(pagamento: string): Promise<LinhaNota[]>;
}

// ---------------------------------------------------------------------------
// Do aviso do Stripe para o pagamento.

const id = (x: string | { id: string } | null | undefined) => (x == null ? null : typeof x === "string" ? x : x.id);
const data = (segundos: number) => new Date(segundos * 1000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const RODAPE = "Plataforma de exercícios de Excel com correção automática. planilhes.com.br";

export type Pagamento = { origem: string; usuario: string | null; cliente: string; valor: number; descricao: string; pagamento: string | null };

/** O que foi pago, para a nota. Null quando o aviso não é um pagamento do Pro (ou é de R$ 0, com cupom de 100%). */
export async function pagamentoDoEvento(evento: Stripe.Event, stripe: Stripe): Promise<Pagamento | null> {
  if (evento.type === "checkout.session.completed" || evento.type === "checkout.session.async_payment_succeeded") {
    const s = evento.data.object;
    const cliente = id(s.customer);
    if (s.mode !== "payment" || s.payment_status !== "paid" || !cliente || !s.amount_total) return null;
    const ate = new Date(evento.created * 1000);
    ate.setFullYear(ate.getFullYear() + 1);
    return {
      origem: s.id,
      usuario: s.metadata?.usuario_id ?? null,
      cliente,
      valor: s.amount_total / 100,
      pagamento: id(s.payment_intent),
      descricao: `Planilhês Pro anual: 12 meses de acesso, de ${data(evento.created)} a ${data(ate.getTime() / 1000)}. ${RODAPE}`,
    };
  }
  if (evento.type === "invoice.paid") {
    const f = evento.data.object;
    const cliente = id(f.customer);
    if (!f.id || !cliente || !f.amount_paid) return null;
    // O PaymentIntent da fatura: é por ele que o reembolso acha a nota para cancelar.
    const pagamentoDaFatura = async () => id((await stripe.invoicePayments.list({ invoice: f.id!, limit: 1 }).catch(() => null))?.data[0]?.payment?.payment_intent ?? null);
    // Licença de empresa (fatura avulsa do admin): a nota vai para o CNPJ do cliente.
    if (f.metadata?.organizacao_id && !f.parent?.subscription_details?.subscription) {
      const licencas = Number(f.metadata.assentos) || f.lines.data.reduce((s, l) => s + (l.quantity ?? 0), 0);
      const pago = f.status_transitions?.paid_at ?? evento.created;
      const ate = new Date(pago * 1000);
      ate.setFullYear(ate.getFullYear() + 1);
      return {
        origem: f.id,
        usuario: null,
        cliente,
        valor: f.amount_paid / 100,
        pagamento: await pagamentoDaFatura(),
        descricao: `Planilhês Pro para empresas: ${licencas} licenças, de ${data(pago)} a ${data(ate.getTime() / 1000)}. ${RODAPE}`,
      };
    }
    const inicio = Math.min(...f.lines.data.map((l) => l.period?.start ?? Infinity));
    const fim = Math.max(0, ...f.lines.data.map((l) => l.period?.end ?? 0));
    return {
      origem: f.id,
      usuario: f.parent?.subscription_details?.metadata?.usuario_id ?? null,
      cliente,
      valor: f.amount_paid / 100,
      pagamento: await pagamentoDaFatura(),
      descricao: `Assinatura Planilhês Pro mensal, de ${data(Number.isFinite(inicio) ? inicio : evento.created)} a ${data(fim || evento.created)}. ${RODAPE}`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Quem recebe a nota (tomador), a partir do cliente no Stripe.

export type Tomador = {
  nome: string;
  cpfCnpj: string;
  email: string | null;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string | null;
};

/** "Rua das Flores, 123" → rua e número. Sem número: "S/N". */
export function separarNumero(linha: string): { endereco: string; numero: string } {
  const m = linha.trim().match(/^(.*?)[,\s]+(?:n[º°o.]*\s*)?(\d+[a-z]?)\s*$/i);
  return m && m[1] ? { endereco: m[1].trim(), numero: m[2] } : { endereco: linha.trim(), numero: "S/N" };
}

/**
 * CPF/CNPJ (o checkout do Stripe pede) e endereço com CEP (a prefeitura exige). Null se faltar algo.
 * O bairro só vem nos metadados (cliente de empresa, criado no admin): o endereço do Stripe não tem esse campo.
 */
export function tomadorDoCliente(c: Stripe.Customer): Tomador | null {
  const doc = c.tax_ids?.data.find((t) => t.type === "br_cpf" || t.type === "br_cnpj")?.value.replace(/\D/g, "");
  const a = c.address;
  const cep = a?.postal_code?.replace(/\D/g, "");
  if (!doc || !a?.line1 || !cep || cep.length !== 8) return null;
  const { endereco, numero } = separarNumero(a.line1);
  return { nome: c.name || c.email || "Aluno Planilhês", cpfCnpj: doc, email: c.email, cep, endereco, numero, complemento: a.line2 || null, bairro: c.metadata?.bairro || null };
}

async function clienteNoAsaas(t: Tomador, referencia: string): Promise<string> {
  const dados = {
    name: t.nome,
    cpfCnpj: t.cpfCnpj,
    email: t.email ?? undefined,
    postalCode: t.cep,
    address: t.endereco,
    addressNumber: t.numero,
    complement: t.complemento ?? undefined,
    province: t.bairro ?? undefined,
    externalReference: referencia,
  };
  const achados = await asaas<{ data: { id: string }[] }>(`customers?externalReference=${encodeURIComponent(referencia)}&limit=1`);
  const existente = achados.data[0]?.id;
  if (existente) {
    await asaas(`customers/${existente}`, { method: "PUT", body: dados });
    return existente;
  }
  return (await asaas<{ id: string }>("customers", { method: "POST", body: dados })).id;
}

const hojeEmSP = (agora: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);

export type ResultadoNota = "emitida" | "ja_emitida" | "sem_dados" | "erro" | "ignorada" | "modo_misturado";

/** Asaas de produção? (o sandbox tem "sandbox" no endereço) */
export const asaasDeProducao = () => !config().url.includes("sandbox");

/**
 * Emite a nota do pagamento deste aviso. Lança erro só quando vale tentar de
 * novo (Asaas fora do ar): aí o webhook responde 500 e o Stripe reenvia.
 * Dado errado (CPF inválido, endereço incompleto) vira status "erro" na tabela,
 * para resolver à mão, sem repetir o aviso para sempre.
 */
export async function emitirNota(
  evento: Stripe.Event,
  deps: { stripe: Stripe; registro: RegistroNotas; agora?: Date },
): Promise<ResultadoNota> {
  // Trava: pagamento de teste nunca vira nota real, e pagamento real nunca vira nota de mentira.
  // (Stripe de teste + Asaas de produção emitiria NFS-e de verdade para compras com o cartão 4242.)
  if (Boolean(evento.livemode) !== asaasDeProducao()) {
    console.error(
      JSON.stringify({ tipo: "nfse_modo_misturado", evento: evento.id, stripe: evento.livemode ? "producao" : "teste", asaas: asaasDeProducao() ? "producao" : "sandbox" }),
    );
    return "modo_misturado";
  }
  const p = await pagamentoDoEvento(evento, deps.stripe);
  if (!p) return "ignorada";
  const atual = await deps.registro.buscar(p.origem);
  if (atual && atual.status !== "pendente" && atual.status !== "erro") return "ja_emitida";
  if (!atual)
    await deps.registro.salvar({ origem: p.origem, usuario_id: p.usuario, pagamento: p.pagamento, valor: p.valor, descricao: p.descricao, status: "pendente" });

  try {
    const cliente = await deps.stripe.customers.retrieve(p.cliente, { expand: ["tax_ids"] });
    const tomador = cliente.deleted ? null : tomadorDoCliente(cliente);
    if (!tomador) {
      await deps.registro.salvar({ origem: p.origem, status: "sem_dados", erro: "Cliente sem CPF/CNPJ ou endereço com CEP no Stripe." });
      console.error(JSON.stringify({ tipo: "nfse_sem_dados", origem: p.origem, cliente: p.cliente }));
      return "sem_dados";
    }
    const asaasCliente = await clienteNoAsaas(tomador, p.usuario ?? p.cliente);
    await deps.registro.salvar({ origem: p.origem, asaas_cliente: asaasCliente });

    // Nota já criada numa tentativa anterior? (achada pela origem)
    type Nota = { id: string; status: string };
    let nota: Nota | undefined = (await asaas<{ data: Nota[] }>(`invoices?externalReference=${encodeURIComponent(p.origem)}&limit=1`)).data[0];
    const { servicoCodigo, servicoId, servicoNome, iss, nbs } = config();
    nota ??= await asaas<Nota>("invoices", {
      method: "POST",
      body: {
        customer: asaasCliente,
        serviceDescription: p.descricao,
        observations: "Nota emitida automaticamente após a confirmação do pagamento.",
        value: p.valor,
        deductions: 0,
        effectiveDate: hojeEmSP(deps.agora ?? new Date()),
        ...(servicoCodigo ? { municipalServiceCode: servicoCodigo } : { municipalServiceId: servicoId }),
        municipalServiceName: servicoNome.slice(0, 250),
        externalReference: p.origem,
        taxes: { retainIss: false, iss, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0, ...(nbs ? { nbsCode: nbs } : {}) },
      },
    });
    await deps.registro.salvar({ origem: p.origem, asaas_nota: nota.id });
    // Agendada: pede a emissão agora (sem isso, o Asaas emite na data da nota).
    if (nota.status === "SCHEDULED") await asaas(`invoices/${nota.id}/authorize`, { method: "POST" });
    await deps.registro.salvar({ origem: p.origem, status: "emitida", erro: null });
    console.log(JSON.stringify({ tipo: "nfse_emitida", origem: p.origem, nota: nota.id }));
    return "emitida";
  } catch (e) {
    await deps.registro.salvar({ origem: p.origem, status: "erro", erro: String(e).slice(0, 2000) }).catch(() => {});
    if (e instanceof ErroAsaas && e.definitivo) {
      console.error(JSON.stringify({ tipo: "nfse_erro", origem: p.origem, mensagem: e.message }));
      return "erro";
    }
    throw e;
  }
}

/** Reembolso ou contestação: cancela as notas daquele pagamento (PaymentIntent). */
export async function cancelarNotas(pagamento: string, registro: RegistroNotas): Promise<number> {
  let canceladas = 0;
  for (const linha of await registro.porPagamento(pagamento)) {
    if (linha.status !== "emitida" || !linha.asaas_nota) continue;
    await asaas(`invoices/${linha.asaas_nota}/cancel`, { method: "POST" });
    await registro.salvar({ origem: linha.origem, status: "cancelada" });
    canceladas++;
  }
  return canceladas;
}
