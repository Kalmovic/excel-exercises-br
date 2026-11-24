import type { ReactNode } from "react";
import { EMAIL_CONTATO, EMPRESA, VERSAO_DOCUMENTOS } from "@/lib/empresa";

export type Secao = { id: string; titulo: string; conteudo: ReactNode };

/** Página de texto longo (Termos, Privacidade): índice no topo, seções numeradas e quem responde. */
export function Documento({ titulo, resumo, secoes }: { titulo: string; resumo: ReactNode; secoes: Secao[] }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 py-8" data-testid="documento-legal">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted">Versão de {VERSAO_DOCUMENTOS}</p>
        <div className="rounded-lg border border-line bg-surface p-4 leading-relaxed text-zinc-700">{resumo}</div>
      </header>

      <nav aria-label="Índice" className="rounded-lg bg-header p-4">
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {secoes.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline-offset-4 hover:underline">
                {i + 1}. {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {secoes.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold">
            {i + 1}. {s.titulo}
          </h2>
          <div className="space-y-3 leading-relaxed text-zinc-700 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{s.conteudo}</div>
        </section>
      ))}

      <footer className="border-t border-line pt-4 text-sm text-muted">
        {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj} · {EMPRESA.endereco ?? EMPRESA.cidade} ·{" "}
        <a href={`mailto:${EMAIL_CONTATO}`} className="underline">
          {EMAIL_CONTATO}
        </a>
      </footer>
    </article>
  );
}

/** Link de e-mail de contato, para usar dentro dos textos. */
export function Email() {
  return (
    <a href={`mailto:${EMAIL_CONTATO}`} className="font-medium underline">
      {EMAIL_CONTATO}
    </a>
  );
}
