import "server-only";
import { exercicios, MODULOS } from "@/content";
import { desafios, rotuloNivel } from "@/content/desafios";
import type { Exercicio } from "@/content/schema";

/** Tudo o que existe, na ordem de navegação do admin: trilha e depois desafios por data. */
export type ItemCatalogo = {
  slug: string;
  titulo: string;
  grupo: string;
  detalhe: string;
  exercicio: Exercicio;
  /** Desafio diário: data do desafio. */
  data?: string;
};

export function catalogo(): ItemCatalogo[] {
  const trilha = MODULOS.flatMap((m) =>
    exercicios
      .filter((e) => e.modulo === m.slug)
      .map((e) => ({
        slug: e.slug,
        titulo: e.titulo,
        grupo: `Módulo ${m.numero}: ${m.titulo}`,
        detalhe: `${e.type} · ${e.plano} · nível ${e.nivel}`,
        exercicio: e,
      })),
  );
  const diarios = desafios.map((d) => ({
    slug: d.exercicio.slug,
    titulo: d.exercicio.titulo,
    grupo: "Desafio diário",
    detalhe: `${d.data} · ${rotuloNivel(d)}`,
    exercicio: d.exercicio,
    data: d.data,
  }));
  return [...trilha, ...diarios];
}

