import type { Metadata } from "next";
import Link from "next/link";
import { MapaTrilha, type RegiaoMapa } from "@/components/mapa/MapaTrilha";
import { PainelTrilha } from "@/components/mapa/PainelTrilha";
import { MODULOS, exercicios, exerciciosDoModulo } from "@/content";
import { LANCAMENTO } from "@/content/desafios";
import { MODULOS_PLANEJADOS } from "@/content/modulos-pro";
import { ptBR } from "@/engine/ptBR";

export const metadata: Metadata = {
  title: "Trilha",
  description: "Do primeiro clique ao PROCV: o mapa da trilha, com o seu progresso.",
  alternates: { canonical: "/trilha" },
};

const pt = (f: string) => (ptBR.functions as Record<string, string>)[f] ?? f;

export default function Trilha() {
  const trilha = exercicios
    .filter((e) => e.plano === "free")
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
        .filter((e) => e.plano === "free")
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
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <h1 className="text-3xl font-bold tracking-tight">Sua trilha</h1>
        <PainelTrilha trilha={trilha} lancamento={LANCAMENTO} />
        <p className="text-sm text-muted">
          Nunca abriu uma planilha?{" "}
          <Link href="/excel-basico-para-iniciantes" className="text-success underline-offset-4 hover:underline">
            Leia o guia de Excel básico
          </Link>
          .
        </p>
      </aside>
      {/* Mapa à esquerda; à direita, espaço livre para o balão de detalhes (nunca cobre outras casas). */}
      <div className="overflow-x-auto pb-10 lg:pl-6" style={{ minWidth: 0 }}>
        <MapaTrilha regioes={regioes} trilha={trilha} />
      </div>
    </div>
  );
}
