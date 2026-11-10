"use client";

import { useEffect, useState } from "react";
import { segundosAteMeiaNoiteSP } from "@/lib/data-sp";

const fmt = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");

/** Tempo até a meia-noite de Brasília, atualizado a cada segundo. */
export function ContagemRegressiva() {
  const [segundos, setSegundos] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setSegundos(segundosAteMeiaNoiteSP());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{segundos === null ? "--:--:--" : fmt(segundos)}</span>;
}
