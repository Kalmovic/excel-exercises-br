import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { categoriaPorSlug, funcaoPorSlug, FUNCOES, gradeDoExemplo, praticasDaFuncao, type FuncaoGuia } from "@/content/funcoes";
import { moduloPorSlug } from "@/content";
import { NOME_SITE, URL_SITE } from "@/lib/site";

export function generateStaticParams() {
  return FUNCOES.map((f) => ({ slug: f.slug }));
}

const titulo = (f: FuncaoGuia) => `${f.nome} no Excel: para que serve e como usar`;
const descricao = (f: FuncaoGuia) =>
  `${f.nome} (${f.ingles}) no Excel em português: ${f.descricao.replace(/\.$/, "").toLowerCase()}. Sintaxe, exemplo com tabela, erros comuns e exercício para praticar.`;

export async function generateMetadata({ params }: PageProps<"/funcoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = funcaoPorSlug(slug);
  if (!f) return {};
  return {
    title: titulo(f),
    description: descricao(f),
    alternates: { canonical: `/funcoes/${f.slug}` },
    openGraph: { title: titulo(f), description: descricao(f), url: `/funcoes/${f.slug}`, type: "article" },
  };
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="space-y-3">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold">
        {titulo}
      </h2>
      <div className="space-y-3 leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-header px-1 py-0.5 font-mono text-[0.9em] text-success [overflow-wrap:anywhere]">{children}</code>
);

/**
 * Separa as fórmulas citadas no meio do texto ("use =SOMA(B2:B5;D2:D5).").
 * A fórmula vai do "=" até o primeiro espaço fora de aspas e parênteses, sem a
 * pontuação final da frase.
 */
function partes(texto: string): { formula: boolean; texto: string }[] {
  const saida: { formula: boolean; texto: string }[] = [];
  let i = 0;
  let inicio = 0;
  while (i < texto.length) {
    if (texto[i] !== "=" || !/[A-ZÀ-Ú]/.test(texto[i + 1] ?? "")) {
      i++;
      continue;
    }
    let j = i + 1;
    let aspas = false;
    let nivel = 0;
    for (; j < texto.length; j++) {
      const ch = texto[j];
      if (ch === '"') aspas = !aspas;
      else if (!aspas && ch === "(") nivel++;
      else if (!aspas && ch === ")") nivel--;
      else if (!aspas && nivel <= 0 && /\s/.test(ch)) break;
    }
    let fim = j;
    // Pontuação da frase e o ")" que fecha um parêntese do texto, não da fórmula.
    for (;;) {
      if (/[.,;:]/.test(texto[fim - 1])) fim--;
      else if (nivel < 0 && texto[fim - 1] === ")") {
        fim--;
        nivel++;
      } else break;
    }
    if (i > inicio) saida.push({ formula: false, texto: texto.slice(inicio, i) });
    saida.push({ formula: true, texto: texto.slice(i, fim) });
    i = inicio = fim;
  }
  if (inicio < texto.length) saida.push({ formula: false, texto: texto.slice(inicio) });
  return saida;
}

/** Texto do guia, com as fórmulas citadas em fonte de código. */
function Texto({ children }: { children: string }) {
  return <>{partes(children).map((p, i) => (p.formula ? <C key={i}>{p.texto}</C> : p.texto))}</>;
}

function TabelaExemplo({ f }: { f: FuncaoGuia }) {
  const grade = gradeDoExemplo(f.exemplo);
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-sm" data-testid="exemplo-tabela">
        <caption className="sr-only">Planilha do exemplo de {f.nome}</caption>
        <thead>
          <tr className="bg-header text-xs text-zinc-500">
            <th className="w-8 border border-line px-1 py-1 font-normal" aria-label="Linha" />
            {grade.colunas.map((c) => (
              <th key={c} scope="col" className="border border-line px-2 py-1 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.linhas.map((linha, l) => (
            <tr key={l}>
              <th scope="row" className="border border-line bg-header px-1 py-1 text-center text-xs font-normal text-zinc-500">
                {l + 1}
              </th>
              {linha.map((c) => (
                <td
                  key={c.endereco}
                  data-celula={c.endereco}
                  className={[
                    "border border-line px-2 py-1 whitespace-pre",
                    c.numero ? "text-right tabular-nums" : "",
                    c.tipo === "cabecalho" ? "font-semibold" : "",
                    c.tipo === "resultado" ? "bg-accent-soft font-semibold text-ink" : "",
                  ].join(" ")}
                >
                  {c.texto}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PaginaFuncao({ params }: PageProps<"/funcoes/[slug]">) {
  const { slug } = await params;
  const f = funcaoPorSlug(slug);
  if (!f) notFound();
  const categoria = categoriaPorSlug(f.categoria);
  const modulo = moduloPorSlug(categoria.modulo);
  const praticas = praticasDaFuncao(f);
  const relacionadas = f.relacionadas.map((s) => funcaoPorSlug(s)!).filter(Boolean);
  const ex = f.exemplo;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: titulo(f),
    description: descricao(f),
    inLanguage: "pt-BR",
    url: `${URL_SITE}/funcoes/${f.slug}`,
    mainEntityOfPage: `${URL_SITE}/funcoes/${f.slug}`,
    about: { "@type": "Thing", name: `${f.nome} (${f.ingles}), função do Excel` },
    proficiencyLevel: "Beginner",
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: NOME_SITE, url: URL_SITE },
    publisher: { "@type": "Organization", name: NOME_SITE, url: URL_SITE },
    isPartOf: { "@type": "CollectionPage", name: "Funções de A a Z", url: `${URL_SITE}/funcoes` },
  };

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="space-y-4">
        <nav aria-label="Você está em" className="text-sm text-zinc-500">
          <Link href="/funcoes" className="hover:text-zinc-800">
            Funções de A a Z
          </Link>{" "}
          / {categoria.titulo}
        </nav>
        <h1 className="text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">{titulo(f)}</h1>
        <p className="text-lg text-zinc-600">
          <Texto>{f.paraQueServe}</Texto>
        </p>
        <p className="text-sm text-zinc-500">
          Em inglês: <span className="font-mono">{f.ingles}</span>
        </p>
      </header>

      <Secao id="sintaxe" titulo="Sintaxe">
        <pre className="overflow-x-auto rounded-lg bg-ink p-4 font-mono text-sm whitespace-pre-wrap text-white [overflow-wrap:anywhere]">
          ={f.assinatura}
        </pre>
        {f.argumentos.length > 0 ? (
          <dl className="space-y-3">
            {f.argumentos.map((a) => (
              <div key={a.nome} className="rounded-lg border border-line bg-surface p-3">
                <dt className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-ink">{a.nome}</span>
                  <span className="rounded bg-header px-2 py-0.5 text-xs text-zinc-500">
                    {a.opcional ? "opcional" : "obrigatório"}
                  </span>
                </dt>
                <dd className="mt-1 text-zinc-700">
                  <Texto>{a.explicacao}</Texto>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>{f.nome} não tem argumentos, mas os parênteses vazios são obrigatórios.</p>
        )}
        <p className="text-sm text-zinc-500">
          No Excel em português, os argumentos são separados por ponto e vírgula (;). Os entre colchetes podem ser
          deixados de fora.
        </p>
      </Secao>

      <Secao id="exemplo" titulo={`Exemplo: ${f.nome} na prática`}>
        <p className="font-medium text-ink">{ex.situacao}</p>
        <TabelaExemplo f={f} />
        <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
          <p>
            Em <strong>{ex.celula}</strong>, digite:
          </p>
          <p>
            <code
              className="block rounded bg-header px-3 py-2 font-mono text-success [overflow-wrap:anywhere]"
              data-testid="exemplo-formula"
            >
              {ex.formula}
            </code>
          </p>
          <p>
            Resultado:{" "}
            <strong data-testid="exemplo-resultado">
              {typeof ex.resultado === "string" ? ex.resultado : `${ex.resultado.length} linhas a partir de ${ex.celula} (em amarelo na tabela)`}
            </strong>
          </p>
          <p className="text-zinc-600">
            <Texto>{ex.explicacao}</Texto>
          </p>
        </div>
      </Secao>

      <Secao id="cuidados" titulo="Cuidados e erros comuns">
        <ul className="space-y-2">
          {f.cuidados.map((c) => (
            <li key={c} className="rounded-lg bg-warning-bg p-3">
              <Texto>{c}</Texto>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao id="pratique" titulo={`Pratique ${f.nome}`}>
        {praticas.length > 0 ? (
          <>
            <p>Exercícios da trilha que se resolvem com {f.nome}, numa planilha no navegador e com correção na hora:</p>
            <ul className="space-y-2" data-testid="pratique">
              {praticas.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/exercicios/${p.slug}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 hover:border-ink"
                  >
                    <span>
                      <span className="block font-medium text-ink">{p.titulo}</span>
                      <span className="block text-sm text-zinc-500">
                        {p.modulo}
                        {p.extra ? " · prática extra" : ""}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.gratis ? "bg-success-bg text-success" : "bg-accent text-ink"}`}
                    >
                      {p.gratis ? "Grátis" : "Pro"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p data-testid="pratique">
            {f.nome} aparece no{" "}
            <Link href={`/trilha#modulo-${categoria.modulo}`} className="text-success underline">
              {modulo ? `Módulo ${modulo.numero}: ${modulo.titulo}` : "módulo da trilha"}
            </Link>
            , com exercícios numa planilha no navegador e correção na hora.
          </p>
        )}
      </Secao>

      {relacionadas.length > 0 && (
        <Secao id="relacionadas" titulo="Funções relacionadas">
          <ul className="flex flex-wrap gap-2">
            {relacionadas.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/funcoes/${r.slug}`}
                  className="inline-block rounded-full border border-line bg-surface px-3 py-1 font-mono text-sm hover:border-ink"
                  title={r.descricao}
                >
                  {r.nome}
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <p className="text-sm text-zinc-500">
        <Link href="/funcoes" className="text-success underline">
          Ver todas as funções de A a Z
        </Link>
      </p>
    </article>
  );
}
