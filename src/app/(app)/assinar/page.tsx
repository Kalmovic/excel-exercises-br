import type { Metadata } from "next";
import { FormAssinar } from "@/components/conta/FormAssinar";
import { EmBreve } from "@/components/site/EmBreve";
import { asaasConfigurado } from "@/lib/asaas";
import { contasLigadas } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Assinar o Pro", robots: { index: false, follow: false } };

export default function Pagina() {
  if (!contasLigadas() || !asaasConfigurado())
    return (
      <EmBreve titulo="O Pro chega em breve">
        <p>Ainda não estamos vendendo o Pro. Enquanto isso, o Intro, o desafio do dia e a trilha seguem grátis.</p>
      </EmBreve>
    );
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Assinar o Pro</h1>
        <p className="text-muted">Todos os módulos, pacotes novos todo mês e o arquivo completo de desafios.</p>
      </header>
      <FormAssinar />
    </div>
  );
}
