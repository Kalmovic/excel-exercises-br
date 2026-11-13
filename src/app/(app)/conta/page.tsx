import type { Metadata } from "next";
import { PainelConta } from "@/components/conta/PainelConta";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default function Pagina() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Minha conta</h1>
      <PainelConta />
    </div>
  );
}
