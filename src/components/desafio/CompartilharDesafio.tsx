"use client";

import { useState, useSyncExternalStore } from "react";
import { dataBR } from "@/lib/data-sp";
import * as progresso from "@/lib/progresso";
import { ContagemRegressiva } from "./ContagemRegressiva";

/** Texto do card, estilo Wordle: um quadrado por verificação. */
export function textoCompartilhamento(
  numero: number,
  data: string,
  rotulo: string,
  historico: boolean[],
  url: string,
) {
  const tentativas = historico.length;
  const quadrados = historico.map((ok) => (ok ? "🟩" : "🟥")).join("");
  const resumo = tentativas <= 1 ? "de primeira!" : `em ${tentativas} tentativas`;
  return `Desafio de Excel #${numero} · ${dataBR(data).slice(0, 5)} · ${rotulo}\n${quadrados} ${resumo}\n${url}`;
}

const nada = () => () => {};

export function CompartilharDesafio({
  numero,
  data,
  rotulo,
  slug,
  versao,
}: {
  numero: number;
  data: string;
  rotulo: string;
  slug: string;
  versao: number;
}) {
  const historico = useSyncExternalStore(
    progresso.assinar,
    () => JSON.stringify(progresso.ler(slug, versao)?.historico ?? [true]),
    () => "[true]",
  );
  const origem = useSyncExternalStore(nada, () => window.location.origin, () => "");
  const [copiado, setCopiado] = useState(false);
  const texto = textoCompartilhamento(numero, data, rotulo, JSON.parse(historico), `${origem}/desafio`);

  const compartilhar = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // usuário cancelou ou o navegador bloqueou: o texto continua visível para copiar à mão
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-emerald-200 bg-white p-3" data-testid="compartilhar">
      <pre className="rounded bg-zinc-50 p-2 font-sans text-sm whitespace-pre-wrap text-zinc-800" data-testid="texto-compartilhar">
        {texto}
      </pre>
      <button
        type="button"
        onClick={compartilhar}
        className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
      >
        {copiado ? "Copiado! Cole onde quiser" : "Compartilhar resultado"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Próximo desafio em <ContagemRegressiva />. A solução comentada sai amanhã.
      </p>
    </section>
  );
}
