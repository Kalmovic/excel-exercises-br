"use client";

import { useState } from "react";

/** LinkedIn (perfil e post), copiar link e salvar em PDF. Somem na impressão. */
export function AcoesCertificado({ linkedin, compartilhar, url }: { linkedin: string; compartilhar: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  const botao = "rounded-lg px-4 py-2.5 font-semibold";
  return (
    <div className="flex flex-wrap gap-3 print:hidden" data-testid="acoes-certificado">
      <a href={linkedin} target="_blank" rel="noopener noreferrer" className={`${botao} bg-[#0a66c2] text-white hover:brightness-110`}>
        Adicionar ao perfil do LinkedIn
      </a>
      <a
        href={compartilhar}
        target="_blank"
        rel="noopener noreferrer"
        className={`${botao} border border-[#0a66c2] bg-white text-[#0a66c2] hover:bg-[#0a66c2]/5`}
        data-testid="compartilhar-linkedin"
      >
        Compartilhar no LinkedIn
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {}
        }}
        className={`${botao} border border-line bg-white hover:bg-bg`}
      >
        {copiado ? "Link copiado ✓" : "Copiar link"}
      </button>
      <button type="button" onClick={() => window.print()} className={`${botao} border border-line bg-white hover:bg-bg`}>
        Salvar em PDF
      </button>
    </div>
  );
}
