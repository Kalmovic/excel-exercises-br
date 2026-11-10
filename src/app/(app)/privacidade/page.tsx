import type { Metadata } from "next";
import { EmBreve } from "@/components/site/EmBreve";

export const metadata: Metadata = { title: "Política de privacidade", robots: { index: false, follow: true } };

export default function Pagina() {
  return (
    <EmBreve titulo="Política de privacidade">
      <p>Hoje o site não pede cadastro e guarda seu progresso só no seu navegador (localStorage). A política de privacidade completa será publicada antes do lançamento das contas.</p>
    </EmBreve>
  );
}
