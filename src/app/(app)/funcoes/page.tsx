import type { Metadata } from "next";
import { EmBreve } from "@/components/site/EmBreve";

export const metadata: Metadata = { title: "Funções de A a Z", robots: { index: false, follow: true } };

export default function Pagina() {
  return (
    <EmBreve titulo="Funções de A a Z">
      <p>Uma página para cada função do Excel em português, com explicação e um exercício para praticar na hora. Por enquanto, comece pelo guia de Excel básico para iniciantes.</p>
    </EmBreve>
  );
}
