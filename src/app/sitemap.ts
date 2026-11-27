import type { MetadataRoute } from "next";
import { exercicios } from "@/content";
import { temPaginaDeExercicio } from "@/lib/acesso-conteudo";
import { desafiosAnteriores, hojeNoServidor } from "@/content/desafios";
import { B2B_NO_AR, URL_SITE } from "@/lib/site";
import { FUNCOES } from "@/content/funcoes";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: URL_SITE, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITE}/excel-basico-para-iniciantes`, lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
    { url: `${URL_SITE}/desafio`, lastModified: agora, changeFrequency: "daily", priority: 0.8 },
    // Guia de funções: o índice e uma página por função.
    { url: `${URL_SITE}/funcoes`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    ...FUNCOES.map((f) => ({
      url: `${URL_SITE}/funcoes/${f.slug}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Páginas por público
    ...["/teste-de-excel", "/excel-para-concurso", ...(B2B_NO_AR ? ["/empresas", "/universidades"] : [])].map((p) => ({
      url: `${URL_SITE}${p}`,
      lastModified: agora,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Soluções comentadas: só de desafios que já passaram.
    ...desafiosAnteriores(hojeNoServidor()).map((d) => ({
      url: `${URL_SITE}/desafio/${d.data}`,
      lastModified: new Date(`${d.data}T12:00:00-03:00`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    // Só exercícios grátis: os pagos não têm página pública.
    ...exercicios
      .filter((e) => e.plano === "free" && temPaginaDeExercicio(e))
      .map((e) => ({
        url: `${URL_SITE}/exercicios/${e.slug}`,
        lastModified: agora,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
