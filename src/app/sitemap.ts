import type { MetadataRoute } from "next";
import { exercicios } from "@/content";
import { desafiosAnteriores, hojeNoServidor } from "@/content/desafios";
import { URL_SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: URL_SITE, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITE}/excel-basico-para-iniciantes`, lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
    { url: `${URL_SITE}/desafio`, lastModified: agora, changeFrequency: "daily", priority: 0.8 },
    { url: `${URL_SITE}/desafio/anteriores`, lastModified: agora, changeFrequency: "daily", priority: 0.5 },
    // Soluções comentadas: só de desafios que já passaram.
    ...desafiosAnteriores(hojeNoServidor()).map((d) => ({
      url: `${URL_SITE}/desafio/${d.data}`,
      lastModified: new Date(`${d.data}T12:00:00-03:00`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    // Só exercícios grátis: os pagos não têm página pública.
    ...exercicios
      .filter((e) => e.plano === "free")
      .map((e) => ({
        url: `${URL_SITE}/exercicios/${e.slug}`,
        lastModified: agora,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
