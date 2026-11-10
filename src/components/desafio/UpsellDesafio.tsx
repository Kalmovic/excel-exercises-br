import Link from "next/link";
import type { Upsell } from "@/content/modulos-pro";

const lista = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

/** Gancho para o Pro, ligado às funções que o desafio do dia usou. */
export function UpsellDesafio({ upsell }: { upsell: Upsell }) {
  return (
    <section className="space-y-2 rounded-md border border-accent bg-accent-soft p-3 text-sm text-ink" data-testid="upsell-desafio">
      <p>
        Este desafio usou <strong>{lista(upsell.usadas)}</strong>.
      </p>
      <p>
        No <strong>Pro</strong>, o módulo <strong>{upsell.modulo.titulo}</strong> tem uma trilha inteira de prática com{" "}
        {lista(upsell.modulo.funcoes)}, do básico ao caso real.
      </p>
      <Link
        href="/pro"
        className="inline-block rounded-md bg-accent px-3 py-1.5 font-medium text-ink hover:bg-accent"
      >
        Conhecer o Pro →
      </Link>
    </section>
  );
}
