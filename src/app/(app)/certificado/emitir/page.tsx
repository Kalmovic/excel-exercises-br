import type { Metadata } from "next";
import { EmitirPendente } from "@/components/conta/EmitirPendente";

export const metadata: Metadata = { title: "Emitir certificado", robots: { index: false, follow: false } };

export default function Pagina() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Emitir certificado</h1>
      <EmitirPendente />
    </div>
  );
}
