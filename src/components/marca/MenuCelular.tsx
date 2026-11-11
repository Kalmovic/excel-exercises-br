"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ItemMenu = { href: string; rotulo: string };

/** Navegação em telas estreitas (abaixo de md), onde os links do cabeçalho somem. */
export function MenuCelular({ itens }: { itens: ItemMenu[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  // Fecha ao clicar num link (onClick abaixo), fora do menu, com Esc e no
  // voltar/avançar do navegador. (Sem usePathname: no layout raiz ele exigiria
  // Suspense em volta de toda rota dinâmica.)
  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && fechar();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("popstate", fechar);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("popstate", fechar);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative md:hidden">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        onClick={() => setAberto((a) => !a)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink"
        data-testid="botao-menu"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          {aberto ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {aberto && (
        <nav
          id="menu-celular"
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-xl"
          aria-label="Menu"
        >
          {itens.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setAberto(false)}
              className="block rounded-lg px-3 py-2.5 font-medium text-ink hover:bg-bg"
            >
              {i.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
