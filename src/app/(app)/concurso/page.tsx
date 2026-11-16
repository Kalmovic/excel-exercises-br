import type { Metadata } from "next";
import { ListaConcurso } from "@/components/simulador/ListaConcurso";
import { BANCAS, QUESTOES_CONCURSO, TEMAS_CONCURSO } from "@/content/concurso";

export const metadata: Metadata = {
  title: "Questões de Excel para concurso",
  description: "Questões de Excel no estilo de FCC, Cesgranrio, Vunesp, FGV e Cebraspe, com a planilha ao lado para testar a resposta.",
  robots: { index: false, follow: true },
};

export default function Pagina() {
  const itens = QUESTOES_CONCURSO.map((q) => ({
    slug: q.slug,
    titulo: q.titulo,
    banca: q.banca,
    tema: q.tema,
    versao: q.versao,
    certoErrado: q.opcoes.length === 2,
  }));
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold">Pro</span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Excel para concurso</h1>
        <p className="text-lg text-muted">
          Questões no formato das bancas, com uma diferença que a prova não tem: a planilha ao lado. Teste as alternativas antes de responder e
          entenda por que cada uma está certa ou errada.
        </p>
        <p className="text-sm text-muted">
          Todas as questões são inéditas, escritas no estilo de cada banca. Nenhuma é cópia de prova.
        </p>
      </header>
      <ListaConcurso itens={itens} bancas={BANCAS} temas={TEMAS_CONCURSO} />
    </div>
  );
}
