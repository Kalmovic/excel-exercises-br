import { ListaExercicios } from "@/components/site/ListaExercicios";
import { MODULOS, exercicios } from "@/content";

export default function Home() {
  const modulo = MODULOS[0];
  const itens = exercicios
    .filter((e) => e.modulo === modulo.slug)
    .map(({ slug, titulo, ordem, nivel, versao }) => ({ slug, titulo, ordem, nivel, versao }));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Aprenda Excel fazendo.</h1>
        <p className="text-lg text-zinc-600">
          Exercícios numa planilha de verdade, no navegador, com as fórmulas do Excel em português:{" "}
          <code className="font-mono text-emerald-800">=SOMA(B2:B7)</code>,{" "}
          <code className="font-mono text-emerald-800">=PROCV(A2;Tabela;2;FALSO)</code>. Você digita, a
          correção é na hora.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>✓ Separador <code>;</code> e decimal com vírgula, como no Excel brasileiro</li>
          <li>✓ Dicas progressivas e explicação depois de acertar</li>
          <li>✓ Seu progresso fica salvo neste navegador</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Módulo 1: {modulo.titulo}</h2>
        <p className="mb-4 text-zinc-600">{modulo.descricao}</p>
        <ListaExercicios itens={itens} />
      </section>
    </div>
  );
}
