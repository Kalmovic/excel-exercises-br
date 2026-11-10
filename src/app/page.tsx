import Link from "next/link";
import { ComecarCta } from "@/components/site/ComecarCta";
import { ListaExercicios } from "@/components/site/ListaExercicios";
import { MODULOS, exercicios, exerciciosDoModulo } from "@/content";

export default function Home() {
  const trilha = exercicios
    .filter((e) => e.plano === "free")
    .map(({ slug, titulo, modulo, versao }) => ({ slug, titulo, modulo, versao }));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <h1 className="text-3xl font-bold tracking-tight">Aprenda Excel fazendo.</h1>
        <p className="text-lg text-zinc-600">
          Exercícios numa planilha de verdade, no navegador, com as fórmulas do Excel em português:{" "}
          <code className="font-mono text-emerald-800">=SOMA(B2:B7)</code>,{" "}
          <code className="font-mono text-emerald-800">=PROCV(A2;Tabela;2;FALSO)</code>. Você digita, a
          correção é na hora.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>✓ Do zero: o Módulo 0 é para quem nunca abriu uma planilha</li>
          <li>✓ Separador <code>;</code> e decimal com vírgula, como no Excel brasileiro</li>
          <li>✓ Dicas progressivas e explicação depois de acertar</li>
          <li>✓ Seu progresso fica salvo neste navegador</li>
        </ul>
        <ComecarCta trilha={trilha} />
      </section>
      <div className="space-y-10">
        {MODULOS.map((m) => {
          const itens = exerciciosDoModulo(m.slug)
            .filter((e) => e.plano === "free")
            .map(({ slug, titulo, ordem, nivel, versao }) => ({ slug, titulo, ordem, nivel, versao }));
          return (
            <section key={m.slug} id={`modulo-${m.slug}`}>
              <h2 className="text-xl font-semibold">
                Módulo {m.numero}: {m.titulo}
              </h2>
              <p className="mb-4 text-zinc-600">
                {m.descricao}
                {m.slug === "intro" && (
                  <>
                    {" "}
                    <Link href="/excel-basico-para-iniciantes" className="text-emerald-800 underline-offset-4 hover:underline">
                      Ler o guia
                    </Link>
                  </>
                )}
              </p>
              <ListaExercicios itens={itens} modulo={{ slug: m.slug, titulo: m.titulo, icone: m.trofeu.icone }} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
