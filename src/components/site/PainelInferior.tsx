"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Painel que sobe da parte de baixo da tela (o "sheet" dos apps de celular).
 * Fecha com Esc, tocando no fundo escuro ou no ×. Enquanto aberto, a página
 * por trás não rola e o foco vai para dentro do painel.
 */
export function PainelInferior({
  titulo,
  aoFechar,
  children,
  ...resto
}: {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
} & Record<`data-${string}`, string | boolean | undefined>) {
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foco na ação principal (o link), não no ×.
    (painel.current?.querySelector<HTMLElement>("a") ?? painel.current?.querySelector<HTMLElement>("button"))?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", esc);
      anterior?.focus?.({ preventScroll: true });
    };
  }, [aoFechar]);

  return createPortal(
    <div className="fixed inset-0 z-50" data-testid="painel-inferior">
      <div className="absolute inset-0 bg-ink/40 motion-safe:animate-esmaecer" onClick={aoFechar} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl motion-safe:animate-sheet"
        {...resto}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden />
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
