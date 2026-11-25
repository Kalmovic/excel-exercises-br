"use server";

import { refresh } from "next/cache";
import { ehAdmin } from "@/lib/admin";
import { propostaSchema, type Organizacao } from "@/lib/empresas";
import { gerarFaturaEmpresa } from "@/lib/fatura-empresa";
import { clienteStripe, stripeConfigurado } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Ações do admin para licenças de empresa. Cada uma confere o admin de novo:
 * uma Server Action é um endpoint público, mesmo que o botão só apareça no admin.
 */

/** `valores`: o que foi digitado, para o formulário não se apagar quando há erro (o React limpa o form depois da action). */
export type EstadoProposta = { ok: boolean; erro?: string; id?: string; valores?: Record<string, string> };
export type EstadoFatura = { ok: boolean; erro?: string; url?: string | null; reaproveitada?: boolean };

const bancoLigado = () => Boolean(process.env.SUPABASE_SECRET_KEY);

export async function criarProposta(_antes: EstadoProposta, formulario: FormData): Promise<EstadoProposta> {
  if (!(await ehAdmin())) return { ok: false, erro: "Só o admin." };
  const valores = Object.fromEntries([...formulario.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string")) as Record<string, string>;
  const r = propostaSchema.safeParse(valores);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Dados inválidos.", valores };
  if (!bancoLigado()) return { ok: false, erro: "Banco não configurado (SUPABASE_SECRET_KEY).", valores };
  const { data, error } = await supabaseAdmin().from("organizacoes").insert(r.data).select("id").single<{ id: string }>();
  if (error) {
    console.error(JSON.stringify({ tipo: "erro_criar_organizacao", codigo: error.code, mensagem: error.message }));
    return { ok: false, erro: "Não foi possível gravar a proposta.", valores };
  }
  console.log(JSON.stringify({ tipo: "organizacao_criada", id: data.id, assentos: r.data.assentos }));
  refresh();
  return { ok: true, id: data.id };
}

export async function gerarFatura(_antes: EstadoFatura, formulario: FormData): Promise<EstadoFatura> {
  if (!(await ehAdmin())) return { ok: false, erro: "Só o admin." };
  const id = String(formulario.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erro: "Organização inválida." };
  if (!bancoLigado()) return { ok: false, erro: "Banco não configurado (SUPABASE_SECRET_KEY)." };
  if (!stripeConfigurado()) return { ok: false, erro: "Stripe não configurado (STRIPE_SECRET_KEY)." };

  const admin = supabaseAdmin();
  const { data: org, error } = await admin.from("organizacoes").select("*").eq("id", id).maybeSingle<Organizacao>();
  if (error || !org) return { ok: false, erro: "Organização não encontrada." };
  if (org.status === "cancelada") return { ok: false, erro: "Organização cancelada: crie uma proposta nova." };

  try {
    const f = await gerarFaturaEmpresa(clienteStripe(), org);
    const { error: erroGravar } = await admin
      .from("organizacoes")
      .update({ stripe_cliente_id: f.cliente, stripe_fatura_id: f.fatura, fatura_url: f.url, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    // A fatura já foi enviada: avisa, mas mostra o link (clicar de novo reaproveita a mesma fatura).
    if (erroGravar) console.error(JSON.stringify({ tipo: "erro_gravar_fatura_empresa", id, mensagem: erroGravar.message }));
    console.log(JSON.stringify({ tipo: "fatura_empresa", id, fatura: f.fatura, reaproveitada: f.reaproveitada }));
    refresh();
    return { ok: true, url: f.url, reaproveitada: f.reaproveitada };
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_fatura_empresa", id, mensagem: String(e) }));
    return { ok: false, erro: `O Stripe recusou: ${(e as Error).message ?? "erro desconhecido"}` };
  }
}
