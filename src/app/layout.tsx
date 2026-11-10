import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NOME_SITE, URL_SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  openGraph: { siteName: NOME_SITE, locale: "pt_BR", type: "website" },
  title: {
    default: "Pratique Excel: exercícios interativos em português",
    template: "%s | Pratique Excel",
  },
  description:
    "Aprenda Excel fazendo: exercícios numa planilha no navegador, com fórmulas em português (SOMA, PROCV, SE) e correção na hora.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded bg-emerald-700 text-sm font-bold text-white">
                fx
              </span>
              Pratique Excel
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/desafio" className="font-medium text-emerald-800 hover:text-emerald-950">
                Desafio diário
              </Link>
              <span className="text-zinc-400">Versão de teste</span>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500">
          <Link href="/excel-basico-para-iniciantes" className="hover:text-zinc-800">
            Excel básico para iniciantes
          </Link>
          <span className="mx-2">·</span>
          Microsoft Excel é marca registrada da Microsoft. Este site não tem relação com a Microsoft.
        </footer>
      </body>
    </html>
  );
}
