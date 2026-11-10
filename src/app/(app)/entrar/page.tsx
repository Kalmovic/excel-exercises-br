import type { Metadata } from "next";
import { EmBreve } from "@/components/site/EmBreve";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: true } };

export default function Pagina() {
  return (
    <EmBreve titulo="Contas chegam em breve">
      <p>Por enquanto não é preciso cadastro: seu progresso, seus troféus e sua ofensiva ficam salvos neste navegador. Quando as contas chegarem, você poderá levar tudo para a sua conta.</p>
    </EmBreve>
  );
}
