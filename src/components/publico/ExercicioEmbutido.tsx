import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { exercicioPorSlug, proximoExercicio } from "@/content";
import { dadosDaTrilha } from "@/content/trilha";

/** Um exercício grátis da trilha, jogável na própria página (e no HTML, para o Google). */
export function ExercicioEmbutido({ slug }: { slug: string }) {
  const ex = exercicioPorSlug(slug);
  if (!ex || ex.plano !== "free") throw new Error(`Exercício embutido precisa ser grátis: ${slug}`);
  const prox = proximoExercicio(slug);
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm" data-testid="exercicio-embutido">
      <h2 className="text-lg font-semibold">Experimente agora: {ex.titulo}</h2>
      <SimuladorCarregavel
        exercicio={ex}
        previa={<PreviaExercicio exercicio={ex} />}
        proximo={prox ? { slug: prox.slug, titulo: prox.titulo } : undefined}
        trilha={dadosDaTrilha(ex.modulo).simulador}
      />
    </section>
  );
}
