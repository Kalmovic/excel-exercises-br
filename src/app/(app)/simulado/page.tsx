import type { Metadata } from "next";
import { CartoesSimulados } from "@/components/simulador/CartoesSimulados";
import { SIMULADOS } from "@/content/simulados";

export const metadata: Metadata = {
  title: "Simulado de teste de Excel para vagas",
  description: "Treine para o teste prático de Excel do processo seletivo: tarefas numa planilha de empresa, com tempo marcado e resultado na hora.",
  robots: { index: false, follow: true },
};

export default function Pagina() {
  const resumo = SIMULADOS.map(({ slug, titulo, cenario, descricao, temas, minutos, aprovacao, questoes }) => ({
    slug,
    titulo,
    cenario,
    descricao,
    temas,
    minutos,
    aprovacao,
    tarefas: questoes.length,
  }));
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold">Pro</span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Simulado de teste de Excel</h1>
        <p className="text-lg text-muted">
          Muitas vagas pedem um teste prático de Excel. Aqui você faz um igual: uma planilha da empresa, várias tarefas, tempo correndo e nenhuma
          dica. No fim, sua nota e a resolução de cada tarefa.
        </p>
      </header>
      <CartoesSimulados simulados={resumo} />
    </div>
  );
}
