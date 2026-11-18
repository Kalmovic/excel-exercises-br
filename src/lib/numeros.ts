import { MODULOS, exercicios, exerciciosDoModulo, testeDoModulo } from "@/content";
import { QUESTOES_CONCURSO } from "@/content/concurso";
import { SIMULADOS } from "@/content/simulados";

/**
 * Tudo o que as páginas prometem, contado do conteúdo de verdade. Cada número
 * tem um nome só e é usado com o mesmo nome em todas as páginas: assim a home,
 * a trilha e o /pro nunca discordam ("230 ou 300? 14 ou 15?").
 */
export function numerosDoConteudo() {
  const naTrilha = exercicios.filter((e) => !e.extra && !e.teste);
  const alemDoIntro = MODULOS.filter((m) => m.slug !== "intro");
  const comTeste = MODULOS.filter((m) => testeDoModulo(m.slug).length > 0);
  return {
    /** Todos os módulos da trilha, do 0 (Intro) ao último. */
    modulos: MODULOS.length,
    /** Módulos depois do Intro (o Intro é todo grátis). */
    modulosAlemDoIntro: alemDoIntro.length,
    ultimoModulo: MODULOS[MODULOS.length - 1]?.numero ?? 0,
    /** Lições dos módulos depois do Intro (cada uma com até 5 questões). */
    licoes: alemDoIntro.reduce((s, m) => s + exerciciosDoModulo(m.slug).length, 0),
    /** Exercícios do Intro. */
    exerciciosIntro: naTrilha.filter((e) => e.modulo === "intro").length,
    /** Questões de lição depois do Intro: as grátis (1ª lição de cada módulo) e as Pro. */
    questoesLicao: naTrilha.filter((e) => e.modulo !== "intro").length,
    questoesLicaoGratis: naTrilha.filter((e) => e.modulo !== "intro" && e.plano === "free").length,
    questoesLicaoPro: naTrilha.filter((e) => e.modulo !== "intro" && e.plano === "pro").length,
    /** Testes de módulo: um por módulo que tem teste (o do Intro é grátis). */
    testes: comTeste.length,
    testesPro: comTeste.filter((m) => testeDoModulo(m.slug).some((q) => q.plano === "pro")).length,
    extras: exercicios.filter((e) => e.extra).length,
    simulados: SIMULADOS.length,
    questoesConcurso: QUESTOES_CONCURSO.length,
  };
}

export type NumerosDoConteudo = ReturnType<typeof numerosDoConteudo>;
