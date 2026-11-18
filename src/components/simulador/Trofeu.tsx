"use client";
import Image from "next/image";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  titulo: string;
  icone: "medalha" | "taca";
  descricao: string;
  exercicios: number;
  tentativas: number;
  acao: { rotulo: string; href: string };
  onFechar: () => void;
};

/** Modal de conquista ao terminar um módulo. */
export function TrofeuModal({ titulo, icone, descricao, exercicios, tentativas, acao, onFechar }: Props) {
  const botao = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    botao.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  // No <body>: dentro da página, um ancestral com transform encolhia o fundo escuro.
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-trofeu"
        data-testid="trofeu"
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl motion-safe:animate-subir"
      >
        <IconeConquista icone={icone} className="mx-auto h-28 w-28 motion-safe:animate-brilho" />
        <p className="mt-4 text-sm font-semibold tracking-wide text-ink uppercase">Módulo concluído</p>
        <h2 id="titulo-trofeu" className="mt-1 text-2xl font-bold">
          {titulo}
        </h2>
        <p className="mt-2 text-zinc-600">
          Você resolveu os {exercicios} exercícios com {tentativas}{" "}
          {tentativas === 1 ? "verificação" : "verificações"}. {descricao}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            ref={botao}
            href={acao.href}
            className="rounded-md bg-ink px-4 py-2.5 font-medium text-white hover:bg-ink-soft"
          >
            {acao.rotulo}
          </Link>
          <button type="button" onClick={onFechar} className="py-2 text-sm text-zinc-500 hover:text-zinc-800">
            Continuar aqui
          </button>
        </div>
        <p className="mt-4 text-xs text-zinc-400">Seu progresso fica salvo neste navegador.</p>
      </div>
    </div>,
    document.body,
  );
}

/** Troféu do Planilhês (arte em public/trofeu.webp, fundo transparente). */
export function IconeTrofeu({ className }: { className?: string }) {
  return <Image src="/trofeu.webp" alt="" width={240} height={240} className={`object-contain ${className ?? ""}`} aria-hidden />;
}

/** Medalha (módulos de entrada) ou taça (módulos de conteúdo). */
export function IconeConquista({ icone, className }: { icone: "medalha" | "taca"; className?: string }) {
  return icone === "taca" ? <IconeTrofeu className={className} /> : <IconeMedalha className={className} />;
}

export function IconeMedalha({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="prata" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f8f4" />
          <stop offset="0.6" stopColor="#d6d5cc" />
          <stop offset="1" stopColor="#a8a79c" />
        </linearGradient>
      </defs>
      <path d="M20 4h10l4 18h-10z" fill="#ffd23f" />
      <path d="M44 4H34l-4 18h10z" fill="#16181d" />
      <circle cx="32" cy="40" r="18" fill="url(#prata)" stroke="#16181d" strokeWidth="2" />
      <circle cx="32" cy="40" r="13" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
      <text x="32" y="46" textAnchor="middle" fontSize="16" fontWeight="800" fill="#16181d" fontFamily="monospace">
        =
      </text>
    </svg>
  );
}
