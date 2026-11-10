"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import * as progresso from "@/lib/progresso";
import { IconeConquista } from "@/components/simulador/Trofeu";

type Item = { slug: string; titulo: string; ordem: number; nivel: number; versao: number };

const servidor = () => "{}";

type ModuloLista = { slug: string; titulo: string; icone: "medalha" | "taca" };

export function ListaExercicios({ itens, modulo }: { itens: Item[]; modulo: ModuloLista }) {
  const bruto = useSyncExternalStore(
    progresso.assinar,
    () => JSON.stringify(progresso.lerTudo()),
    servidor,
  );
  const tudo = JSON.parse(bruto) as ReturnType<typeof progresso.lerTudo>;
  const brutoTrofeus = useSyncExternalStore(
    progresso.assinar,
    () => JSON.stringify(progresso.lerTrofeus()),
    servidor,
  );
  const conquistadoEm = (JSON.parse(brutoTrofeus) as progresso.Trofeus)[modulo.slug];
  const feitos = itens.filter((i) => tudo[i.slug]?.versao === i.versao && tudo[i.slug]?.status === "concluido");

  return (
    <div>
      {conquistadoEm && (
        <div
          data-testid={`trofeu-home-${modulo.slug}`}
          className="mb-4 flex items-center gap-4 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4"
        >
          <IconeConquista icone={modulo.icone} className="h-14 w-14 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Troféu: {modulo.titulo}</p>
            <p className="text-sm text-amber-800">
              Módulo concluído em {new Date(conquistadoEm).toLocaleDateString("pt-BR")}.
            </p>
          </div>
        </div>
      )}
      <p className="mb-3 text-sm text-zinc-500">
        {feitos.length} de {itens.length} concluídos
      </p>
      <ol className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {itens.map((i) => {
          const p = tudo[i.slug];
          const feito = p?.versao === i.versao && p?.status === "concluido";
          const pulado = p?.versao === i.versao && p?.status === "pulado";
          const comecado = p?.versao === i.versao && !feito && !pulado;
          return (
            <li key={i.slug}>
              <Link
                href={`/exercicios/${i.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    feito ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {feito ? "✓" : i.ordem}
                </span>
                <span className="flex-1">{i.titulo}</span>
                {comecado && <span className="text-xs text-amber-700">em andamento</span>}
                {pulado && <span className="text-xs text-zinc-500">pulada</span>}
                <span className="text-xs text-zinc-400">{"●".repeat(i.nivel)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
