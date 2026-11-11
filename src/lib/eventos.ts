import { track } from "@vercel/analytics";
import { resumoOrigem } from "./origem";

/**
 * Eventos de produto, tipados. Mudar o destino (Vercel Analytics hoje;
 * Plausible ou PostHog depois) é mexer só aqui.
 *
 * Funil principal: cta_landing → exercicio_aberto → verificou → modulo_concluido
 * (Intro) → upsell_clicou. Visitas de página são contadas automaticamente.
 */
export type Evento =
  | { nome: "cta_landing"; local: "hero" | "planos" | "chamada_final" | "cabecalho" }
  | { nome: "exercicio_aberto"; slug: string; modulo: string }
  | { nome: "verificou"; slug: string; ok: boolean; tentativa: number; motivo?: string }
  | { nome: "dica_vista"; slug: string; numero: number }
  | { nome: "pulou"; slug: string }
  | { nome: "modulo_concluido"; modulo: string }
  | { nome: "desafio_concluido"; data: string; tentativas: number }
  | { nome: "compartilhou"; data: string; meio: "nativo" | "copiar" }
  | { nome: "upsell_clicou"; origem: "desafio" | "landing" | "trilha" };

export function registrar(evento: Evento) {
  const { nome, ...props } = evento;
  try {
    // Toda medição leva a origem (canal, afiliado ou cupom), para ver a conversão por origem.
    track(nome, { ...(props as Record<string, string | number | boolean>), origem: resumoOrigem() });
  } catch {
    // medição nunca pode quebrar a página
  }
  if (process.env.NODE_ENV === "development") console.debug("[evento]", nome, props);
}
