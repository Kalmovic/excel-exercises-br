import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcoesCertificado } from "@/components/conta/AcoesCertificado";
import { MODULOS } from "@/content";
import { NOME_SITE, URL_SITE } from "@/lib/site";
import { supabasePublico } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Certificado", robots: { index: false, follow: false } };

type Certificado = { codigo: string; nome: string; modulo: string; acertos: number; total: number; emitido_em: string };

export default function Pagina({ params }: PageProps<"/certificado/[codigo]">) {
  return (
    <Suspense fallback={<div className="h-[32rem]" aria-hidden />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

/** Lê do banco a cada visita: o certificado é verificado na hora, pelo código. */
async function Conteudo({ params }: { params: PageProps<"/certificado/[codigo]">["params"] }) {
  await connection();
  const codigo = decodeURIComponent((await params).codigo).toUpperCase();
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo)) notFound();
  const supabase = supabasePublico();
  if (!supabase) notFound();
  const { data } = await supabase.rpc("verificar_certificado", { codigo_buscado: codigo }).maybeSingle<Certificado>();
  if (!data) notFound();

  const m = MODULOS.find((x) => x.slug === data.modulo);
  const titulo = m ? `Módulo ${m.numero}: ${m.titulo}` : data.modulo;
  const emitido = new Date(data.emitido_em);
  const url = `${URL_SITE}/certificado/${data.codigo}`;
  const linkedin =
    "https://www.linkedin.com/profile/add?" +
    new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: `Excel: ${titulo}`,
      organizationName: NOME_SITE,
      issueYear: String(emitido.getFullYear()),
      issueMonth: String(emitido.getMonth() + 1),
      certUrl: url,
      certId: data.codigo,
    }).toString();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <article
        className="relative overflow-hidden rounded-3xl border-8 border-double border-ink/80 bg-surface p-8 text-center shadow-xl sm:p-14 print:shadow-none"
        data-testid="certificado"
      >
        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink font-mono text-xl font-bold text-accent" aria-hidden>
            =
          </span>
          <span className="font-display text-2xl font-extrabold">{NOME_SITE}</span>
        </div>
        <p className="text-sm font-semibold tracking-[0.3em] text-muted uppercase">Certificado de conclusão</p>
        <p className="mt-8 text-muted">Certificamos que</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="nome-certificado-publico">
          {data.nome}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg">
          concluiu o <strong>{titulo}</strong> da trilha de Excel do {NOME_SITE}, com aprovação no teste do módulo ({data.acertos} de {data.total}{" "}
          questões), corrigido de forma automática numa planilha.
        </p>
        <div className="mx-auto mt-10 grid max-w-xl gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted">Emitido em</p>
            <p className="font-semibold">{emitido.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })}</p>
          </div>
          <div>
            <p className="text-muted">Código</p>
            <p className="font-mono font-semibold">{data.codigo}</p>
          </div>
          <div>
            <p className="text-muted">Verificação</p>
            <p className="font-semibold text-success">✓ Autêntico</p>
          </div>
        </div>
        <p className="mt-8 text-xs break-all text-muted">Verifique em {url}</p>
      </article>
      <AcoesCertificado linkedin={linkedin} url={url} />
    </div>
  );
}
