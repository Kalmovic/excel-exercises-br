import type { Metadata } from "next";
import { FormEntrar } from "@/components/conta/FormEntrar";
import { EmBreve } from "@/components/site/EmBreve";
import { contasLigadas } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: true } };

export default function Pagina() {
  if (!contasLigadas())
    return (
      <EmBreve titulo="Contas chegam em breve">
        <p>Por enquanto não é preciso cadastro: seu progresso e seus troféus ficam salvos neste navegador. Quando as contas chegarem, você poderá levar tudo para a sua conta.</p>
      </EmBreve>
    );
  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Entrar ou criar conta</h1>
        <p className="text-muted">Com uma conta, seu progresso fica salvo e você continua em qualquer aparelho. O que você já fez neste navegador vai junto.</p>
      </header>
      <FormEntrar />
    </div>
  );
}
