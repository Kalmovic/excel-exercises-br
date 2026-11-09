"use client";

import dynamic from "next/dynamic";

/**
 * O motor de fórmulas só é baixado quando o exercício aparece na tela, e
 * nunca roda no servidor (progresso fica no localStorage).
 */
const SimuladorCarregavel = dynamic(() => import("./Simulador"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-md border border-dashed border-zinc-300 text-zinc-500">
      Carregando planilha…
    </div>
  ),
});

export default SimuladorCarregavel;
