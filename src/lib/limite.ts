/**
 * Limite de requisições: balde de fichas em memória.
 *
 * Cada chave (rota + IP, e o id do aluno quando há login) tem um balde com
 * `capacidade` fichas. Cada pedido gasta uma; as fichas voltam aos poucos
 * (`porMinuto`). Balde vazio = 429, com o tempo de espera em Retry-After.
 *
 * LIMITAÇÃO IMPORTANTE: a memória é de cada instância do servidor. Na Vercel
 * (serverless), cada instância tem os seus baldes, e uma instância nova começa
 * com todos cheios. Então isto segura rajadas de um mesmo cliente (que costumam
 * cair na mesma instância), mas não é um limite global. Melhor que nada; para
 * um limite de verdade, trocar o Map por um contador compartilhado (Upstash,
 * Vercel KV ou uma tabela no Supabase) mantendo a mesma função `limitar`.
 */

export type Regra = { capacidade: number; porMinuto: number };

/** Limites por rota. Folgados para quem usa o site de verdade, apertados para robôs. */
export const LIMITES = {
  certificado: { capacidade: 10, porMinuto: 2 },
  especialista: { capacidade: 5, porMinuto: 1 },
  corrigirTeste: { capacidade: 30, porMinuto: 20 },
  contato: { capacidade: 5, porMinuto: 1 },
  erros: { capacidade: 20, porMinuto: 10 },
  loginAdmin: { capacidade: 5, porMinuto: 1 },
} satisfies Record<string, Regra>;

type Balde = { fichas: number; em: number };

const baldes = new Map<string, Balde>();
/** Acima disto, os baldes já cheios de novo são descartados (a memória não cresce sem fim). */
const MAX_BALDES = 10_000;

/** Gasta uma ficha da chave. Devolve 0 se pode seguir, ou os segundos até a próxima ficha. */
export function consumir(chave: string, regra: Regra, agora = Date.now()): number {
  const porMs = regra.porMinuto / 60_000;
  const b = baldes.get(chave);
  const fichas = b ? Math.min(regra.capacidade, b.fichas + (agora - b.em) * porMs) : regra.capacidade;
  if (fichas < 1) {
    baldes.set(chave, { fichas, em: agora });
    return Math.max(1, Math.ceil((1 - fichas) / porMs / 1000));
  }
  if (!b && baldes.size >= MAX_BALDES) faxina(agora, porMs, regra.capacidade);
  baldes.set(chave, { fichas: fichas - 1, em: agora });
  return 0;
}

function faxina(agora: number, porMs: number, capacidade: number) {
  for (const [k, b] of baldes) if (b.fichas + (agora - b.em) * porMs >= capacidade) baldes.delete(k);
  // Ainda cheio (ataque com muitos IPs): começa do zero em vez de crescer.
  if (baldes.size >= MAX_BALDES) baldes.clear();
}

/** Só para os testes. */
export function zerarLimites() {
  baldes.clear();
}

/** IP de quem pediu (na Vercel, o primeiro do x-forwarded-for é o do cliente). */
export function ipDe(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || cabecalhos.get("x-real-ip")?.trim() || "sem-ip";
}

export const MENSAGEM_LIMITE = "Muitos pedidos seguidos. Espere um pouco e tente de novo.";

/**
 * Confere o limite de uma rota. Devolve `null` (pode seguir) ou a resposta 429.
 * Com `usuario`, conta também por aluno: trocar de rede não zera o limite de quem está logado.
 */
export function limitar(cabecalhos: Headers, rota: keyof typeof LIMITES, usuario?: string | null): Response | null {
  const regra = LIMITES[rota];
  const chaves = [`${rota}:ip:${ipDe(cabecalhos)}`];
  if (usuario) chaves.push(`${rota}:u:${usuario}`);
  let espera = 0;
  for (const c of chaves) espera = Math.max(espera, consumir(c, regra));
  if (espera === 0) return null;
  return Response.json({ erro: MENSAGEM_LIMITE }, { status: 429, headers: { "Retry-After": String(espera) } });
}

/**
 * Lê o corpo como JSON, recusando antes de ler tudo quando passa de `max` bytes.
 * Devolve `{ dados }` (null se não for JSON) ou `{ grande: true }`.
 * (O proxy do Next já corta em 10 MB, mas JSON.parse + zod de 10 MB custa CPU.)
 */
export async function lerJsonLimitado(request: Request, max: number): Promise<{ dados: unknown } | { grande: true }> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return { grande: true };
  const texto = await request.text();
  if (texto.length > max) return { grande: true };
  try {
    return { dados: JSON.parse(texto) };
  } catch {
    return { dados: null };
  }
}
