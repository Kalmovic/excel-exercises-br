import type { Metadata } from "next";
import Link from "next/link";
import { IndiceFuncoes } from "@/components/funcoes/IndiceFuncoes";
import { CATEGORIAS, FUNCOES, letraDe } from "@/content/funcoes";
import { NOME_SITE, URL_SITE } from "@/lib/site";

const TITULO = "Funções do Excel de A a Z, em português";
const DESCRICAO = `Guia das ${FUNCOES.length} funções do Excel em português mais usadas no escritório (PROCV, SOMASE, SE, CONT.SE, PROCX…): para que serve cada uma, sintaxe, exemplo com tabela, erros comuns e exercício para praticar.`;

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/funcoes" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/funcoes" },
};

export default function Funcoes() {
  const itens = FUNCOES.map((f) => ({
    slug: f.slug,
    nome: f.nome,
    ingles: f.ingles,
    categoria: f.categoria,
    descricao: f.descricao,
    letra: letraDe(f.nome),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITULO,
    description: DESCRICAO,
    inLanguage: "pt-BR",
    url: `${URL_SITE}/funcoes`,
    publisher: { "@type": "Organization", name: NOME_SITE, url: URL_SITE },
  };

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="space-y-4">
        <p className="text-sm font-medium text-success">Guia · grátis</p>
        <h1 className="text-3xl font-bold tracking-tight">Funções de A a Z</h1>
        <p className="text-lg text-zinc-600">
          As {FUNCOES.length} funções do Excel em português que mais aparecem no dia a dia do escritório, explicadas sem
          jargão: para que serve, como escrever, um exemplo com tabela e os erros que todo mundo comete. Cada página
          aponta um exercício para você praticar na hora, numa planilha no navegador.
        </p>
        <p className="text-sm text-zinc-500">
          Nunca usou fórmulas? Comece pelo{" "}
          <Link href="/excel-basico-para-iniciantes" className="text-success underline">
            Excel básico para iniciantes
          </Link>
          .
        </p>
      </header>
      <IndiceFuncoes itens={itens} categorias={CATEGORIAS} />
    </article>
  );
}
