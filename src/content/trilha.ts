import { exerciciosDoModulo, moduloPorSlug, proximoModulo, type Modulo } from "./index";
import { exercicioLiberado } from "@/lib/acesso-conteudo";

/** Dados do módulo do exercício: progresso, troféu e para onde ir depois. */
export type Trilha = {
  modulo: string;
  titulo: string;
  permitePular: boolean;
  trofeu: Modulo["trofeu"];
  itens: { slug: string; versao: number }[];
  proximoModulo?: { titulo: string; href: string };
};

/** Dados do módulo que a página do exercício passa para o simulador e a barra de progresso. */
export function dadosDaTrilha(slugModulo: string) {
  const modulo = moduloPorSlug(slugModulo);
  if (!modulo) throw new Error(`Módulo desconhecido: ${slugModulo}`);
  const lista = exerciciosDoModulo(slugModulo).filter(exercicioLiberado);
  const prox = proximoModulo(slugModulo);
  const simulador: Trilha = {
    modulo: modulo.slug,
    titulo: modulo.titulo,
    permitePular: modulo.permitePular,
    trofeu: modulo.trofeu,
    itens: lista.map((e) => ({ slug: e.slug, versao: e.versao })),
    proximoModulo: prox
      ? { titulo: prox.modulo.titulo, href: `/exercicios/${prox.primeiro.slug}` }
      : undefined,
  };
  return {
    simulador,
    itensComTitulo: lista.map((e) => ({ slug: e.slug, titulo: e.titulo, versao: e.versao })),
  };
}
