"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { registrar, type Evento } from "@/lib/eventos";

/** Link que registra um evento ao ser clicado (para usar em Server Components). */
export function LinkRastreado({ evento, ...props }: ComponentProps<typeof Link> & { evento: Evento }) {
  return <Link {...props} onClick={() => registrar(evento)} />;
}
