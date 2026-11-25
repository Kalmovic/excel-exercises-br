"use client";

import { Analytics } from "@vercel/analytics/next";
import { ehVisitaInterna } from "@/lib/interno";

/** Vercel Analytics sem as visitas internas (ver src/lib/interno.ts). */
export function AnalyticsFiltrado() {
  return <Analytics beforeSend={(evento) => (ehVisitaInterna(window.location.href, window.localStorage) ? null : evento)} />;
}
