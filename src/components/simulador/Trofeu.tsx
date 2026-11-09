"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  modulo: string;
  exercicios: number;
  tentativas: number;
  onFechar: () => void;
};

/** Modal de conquista ao terminar a trilha grátis. */
export function TrofeuModal({ modulo, exercicios, tentativas, onFechar }: Props) {
  const botao = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    botao.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
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
        <IconeTrofeu className="mx-auto h-28 w-28 motion-safe:animate-brilho" />
        <p className="mt-4 text-sm font-semibold tracking-wide text-amber-700 uppercase">Trilha concluída</p>
        <h2 id="titulo-trofeu" className="mt-1 text-2xl font-bold">
          {modulo}
        </h2>
        <p className="mt-2 text-zinc-600">
          Você resolveu os {exercicios} exercícios com {tentativas}{" "}
          {tentativas === 1 ? "verificação" : "verificações"}. SOMA, MÉDIA, operadores e o famoso $ já estão
          no seu repertório.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            ref={botao}
            href="/"
            className="rounded-md bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800"
          >
            Ver meu troféu
          </Link>
          <button type="button" onClick={onFechar} className="py-2 text-sm text-zinc-500 hover:text-zinc-800">
            Continuar aqui
          </button>
        </div>
        <p className="mt-4 text-xs text-zinc-400">Seu progresso fica salvo neste navegador.</p>
      </div>
    </div>
  );
}

export function IconeTrofeu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M18 10h28v14a14 14 0 0 1-28 0z" fill="url(#ouro)" />
      <path
        d="M18 14H10v4a10 10 0 0 0 10 10M46 14h8v4a10 10 0 0 1-10 10"
        fill="none"
        stroke="#d97706"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="29" y="37" width="6" height="9" fill="#d97706" />
      <rect x="20" y="46" width="24" height="7" rx="2" fill="#92400e" />
      <text x="32" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="#78350f" fontFamily="sans-serif">
        fx
      </text>
    </svg>
  );
}
