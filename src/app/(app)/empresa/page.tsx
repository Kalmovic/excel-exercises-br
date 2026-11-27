import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PainelEquipe } from "@/components/empresa/PainelEquipe";
import { MODULOS, exerciciosDaTrilha } from "@/content";
import { caminhoConvite, type PainelGestor } from "@/lib/empresas";
import { ESPECIALISTA } from "@/lib/especialista";
import { B2B_NO_AR, URL_SITE } from "@/lib/site";
import { contasLigadas } from "@/lib/supabase/config";
import { supabaseServidor, usuarioAtual } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Painel da equipe", robots: { index: false, follow: false } };

const cartao = "rounded-2xl border border-line bg-surface p-5 text-center sm:p-6";

export default function Pagina() {
  if (!B2B_NO_AR) notFound();
  return (
    <div className="mx-auto max-w-4xl py-4">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

/** Só o gestor da organização vê (a função painel_gestor confere quem está logado). */
async function Conteudo() {
  await connection();
  if (!contasLigadas())
    return (
      <div className={cartao} data-testid="painel-empresa-desligado">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Painel da equipe</h1>
        <p className="text-muted">As contas ainda não estão ligadas neste ambiente.</p>
      </div>
    );
  const usuario = await usuarioAtual();
  if (!usuario)
    return (
      <div className={`${cartao} space-y-3`} data-testid="painel-empresa-entrar">
        <h1 className="text-2xl font-bold tracking-tight">Painel da equipe</h1>
        <p className="text-muted">Entre com o e-mail de gestor que a sua empresa informou na proposta.</p>
        <Link href="/entrar?proximo=/empresa" className="inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
          Entrar
        </Link>
      </div>
    );

  const trilha = exerciciosDaTrilha().map((e) => e.slug);
  const supabase = await supabaseServidor();
  const { data, error } = supabase ? await supabase.rpc("painel_gestor", { p_licoes: trilha }) : { data: null, error: null };
  if (error) console.error(JSON.stringify({ tipo: "erro_painel_gestor", mensagem: error.message }));
  const painel = data as PainelGestor | null;
  if (!painel)
    return (
      <div className={`${cartao} space-y-3`} data-testid="painel-empresa-nao-gestor">
        <h1 className="text-2xl font-bold tracking-tight">Painel da equipe</h1>
        <p className="text-muted">
          Este painel é do gestor da equipe. Você entrou como <strong className="break-all text-ink">{usuario.email}</strong>, que não é gestor de nenhuma
          empresa. Se a sua empresa contratou o Pro e você é o gestor, entre com o e-mail informado na proposta.
        </p>
        <Link href="/empresas" className="inline-block font-semibold text-success underline-offset-4 hover:underline">
          Conhecer o Pro para empresas
        </Link>
      </div>
    );

  const titulos: Record<string, string> = Object.fromEntries(MODULOS.map((m) => [m.slug, `Módulo ${m.numero}`]));
  titulos[ESPECIALISTA] = "Especialista";
  return (
    <PainelEquipe
      dados={painel}
      totalLicoes={trilha.length}
      linkConvite={`${URL_SITE}${caminhoConvite(painel.organizacao.codigo_convite)}`}
      titulos={titulos}
    />
  );
}
