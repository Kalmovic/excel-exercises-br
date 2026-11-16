import type { Metadata } from "next";
import { PainelConta } from "@/components/conta/PainelConta";
import { MODULOS, exerciciosDaTrilha } from "@/content";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default function Pagina() {
  const trilha = exerciciosDaTrilha().map(({ slug, versao }) => ({ slug, versao }));
  return (
    <div className="mx-auto max-w-2xl py-4">
      <PainelConta
        trilha={trilha}
        modulos={MODULOS.length}
        titulos={Object.fromEntries(MODULOS.map((m) => [m.slug, `Módulo ${m.numero}: ${m.titulo}`]))}
      />
    </div>
  );
}
