import type { Metadata } from "next";
import { EmitirPendente } from "@/components/conta/EmitirPendente";

export const metadata: Metadata = { title: "Emitir certificado", robots: { index: false, follow: false } };

export default function Pagina() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Emitir certificado</h1>
      <p className="text-muted">
        O certificado sai para quem passou no teste do módulo. Conferimos suas respostas de novo no servidor e geramos um código
        que qualquer pessoa pode verificar. Confira o nome antes de emitir: depois de emitido, ele não muda.
      </p>
      <EmitirPendente />
    </div>
  );
}
