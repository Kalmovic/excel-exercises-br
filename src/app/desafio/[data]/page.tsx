import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TextoRico } from "@/components/simulador/TextoRico";
import { desafioDoDia, hojeNoServidor, numeroDoDesafio } from "@/content/desafios";
import { colunaParaLetras, deEndereco, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { dataBR, ehDataISO, somarDias } from "@/lib/data-sp";

/** O título não usa o conteúdo do desafio: assim nem o <title> de um desafio futuro vaza. */
export async function generateMetadata({ params }: PageProps<"/desafio/[data]">): Promise<Metadata> {
  const { data } = await params;
  if (!ehDataISO(data)) return {};
  return {
    title: `Solução do desafio de Excel de ${dataBR(data)}`,
    description: `Solução comentada do desafio diário de Excel de ${dataBR(data)}, com a fórmula em português e a explicação passo a passo.`,
    alternates: { canonical: `/desafio/${data}` },
  };
}

export default function PaginaSolucao({ params }: PageProps<"/desafio/[data]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
      <Solucao params={params} />
    </Suspense>
  );
}

async function Solucao({ params }: { params: PageProps<"/desafio/[data]">["params"] }) {
  await connection();
  const { data } = await params;
  const hoje = hojeNoServidor();
  // Só publica desafios que já passaram. O de hoje e os futuros dão 404.
  if (!ehDataISO(data) || data >= hoje) notFound();
  const desafio = desafioDoDia(data);
  if (!desafio || desafio.exercicio.type !== "formula") notFound();

  const ex = desafio.exercicio;
  const numero = numeroDoDesafio(data);
  // Planilha resolvida, montada no servidor, para mostrar a tabela com o resultado.
  const p = Planilha.deExercicio(ex);
  p.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
  const alvos = new Set(ex.alvos.map((a) => a.celula));
  const linhasUsadas = Math.max(
    ...Object.keys(ex.grade.celulas).concat([...alvos]).map((e) => deEndereco(e).linha + 1),
  );
  const colunasUsadas = Math.max(
    ...Object.keys(ex.grade.celulas).concat([...alvos]).map((e) => deEndereco(e).coluna + 1),
  );
  const tabela = Array.from({ length: linhasUsadas }, (_, l) =>
    Array.from({ length: colunasUsadas }, (_, c) => {
      const end = paraEndereco({ linha: l, coluna: c });
      return { end, texto: p.exibicao(end), alvo: alvos.has(end), negrito: p.negrito(end) };
    }),
  );
  p.destruir();

  const primeiro = ex.alvos[0];
  const ultimo = ex.alvos[ex.alvos.length - 1];
  const anterior = desafioDoDia(somarDias(data, -1));
  const seguinte = somarDias(data, 1) < hoje ? desafioDoDia(somarDias(data, 1)) : undefined;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-zinc-500">
        <Link href="/desafio/anteriores" className="hover:text-zinc-800">
          Desafios anteriores
        </Link>{" "}
        / #{numero} · {dataBR(data)}
      </nav>
      <header className="space-y-2">
        <p className="text-sm font-medium text-emerald-800">Solução comentada · desafio #{numero}</p>
        <h1 className="text-3xl font-bold tracking-tight">{ex.titulo}</h1>
      </header>

      <section className="space-y-2 leading-relaxed text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">O desafio</h2>
        {ex.enunciado.map((t, i) => (
          <p key={i}>
            <TextoRico texto={t} />
          </p>
        ))}
      </section>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm" data-testid="tabela-solucao">
          <thead>
            <tr>
              <th className="border border-zinc-200 bg-zinc-100 px-2" />
              {tabela[0].map((_, c) => (
                <th key={c} className="border border-zinc-200 bg-zinc-100 px-3 py-1 font-normal text-zinc-600">
                  {colunaParaLetras(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.map((linha, l) => (
              <tr key={l}>
                <th className="border border-zinc-200 bg-zinc-100 px-2 font-normal text-zinc-600">{l + 1}</th>
                {linha.map((cel) => (
                  <td
                    key={cel.end}
                    className={`border border-zinc-200 px-3 py-1 whitespace-nowrap ${cel.alvo ? "bg-emerald-50 font-medium text-emerald-900" : "bg-white"} ${cel.negrito ? "font-bold" : ""}`}
                  >
                    {cel.texto}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3 leading-relaxed text-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900">A solução</h2>
        <p>
          Em <strong>{primeiro.celula}</strong>:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-emerald-800">{primeiro.solucaoReferencia}</code>
          {ex.alvos.length > 1 && (
            <>
              , copiada até <strong>{ultimo.celula}</strong>
            </>
          )}
          .
        </p>
        {ex.explicacao.map((t, i) => (
          <p key={i}>
            <TextoRico texto={t} />
          </p>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4">
        <Link href="/desafio" className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
          Fazer o desafio de hoje
        </Link>
        {anterior && (
          <Link href={`/desafio/${anterior.data}`} className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Desafio #{numero - 1}
          </Link>
        )}
        {seguinte && (
          <Link href={`/desafio/${seguinte.data}`} className="text-sm text-zinc-600 hover:text-zinc-900">
            Desafio #{numero + 1} →
          </Link>
        )}
      </div>
    </article>
  );
}
