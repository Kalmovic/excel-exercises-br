import type { NextConfig } from "next";

const SUPABASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV === "development";

/** Origem do Supabase (https e wss, para o navegador falar com a API e o realtime). */
function origensSupabase(): string[] {
  try {
    const u = new URL(SUPABASE);
    return [u.origin, `wss://${u.host}`];
  } catch {
    return [];
  }
}

/**
 * Política de conteúdo: o que a página pode carregar.
 *
 * Sem nonce: o site usa cacheComponents e páginas pré-renderizadas, e o nonce
 * exige renderizar cada página na hora (ver o guia de CSP do Next, "Without
 * Nonces"). Por isso o 'unsafe-inline' nos scripts (o Next põe scripts inline
 * no HTML); o resto fica fechado.
 * - Scripts e conexões: o próprio site; Vercel Analytics (/_vercel/insights no
 *   site, va.vercel-scripts.com no modo debug); o Supabase (login e progresso).
 * - worker blob: o canvas-confetti desenha o confete num worker criado de um blob.
 * - Fontes e imagens: locais (fontsource), data: e blob:.
 * - O Stripe é página inteira (redirecionamento), não passa pela CSP.
 * - frame-ancestors 'none': ninguém põe o site num iframe (clickjacking em
 *   /conta, /assinar, /certificado/emitir).
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  ["connect-src 'self' https://va.vercel-scripts.com", ...origensSupabase(), ...(dev ? ["ws:"] : [])].join(" "),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SEGURANCA = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" }, // navegadores antigos, que não leem frame-ancestors
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // A integração da Vercel cria estas variáveis só para o servidor; o navegador
  // precisa do endereço e da chave pública (ver src/lib/supabase/config.ts).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
  // Sem o "X-Powered-By: Next.js".
  poweredByHeader: false,
  async headers() {
    // Site em teste: fora do Google até INDEXAR_SITE=1 (vale também para JSON, imagens e PDFs).
    const robos = process.env.INDEXAR_SITE === "1" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [{ source: "/:path*", headers: [...SEGURANCA, ...robos] }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
