import type { Metadata } from "next";
import { MapaTrilha, type RegiaoMapa } from "@/components/mapa/MapaTrilha";
import { PainelTrilha } from "@/components/mapa/PainelTrilha";
import type { ItemTrilha } from "@/lib/inicio";
import { connection } from "next/server";
import { Suspense } from "react";
import { MODULOS, exerciciosDaTrilha, exerciciosDoModulo } from "@/content";
import { desafioDoDia, hojeNoServidor, numeroDoDesafio, rotuloNivel } from "@/content/desafios";
import { MODULOS_PLANEJADOS } from "@/content/modulos-pro";
import { ptBR } from "@/engine/ptBR";
import { exercicioLiberado } from "@/lib/acesso-conteudo";

export const metadata: Metadata = {
  title: "Trilha",
  description: "Do primeiro clique ao PROCV: o mapa da trilha, com o seu progresso.",
  alternates: { canonical: "/trilha" },
};

const pt = (f: string) => (ptBR.functions as Record<string, string>)[f] ?? f;

export default function Trilha() {
  const trilha = exerciciosDaTrilha()
    .filter(exercicioLiberado)
    .map(({ slug, titulo, modulo, versao }) => ({ slug, titulo, modulo, versao }));

  // Módulos que existem + os planejados (travados, "em breve"), na ordem da trilha.
  const existentes = new Set(MODULOS.map((m) => m.slug));
  const regioes: RegiaoMapa[] = [
    ...MODULOS.map((m) => ({
      slug: m.slug,
      numero: m.numero,
      titulo: m.titulo,
      descricao: m.descricao,
      icone: m.trofeu.icone,
      disponivel: true,
      itens: exerciciosDoModulo(m.slug)
        .filter(exercicioLiberado)
        .map(({ slug, titulo, nivel, versao }) => ({ slug, titulo, nivel, versao })),
    })),
    ...MODULOS_PLANEJADOS.map((m, i) => ({ ...m, numero: i + 1 }))
      .filter((m) => !existentes.has(m.slug))
      .map((m) => ({
        slug: m.slug,
        numero: m.numero,
        titulo: m.titulo,
        descricao: m.funcoes.slice(0, 4).map(pt).join(", "),
        icone: "taca" as const,
        disponivel: false,
        itens: [],
        travadas: 2,
      })),
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Sua trilha</h1>
        {/* A parte que depende da data roda por request; o resto da página é estático. */}
        <Suspense fallback={<PainelTrilha trilha={trilha} />}>
          <PainelComDesafio trilha={trilha} />
        </Suspense>
      </aside>
      {/* Mapa à esquerda; à direita, espaço livre para o balão de detalhes (nunca cobre outras casas). */}
      <div className="overflow-x-auto pb-10 lg:pl-6" style={{ minWidth: 0 }}>
        <MapaTrilha regioes={regioes} trilha={trilha} />
      </div>
    </div>
  );
}

async function PainelComDesafio({ trilha }: { trilha: ItemTrilha[] }) {
  await connection();
  const hoje = hojeNoServidor();
  const d = desafioDoDia(hoje);
  return (
    <PainelTrilha
      trilha={trilha}
      desafio={
        d
          ? { slug: d.exercicio.slug, versao: d.exercicio.versao, numero: numeroDoDesafio(hoje), rotulo: rotuloNivel(d) }
          : null
      }
    />
  );
}
