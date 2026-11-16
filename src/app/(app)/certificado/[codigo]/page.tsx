import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AcoesCertificado } from "@/components/conta/AcoesCertificado";
import { IconeTrofeu } from "@/components/simulador/Trofeu";
import { MODULOS } from "@/content";
import { buscarCertificado, tituloDoCertificado } from "@/lib/certificado-publico";
import { ESPECIALISTA, modulosDoEspecialista } from "@/lib/especialista";
import { NOME_SITE, URL_SITE } from "@/lib/site";

/** Título e descrição para a prévia do link (LinkedIn, WhatsApp). A imagem vem de opengraph-image.tsx. */
export async function generateMetadata({ params }: PageProps<"/certificado/[codigo]">): Promise<Metadata> {
  const c = await buscarCertificado((await params).codigo);
  if (!c) return { title: "Certificado", robots: { index: false, follow: false } };
  const titulo = tituloDoCertificado(c);
  return {
    title: `${c.nome}: ${titulo}`,
    description: `Certificado ${c.codigo} emitido pelo ${NOME_SITE} para ${c.nome}. Verifique a autenticidade nesta página.`,
    robots: { index: false, follow: false },
    openGraph: { title: `${c.nome} · ${titulo}`, description: `Certificado verificado pelo ${NOME_SITE}.`, type: "article" },
  };
}

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
  const data = await buscarCertificado((await params).codigo);
  if (!data) notFound();

  const especialista = data.modulo === ESPECIALISTA;
  const titulo = tituloDoCertificado(data);
  const emitido = new Date(data.emitido_em);
  const url = `${URL_SITE}/certificado/${data.codigo}`;
  const linkedin =
    "https://www.linkedin.com/profile/add?" +
    new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: especialista ? "Especialista em Excel" : `Excel: ${titulo}`,
      organizationName: NOME_SITE,
      issueYear: String(emitido.getFullYear()),
      issueMonth: String(emitido.getMonth() + 1),
      certUrl: url,
      certId: data.codigo,
    }).toString();
  const compartilhar = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const modulos = modulosDoEspecialista().map((slug) => MODULOS.find((m) => m.slug === slug)!);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <article
        className={`relative overflow-hidden rounded-3xl border-8 border-double bg-surface p-8 text-center shadow-xl sm:p-14 print:shadow-none ${
          especialista ? "border-amber-500" : "border-ink/80"
        }`}
        data-testid="certificado"
      >
        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink font-mono text-xl font-bold text-accent" aria-hidden>
            =
          </span>
          <span className="font-display text-2xl font-extrabold">{NOME_SITE}</span>
        </div>
        {especialista && <IconeTrofeu className="mx-auto mb-4 h-24 w-24" />}
        <p className="text-sm font-semibold tracking-[0.3em] text-muted uppercase">
          {especialista ? "Certificado de Especialista" : "Certificado de conclusão"}
        </p>
        <p className="mt-8 text-muted">Certificamos que</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="nome-certificado-publico">
          {data.nome}
        </h1>
        {especialista ? (
          <>
            <p className="mx-auto mt-6 max-w-xl text-lg">
              é <strong>Especialista em Excel</strong>: concluiu a trilha completa do {NOME_SITE}, com aprovação no teste de cada um dos {modulos.length}{" "}
              módulos, corrigidos de forma automática numa planilha.
            </p>
            <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2 text-xs">
              {modulos.map((m) => (
                <li key={m.slug} className="rounded-full bg-accent-soft px-3 py-1 font-medium">
                  {m.numero}. {m.titulo}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mx-auto mt-6 max-w-xl text-lg">
            concluiu o <strong>{titulo}</strong> da trilha de Excel do {NOME_SITE}, com aprovação no teste do módulo ({data.acertos} de {data.total}{" "}
            questões), corrigido de forma automática numa planilha.
          </p>
        )}
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
      <AcoesCertificado linkedin={linkedin} compartilhar={compartilhar} url={url} />
    </div>
  );
}
