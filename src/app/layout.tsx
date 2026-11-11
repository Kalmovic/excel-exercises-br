import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Logo } from "@/components/marca/Logo";
import { MenuCelular } from "@/components/marca/MenuCelular";
import { LinkRastreado } from "@/components/site/LinkRastreado";
import { Analytics } from "@vercel/analytics/next";
import { INDEXAR_SITE, NOME_DESAFIO, NOME_SITE, URL_SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  ...(INDEXAR_SITE ? {} : { robots: { index: false, follow: false } }),
  openGraph: { siteName: NOME_SITE, locale: "pt_BR", type: "website" },
  title: {
    default: `${NOME_SITE}: exercícios de Excel na prática, em português`,
    template: `%s | ${NOME_SITE}`,
  },
  description:
    "Aprenda Excel fazendo: exercícios numa planilha no navegador, com fórmulas em português (SOMA, PROCV, SE) e correção na hora.",
};

const NAV = [
  { href: "/desafio", rotulo: "Desafio do dia" },
  { href: "/trilha", rotulo: "Trilha" },
  { href: "/#precos", rotulo: "Preços" },
  { href: "/empresas", rotulo: "Para empresas" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <header className="border-b border-line bg-bg">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-ink hover:text-muted">
                  {n.rotulo}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-sm font-medium sm:gap-4">
              <Link href="/entrar" className="hidden text-ink hover:text-muted sm:inline">
                Entrar
              </Link>
              <LinkRastreado
                href="/trilha"
                className="rounded-lg bg-ink px-4 py-2 whitespace-nowrap text-white hover:bg-ink-soft"
                evento={{ nome: "cta_landing", local: "cabecalho" }}
              >
                Começar grátis
              </LinkRastreado>
              <MenuCelular itens={[...NAV, { href: "/entrar", rotulo: "Entrar" }]} />
            </div>
          </div>
        </header>
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <footer className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-display text-lg font-bold">{NOME_SITE}</span>
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                <Link href="/funcoes" className="underline-offset-4 hover:underline">
                  Funções de A a Z
                </Link>
                <Link href="/excel-basico-para-iniciantes" className="underline-offset-4 hover:underline">
                  Excel básico para iniciantes
                </Link>
                <Link href="/desafio" className="underline-offset-4 hover:underline">
                  {NOME_DESAFIO}
                </Link>
                <Link href="/#precos" className="underline-offset-4 hover:underline">
                  Preços
                </Link>
                <Link href="/termos" className="underline-offset-4 hover:underline">
                  Termos
                </Link>
                <Link href="/privacidade" className="underline-offset-4 hover:underline">
                  Privacidade
                </Link>
              </nav>
            </div>
            <p className="text-xs text-white/50">
              Excel é uma marca registrada da Microsoft Corporation. O {NOME_SITE} não é afiliado nem endossado pela
              Microsoft.
            </p>
          </div>
        </footer>
        {/* Visitas e eventos (src/lib/eventos.ts). Ativar em Vercel → Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}
