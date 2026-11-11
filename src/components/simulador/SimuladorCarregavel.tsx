"use client";

import { type ComponentProps, type ReactNode, Suspense, lazy, useSyncExternalStore } from "react";

/**
 * O motor de fórmulas só é baixado no navegador e nunca roda no servidor
 * (progresso fica no localStorage). Até ele chegar, mostra `previa`: o
 * exercício já renderizado no servidor, que é o que o Google indexa.
 */
const Simulador = lazy(() => import("./Simulador"));

const nada = () => () => {};

type Props = ComponentProps<typeof Simulador> & { previa?: ReactNode };

export default function SimuladorCarregavel({ previa, ...props }: Props) {
  const noNavegador = useSyncExternalStore(nada, () => true, () => false);
  const espera = previa ?? (
    <div className="flex h-80 items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-500">
      Carregando planilha…
    </div>
  );
  if (!noNavegador) return espera;
  return (
    <Suspense fallback={espera}>
      <Simulador {...props} />
    </Suspense>
  );
}
