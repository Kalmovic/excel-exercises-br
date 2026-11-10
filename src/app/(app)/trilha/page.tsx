import type { Metadata } from "next";
import Link from "next/link";
import { ComecarCta } from "@/components/site/ComecarCta";
import { ListaExercicios } from "@/components/site/ListaExercicios";
import { MODULOS, exercicios, exerciciosDoModulo } from "@/content";
import { NOME_DESAFIO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trilha",
  description: "Do primeiro clique ao PROCV: os módulos da trilha, com o seu progresso.",
  alternates: { canonical: "/trilha" },
};

export default function Trilha() {
  const trilha = exercicios
    .filter((e) => e.plano === "free")
    .map(({ slug, titulo, modulo, versao }) => ({ slug, titulo, modulo, versao }));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <h1 className="text-3xl font-bold tracking-tight">Sua trilha</h1>
        <p className="text-lg text-zinc-600">
          Comece pelo Intro se nunca abriu uma planilha. Já sabe o básico? Vá direto para Fundamentos. Seu progresso
          fica salvo neste navegador.
        </p>
        <ComecarCta trilha={trilha} />
        <Link
          href="/desafio"
          className="mt-4 block rounded-lg border border-success/30 bg-white p-4 shadow-sm hover:border-success/30"
          data-testid="card-desafio"
        >
          <p className="font-semibold text-ink">{NOME_DESAFIO} →</p>
          <p className="text-sm text-zinc-600">
            Um desafio novo todo dia, o mesmo para todo mundo. Sem dicas. Compartilhe seu resultado.
          </p>
        </Link>
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
                    <Link href="/excel-basico-para-iniciantes" className="text-success underline-offset-4 hover:underline">
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
