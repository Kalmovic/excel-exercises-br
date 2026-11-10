import Link from "next/link";
import { NOME_SITE } from "@/lib/site";

/** Logo: quadrado de tinta com o "=" de fórmula em amarelo marca-texto. */
export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-display text-lg font-bold ${claro ? "text-white" : "text-ink"}`}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-ink font-mono text-base font-bold text-accent ring-1 ring-white/10">
        =
      </span>
      {NOME_SITE}
    </Link>
  );
}
