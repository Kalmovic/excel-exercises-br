import type { Metadata } from "next";
import { EmBreve } from "@/components/site/EmBreve";

export const metadata: Metadata = { title: "Termos de uso", robots: { index: false, follow: true } };

export default function Pagina() {
  return (
    <EmBreve titulo="Termos de uso">
      <p>Os termos de uso estão sendo preparados e serão publicados antes do lançamento do plano Pro.</p>
    </EmBreve>
  );
}
