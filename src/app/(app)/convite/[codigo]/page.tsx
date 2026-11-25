import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AceitarConvite } from "@/components/conta/AceitarConvite";
import { caminhoConvite, codigoValido, MENSAGEM_CONVITE, type SituacaoConvite } from "@/lib/empresas";
import { NOME_SITE } from "@/lib/site";
import { contasLigadas } from "@/lib/supabase/config";
import { supabaseServidor, usuarioAtual } from "@/lib/supabase/servidor";

// O link é privado (só quem recebeu do gestor): fora dos buscadores e sem prévia com o nome da empresa.
export const metadata: Metadata = { title: "Convite para a equipe", robots: { index: false, follow: false } };

const cartao = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

export default function Pagina({ params }: PageProps<"/convite/[codigo]">) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <header className="space-y-2">
        <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">Licença para empresas</span>
        <h1 className="text-3xl font-extrabold tracking-tight">Você foi convidado para o {NOME_SITE} Pro</h1>
        <p className="text-lg text-muted">
          A sua empresa contratou o {NOME_SITE} Pro para a equipe: a trilha inteira de exercícios de Excel, os testes de módulo, os certificados e a
          prática extra, sem custo para você.
        </p>
      </header>

      <section className={cartao} aria-label="Convite" data-testid="convite">
        <Suspense fallback={<div className="h-24" aria-hidden />}>
          <Situacao params={params} />
        </Suspense>
      </section>

      <section className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm" aria-label="O que o gestor vê" data-testid="aviso-gestor">
        <p className="font-semibold">Antes de entrar: o que a empresa vai ver</p>
        <p>
          O gestor da equipe vê o seu <strong>nome</strong>, o seu <strong>e-mail</strong> e o seu <strong>progresso</strong>: quantas lições você concluiu,
          os certificados e a data do último acesso. Ele <strong>não</strong> vê as suas respostas nem o que você faz fora da trilha.
        </p>
        <p>
          A vaga é da empresa: se o gestor tirar você da equipe, o Pro dela deixa de valer na sua conta, mas o seu progresso continua salvo. Mais detalhes na{" "}
          <Link href="/privacidade#empresas" className="underline">
            Política de privacidade
          </Link>{" "}
          e nos{" "}
          <Link href="/termos#empresas" className="underline">
            Termos de uso
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

type Convite = { nome: string; situacao: SituacaoConvite; membro: boolean };

async function Situacao({ params }: { params: PageProps<"/convite/[codigo]">["params"] }) {
  await connection();
  const { codigo } = await params;
  if (!contasLigadas())
    return (
      <p className="text-muted" data-testid="convite-desligado">
        As contas ainda não estão ligadas neste ambiente. Volte mais tarde pelo mesmo link.
      </p>
    );
  const supabase = await supabaseServidor();
  const { data } = codigoValido(codigo) && supabase ? await supabase.rpc("convite_publico", { p_codigo: codigo }) : { data: null };
  const convite = data as Convite | null;
  if (!convite)
    return (
      <p className="text-red-700" data-testid="convite-invalido">
        {MENSAGEM_CONVITE.invalido}
      </p>
    );

  const titulo = (
    <p className="mb-3 text-sm text-muted">
      Convite da empresa <strong className="text-ink">{convite.nome}</strong>
    </p>
  );
  if (convite.membro)
    return (
      <div data-testid="convite-ja-membro">
        {titulo}
        <p className="mb-4 font-semibold text-success">{MENSAGEM_CONVITE.ja_membro}</p>
        <Link href="/trilha" className="inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
          Ir para a trilha
        </Link>
      </div>
    );
  if (convite.situacao !== "aberta")
    return (
      <div data-testid={`convite-${convite.situacao}`}>
        {titulo}
        <p className="text-red-700">{MENSAGEM_CONVITE[convite.situacao]}</p>
      </div>
    );

  const usuario = await usuarioAtual();
  if (!usuario)
    return (
      <div className="space-y-4" data-testid="convite-entrar">
        {titulo}
        <p>Entre (ou crie a sua conta) com o seu e-mail para aceitar. Sem senha: chega um código de 6 números no e-mail.</p>
        <Link
          href={`/entrar?proximo=${encodeURIComponent(caminhoConvite(codigo.toLowerCase()))}`}
          className="inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft"
        >
          Entrar para aceitar
        </Link>
      </div>
    );
  return (
    <div>
      {titulo}
      <AceitarConvite codigo={codigo.toLowerCase()} email={usuario.email ?? ""} empresa={convite.nome} />
    </div>
  );
}
