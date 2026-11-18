"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

/**
 * Teclado nos menus, janelas e grupos da grade: setas, Home/End, Esc e o
 * foco que entra ao abrir e volta ao fechar.
 */

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Esc fecha (no próprio elemento, para não fechar duas coisas de uma vez). */
export function useEscape(ref: RefObject<HTMLElement | null>, fechar: () => void) {
  const f = useRef(fechar);
  useEffect(() => {
    f.current = fechar;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      f.current();
    };
    el.addEventListener("keydown", esc);
    return () => el.removeEventListener("keydown", esc);
  }, [ref]);
}

/**
 * Ao montar, põe o foco no primeiro controle (ou no `seletor`) dentro de `ref`.
 * Ao desmontar, devolve o foco a quem o tinha antes, se ele ainda estiver na página
 * e o foco não tiver ido parar em outro lugar de propósito.
 */
export function useFocoDentro(ref: RefObject<HTMLElement | null>, seletor?: string, devolver = true) {
  useEffect(() => {
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = ref.current;
    const alvo = el?.querySelector<HTMLElement>(seletor ?? FOCAVEIS) ?? el?.querySelector<HTMLElement>(FOCAVEIS);
    alvo?.focus({ preventScroll: true });
    return () => {
      if (!devolver || !antes || !antes.isConnected) return;
      const agora = document.activeElement;
      // Só devolve se o foco se perdeu (ficou no body) ou ainda está dentro do que fechou.
      if (agora === null || agora === document.body || (el && el.contains(agora))) antes.focus({ preventScroll: true });
    };
    // Só na montagem: quem abriu fica gravado em `antes`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Setas entre os itens (`seletor`) de um menu, grupo de opções ou lista de abas.
 * `orientacao` "vertical" usa ↑/↓, "horizontal" usa ←/→, "ambas" aceita as quatro.
 * Devolve o item que recebeu o foco (ou null se a tecla não era de navegação).
 */
export function navegarItens(
  e: KeyboardEvent<HTMLElement>,
  seletor: string,
  orientacao: "vertical" | "horizontal" | "ambas" = "vertical",
): HTMLElement | null {
  const proximas = orientacao === "horizontal" ? ["ArrowRight"] : orientacao === "vertical" ? ["ArrowDown"] : ["ArrowDown", "ArrowRight"];
  const anteriores = orientacao === "horizontal" ? ["ArrowLeft"] : orientacao === "vertical" ? ["ArrowUp"] : ["ArrowUp", "ArrowLeft"];
  const k = e.key;
  if (!proximas.includes(k) && !anteriores.includes(k) && k !== "Home" && k !== "End") return null;
  const itens = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(seletor)).filter(
    (x) => !(x as HTMLButtonElement).disabled,
  );
  if (itens.length === 0) return null;
  e.preventDefault();
  const atual = itens.indexOf(document.activeElement as HTMLElement);
  const i =
    k === "Home"
      ? 0
      : k === "End"
        ? itens.length - 1
        : proximas.includes(k)
          ? (atual + 1) % itens.length
          : (atual - 1 + itens.length) % itens.length;
  itens[i].focus();
  return itens[i];
}

/** Controles visíveis e habilitados dentro de `el`, na ordem do Tab. */
export function focaveisDentro(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
    (x) => x.tabIndex >= 0 && !x.closest("[inert]") && x.getClientRects().length > 0,
  );
}

/**
 * Prende o Tab dentro de uma janela (`role="dialog"`): do último controle, Tab volta
 * ao primeiro; do primeiro, Shift+Tab vai ao último. Sem isso o foco escapa para a
 * grade com a janela aberta, e um Enter age na planilha.
 */
export function useFocoPreso(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      const itens = focaveisDentro(el);
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const atual = document.activeElement;
      const dentro = atual instanceof HTMLElement && itens.includes(atual);
      if (e.shiftKey && (!dentro || atual === primeiro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (!dentro || atual === ultimo)) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    el.addEventListener("keydown", tab);
    return () => el.removeEventListener("keydown", tab);
  }, [ref]);
}
