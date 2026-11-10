import type { MetadataRoute } from "next";
import { exercicios } from "@/content";
import { URL_SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: URL_SITE, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITE}/excel-basico-para-iniciantes`, lastModified: agora, changeFrequency: "monthly", priority: 0.9 },
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
