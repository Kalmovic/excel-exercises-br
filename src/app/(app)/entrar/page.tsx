import type { Metadata } from "next";
import { FormEntrar } from "@/components/conta/FormEntrar";
import { EmBreve } from "@/components/site/EmBreve";
import { contasLigadas } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: true } };

const VANTAGENS = [
  ["Seu progresso salvo", "Exercícios, troféus e ofensiva guardados na conta."],
  ["Em qualquer aparelho", "Comece no computador, continue no celular."],
  ["Sem senha", "Você entra com um código que chega no seu e-mail."],
] as const;

export default function Pagina() {
  if (!contasLigadas())
    return (
      <EmBreve titulo="Contas chegam em breve">
        <p>Por enquanto não é preciso cadastro: seu progresso e seus troféus ficam salvos neste navegador.</p>
      </EmBreve>
    );
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-sm md:grid-cols-[1fr_1.1fr]">
      {/* Painel da marca (some no celular, onde só o formulário importa) */}
      <aside className="hidden flex-col justify-between gap-10 bg-ink p-8 text-white md:flex">
        <div className="space-y-3">
          <p className="font-display text-3xl leading-tight font-extrabold">Continue de onde parou.</p>
          <p className="text-white/70">O que você já fez neste navegador vai junto para a conta.</p>
        </div>
        <ul className="space-y-4">
          {VANTAGENS.map(([titulo, texto]) => (
            <li key={titulo} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-ink" aria-hidden>
                ✓
              </span>
              <span>
                <span className="block font-semibold">{titulo}</span>
                <span className="text-sm text-white/70">{texto}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* Barra de fórmulas: a marca registrada do site */}
        <div className="flex overflow-hidden rounded-lg border border-white/15 font-mono text-sm" aria-hidden>
          <span className="bg-white/10 px-3 py-2 text-white/60 italic">fx</span>
          <span className="px-3 py-2 text-accent">=PROGRESSO(&quot;salvo&quot;)</span>
        </div>
      </aside>

      <div className="space-y-6 p-6 sm:p-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Entrar ou criar conta</h1>
          <p className="text-muted md:hidden">Seu progresso salvo, em qualquer aparelho.</p>
        </header>
        <FormEntrar />
      </div>
    </div>
  );
}
