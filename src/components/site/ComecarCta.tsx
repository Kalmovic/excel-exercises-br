"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { escolherInicio, type ItemTrilha } from "@/lib/inicio";
import * as progresso from "@/lib/progresso";

const lerTudo = () => JSON.stringify([progresso.lerTudo(), progresso.lerPreferencias()]);
const noServidor = () => "";

const botao = "inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white shadow-sm hover:bg-ink-soft";

/** Botão principal da página inicial. Depende do localStorage, então só aparece no navegador. */
export function ComecarCta({ trilha }: { trilha: ItemTrilha[] }) {
  const bruto = useSyncExternalStore(progresso.assinar, lerTudo, noServidor);
  if (!bruto) return <div className="h-12" aria-hidden />;
  const [tudo, prefs] = JSON.parse(bruto);
  const inicio = escolherInicio(trilha, tudo, prefs);

  switch (inicio.tipo) {
    case "novo":
      return (
        <div className="flex flex-wrap items-center gap-4" data-testid="cta">
          <Link href={`/exercicios/${inicio.intro.slug}`} className={botao}>
            Começar pelo básico
          </Link>
          <Link
            href={`/exercicios/${inicio.fundamentos.slug}`}
            onClick={() => progresso.salvarPreferencias({ pularIntro: true })}
            className="text-success underline-offset-4 hover:underline"
          >
            Já sei o básico, ir para Fundamentos →
          </Link>
        </div>
      );
    case "novo-sem-intro":
      return (
        <div className="flex flex-wrap items-center gap-4" data-testid="cta">
          <Link href={`/exercicios/${inicio.fundamentos.slug}`} className={botao}>
            Começar Fundamentos
          </Link>
          <Link href={`/exercicios/${inicio.intro.slug}`} className="text-zinc-600 underline-offset-4 hover:underline">
            Prefiro começar pelo básico
          </Link>
        </div>
      );
    case "continuar":
      return (
        <div data-testid="cta">
          <Link href={`/exercicios/${inicio.alvo.slug}`} className={botao}>
            Continuar: {inicio.alvo.titulo} →
          </Link>
        </div>
      );
    case "concluido":
      return (
        <div className="space-y-3" data-testid="cta">
          <p className="text-muted">Você concluiu todos os exercícios disponíveis. Novos módulos em breve!</p>
          <Link href="/desafio" className={botao}>
            Jogar o desafio de hoje
          </Link>
        </div>
      );
  }
}
