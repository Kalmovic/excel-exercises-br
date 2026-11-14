"use client";

import { useSyncExternalStore } from "react";
import type { Exercicio } from "@/content/schema";

/** Só tela de toque, sem mouse nem trackpad (celular, tablet sem teclado). */
const CONSULTA = "(pointer: coarse) and (not (any-pointer: fine))";

function assinar(f: () => void) {
  const m = window.matchMedia(CONSULTA);
  m.addEventListener("change", f);
  return () => m.removeEventListener("change", f);
}

export function useSemTeclado() {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches, () => false);
}

/** O exercício com os textos de toque, quando o aparelho não tem teclado e o exercício os tem. */
export function adaptarAoToque(ex: Exercicio, semTeclado: boolean): Exercicio {
  if (!semTeclado || !ex.toque) return ex;
  return { ...ex, enunciado: ex.toque.enunciado, dicas: ex.toque.dicas ?? ex.dicas };
}
