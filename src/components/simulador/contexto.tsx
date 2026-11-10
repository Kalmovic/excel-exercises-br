"use client";

import { createContext, useContext, useSyncExternalStore, type RefObject } from "react";
import { useStore } from "zustand";
import type { Planilha } from "@/engine/engine";
import type { EstadoSimulador, StoreSimulador } from "./store";

export type ContextoSimulador = {
  planilha: Planilha;
  store: StoreSimulador;
  entradaRef: RefObject<HTMLInputElement | null>;
  alvos: Set<string>;
  /** Barra de formatação (R$, %) e seus atalhos. */
  formatacao: boolean;
  /** Mostrar o endereço da célula ativa na Caixa de Nome. */
  caixaDeNome: boolean;
  /** Seleção travada: a grade só pode ser observada. */
  selecaoFixa: boolean;
};

export const Contexto = createContext<ContextoSimulador | null>(null);

export function useSimulador() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useSimulador fora do <Simulador>");
  return c;
}

export function useEstado<T>(seletor: (e: EstadoSimulador) => T): T {
  return useStore(useSimulador().store, seletor);
}

/** Re-renderiza quando o motor recalcula. */
export function useVersaoPlanilha() {
  const { planilha } = useSimulador();
  return useSyncExternalStore(planilha.subscribe, planilha.getVersion, planilha.getVersion);
}
