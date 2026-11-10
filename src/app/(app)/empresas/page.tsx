import type { Metadata } from "next";
import { EmBreve } from "@/components/site/EmBreve";

export const metadata: Metadata = { title: "Para empresas", robots: { index: false, follow: true } };

export default function Pagina() {
  return (
    <EmBreve titulo="Planilhês para empresas">
      <p>Nivelamento da equipe, painel do gestor e testes de Excel para processos seletivos estão a caminho. Enquanto isso, a trilha e o desafio do dia estão abertos para todo mundo.</p>
    </EmBreve>
  );
}
