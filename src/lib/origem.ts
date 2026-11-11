/**
 * De onde a pessoa veio: UTM da PRIMEIRA visita (para medir qual canal traz
 * gente) e código de afiliado/cupom da visita MAIS RECENTE que tinha um (o
 * afiliado que convenceu por último leva). Fica no navegador e, para ref e
 * cupom, também num cookie de 60 dias: o servidor lê o cookie no cadastro e no
 * checkout (Fase 3) para gravar `referred_by_affiliate`.
 */
const CHAVE = "excel-br:origem:v1";
const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export const COOKIE_REF = "planilhes_ref";
export const COOKIE_CUPOM = "planilhes_cupom";
const SESSENTA_DIAS = 60 * 24 * 60 * 60;

export type Origem = Partial<Record<(typeof UTMS)[number], string>> & {
  ref?: string;
  cupom?: string;
  /** Página e data da primeira visita. */
  entrada: string;
  em: string;
};

/** Só letras, números, - e _ (o código vai para cookie e, depois, para o banco). */
const limpar = (v: string | null) => (v ? v.trim().slice(0, 60).replace(/[^\w-]/g, "") || undefined : undefined);

export function lerOrigem(): Origem | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Origem | null;
  } catch {
    return null;
  }
}

export function capturarOrigem(href: string, agora = new Date()): Origem | null {
  try {
    const url = new URL(href);
    const q = url.searchParams;
    const atual = lerOrigem();
    const ref = limpar(q.get("ref"));
    const cupom = limpar(q.get("cupom"))?.toUpperCase();
    const origem: Origem = atual ?? { entrada: url.pathname, em: agora.toISOString() };
    if (!atual) for (const k of UTMS) {
      const v = q.get(k)?.trim().slice(0, 100);
      if (v) origem[k] = v;
    }
    if (ref) origem.ref = ref;
    if (cupom) origem.cupom = cupom;
    localStorage.setItem(CHAVE, JSON.stringify(origem));
    const cookie = (nome: string, v: string) =>
      (document.cookie = `${nome}=${encodeURIComponent(v)}; Max-Age=${SESSENTA_DIAS}; Path=/; SameSite=Lax`);
    if (ref) cookie(COOKIE_REF, ref);
    if (cupom) cookie(COOKIE_CUPOM, cupom);
    return origem;
  } catch {
    return null;
  }
}

/** Resumo curto para anexar aos eventos: afiliado > utm_source > "direto". */
export function resumoOrigem(o = lerOrigem()): string {
  if (!o) return "direto";
  if (o.ref) return `ref:${o.ref}`;
  if (o.cupom) return `cupom:${o.cupom}`;
  return o.utm_source ?? "direto";
}
