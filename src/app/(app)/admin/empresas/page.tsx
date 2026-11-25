import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotaoFatura, FormProposta } from "@/components/admin/Empresas";
import { BotaoCopiar } from "@/components/site/BotaoCopiar";
import { ehAdmin } from "@/lib/admin";
import { caminhoConvite, dataBR, formatarCnpj, totalDoContrato, type Organizacao } from "@/lib/empresas";
import { reais, URL_SITE } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default function AdminEmpresas() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
      <Painel />
    </Suspense>
  );
}

type Linha = Organizacao & { membros_organizacao: { count: number }[] };

const COR_STATUS: Record<string, string> = {
  proposta: "bg-header text-zinc-700",
  ativa: "bg-success-bg text-success",
  vencida: "bg-amber-100 text-amber-900",
  cancelada: "bg-red-100 text-red-800",
};

async function Painel() {
  if (!(await ehAdmin())) notFound();
  const ligado = Boolean(process.env.SUPABASE_SECRET_KEY);
  let lista: Linha[] = [];
  let erro: string | null = null;
  if (ligado) {
    const { data, error } = await supabaseAdmin()
      .from("organizacoes")
      .select("*, membros_organizacao(count)")
      .order("criado_em", { ascending: false })
      .returns<Linha[]>();
    if (error) erro = error.message;
    lista = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Empresas ({lista.length})</h1>
        <Link href="/admin" className="text-sm text-zinc-600 underline">
          ← Exercícios
        </Link>
      </div>
      <p className="max-w-3xl text-sm text-zinc-600">
        Venda por proposta: crie a organização, gere a fatura (o Stripe manda por e-mail ao financeiro, com boleto, Pix ou cartão) e mande o link de
        convite ao gestor. As vagas só liberam quando a fatura for paga. Passo a passo em docs/EMPRESAS.md.
      </p>
      {!ligado && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900" data-testid="empresas-sem-banco">
          Banco desligado neste ambiente (SUPABASE_SECRET_KEY): a lista fica vazia e a proposta não é gravada.
        </p>
      )}
      {erro && <p className="text-sm text-red-700">Erro ao ler as organizações: {erro}</p>}

      <FormProposta />

      <ul className="space-y-3" data-testid="lista-empresas">
        {lista.map((o) => {
          const usados = o.membros_organizacao[0]?.count ?? 0;
          const convite = `${URL_SITE}${caminhoConvite(o.codigo_convite)}`;
          return (
            <li key={o.id} id={`org-${o.id}`} className="space-y-3 rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.nome}</p>
                  <p className="font-mono text-xs text-zinc-500">CNPJ {formatarCnpj(o.cnpj)}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${COR_STATUS[o.status] ?? ""}`}>{o.status}</span>
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-zinc-500">Vagas: </dt>
                  <dd className="inline">
                    {usados}/{o.assentos} usadas
                  </dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">Contrato: </dt>
                  <dd className="inline">
                    {reais(totalDoContrato(o.assentos, Number(o.preco_por_pessoa_ano)))}/ano ({reais(Number(o.preco_por_pessoa_ano))} por pessoa)
                  </dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">Validade: </dt>
                  <dd className="inline">{o.acesso_ate ? `até ${dataBR(o.acesso_ate)}` : "não paga ainda"}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">Gestor: </dt>
                  <dd className="inline break-all">
                    {o.gestor_email} {o.gestor_id ? "(já entrou)" : "(ainda não entrou)"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="inline text-zinc-500">Financeiro: </dt>
                  <dd className="inline break-all">{o.email_financeiro}</dd>
                </div>
              </dl>
              {o.fatura_url && (
                <p className="text-sm">
                  <a href={o.fatura_url} target="_blank" rel="noreferrer" className="text-violet-800 underline">
                    Fatura em aberto
                  </a>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-bg p-2">
                <code className="min-w-0 flex-1 truncate text-xs" data-testid="link-convite-admin">
                  {convite}
                </code>
                <BotaoCopiar texto={convite} rotulo="Copiar convite" />
              </div>
              {o.status !== "cancelada" && <BotaoFatura id={o.id} temFatura={Boolean(o.stripe_fatura_id)} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
