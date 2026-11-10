import type { Preferencias, ProgressoExercicio } from "./progresso";

export type ItemTrilha = { slug: string; titulo: string; modulo: string; versao: number };

export type Inicio =
  | { tipo: "novo"; intro: ItemTrilha; fundamentos: ItemTrilha }
  | { tipo: "novo-sem-intro"; intro: ItemTrilha; fundamentos: ItemTrilha }
  | { tipo: "continuar"; alvo: ItemTrilha }
  | { tipo: "concluido" };

/**
 * Decide o botão principal da página inicial. Função pura: recebe a trilha
 * na ordem, o progresso e as preferências.
 *
 * Regra principal: quem já tem progresso nunca é mandado de volta ao Intro.
 * "Continuar" aponta para o módulo em que a pessoa mexeu por último.
 */
export function escolherInicio(
  trilha: ItemTrilha[],
  progresso: Record<string, ProgressoExercicio>,
  prefs: Preferencias,
  moduloIntro = "intro",
): Inicio {
  const intro = trilha.find((i) => i.modulo === moduloIntro) ?? trilha[0];
  const fundamentos = trilha.find((i) => i.modulo !== moduloIntro) ?? trilha[0];
  const valido = (i: ItemTrilha) => progresso[i.slug]?.versao === i.versao;
  const status = (i: ItemTrilha) => (valido(i) ? progresso[i.slug].status : undefined);

  const comProgresso = trilha.filter(valido);
  if (comProgresso.length === 0) {
    return prefs.pularIntro ? { tipo: "novo-sem-intro", intro, fundamentos } : { tipo: "novo", intro, fundamentos };
  }

  const recente = [...comProgresso].sort((a, b) =>
    progresso[b.slug].atualizadoEm.localeCompare(progresso[a.slug].atualizadoEm),
  )[0];
  const ordemModulos = [...new Set(trilha.map((i) => i.modulo))];
  const daqui = ordemModulos.slice(ordemModulos.indexOf(recente.modulo));

  for (const modulo of daqui) {
    const doModulo = trilha.filter((i) => i.modulo === modulo);
    const alvo =
      doModulo.find((i) => status(i) === undefined || status(i) === "em-andamento") ??
      doModulo.find((i) => status(i) === "pulado");
    if (alvo) return { tipo: "continuar", alvo };
  }
  return { tipo: "concluido" };
}
