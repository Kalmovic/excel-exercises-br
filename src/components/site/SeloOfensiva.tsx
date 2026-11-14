"use client";

import { useSyncExternalStore } from "react";
import { hojeSP } from "@/lib/data-sp";
import { calcularOfensiva, lerDias, type Ofensiva } from "@/lib/ofensiva";
import * as progresso from "@/lib/progresso";

const ler = () => JSON.stringify(calcularOfensiva(lerDias(), hojeSP()));

/** Dias seguidos com exercício concluído. Lê do navegador; no servidor não mostra nada. */
export function SeloOfensiva({ className = "", ocultarVazio = false }: { className?: string; ocultarVazio?: boolean }) {
  const bruto = useSyncExternalStore(progresso.assinar, ler, () => "null");
  const o = JSON.parse(bruto) as Ofensiva | null;
  if (!o || (ocultarVazio && o.atual === 0)) return null;
  const dias = (n: number) => `${n} ${n === 1 ? "dia seguido" : "dias seguidos"}`;
  return (
    <p className={`text-sm ${className}`} data-testid="ofensiva" aria-live="polite">
      {o.atual > 0 ? (
        <>
          <span aria-hidden>🔥</span> <strong>{dias(o.atual)}</strong>
          {!o.fezHoje && <span className="text-muted"> · faça um exercício hoje para não perder</span>}
          {o.recorde > o.atual && <span className="text-muted"> · recorde: {o.recorde}</span>}
        </>
      ) : (
        <span className="text-muted">Conclua um exercício hoje para começar sua ofensiva.</span>
      )}
    </p>
  );
}
