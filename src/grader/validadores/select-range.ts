import type { ExercicioDoTipo } from "@/content/schema";
import { normalizarIntervalo } from "@/engine/address";
import { falhou, ok, type EstadoCorrecao, type Resultado } from "../tipos";

/** O jeito de selecionar que o aparelho tem: no celular não há mouse nem Shift. */
function comoSelecionar(intervalo: string, toque?: boolean) {
  if (!toque) return `Arraste o mouse ou use Shift + setas para selecionar ${intervalo}.`;
  const [ini, fim] = intervalo.split(":");
  return `Toque em ▦ Selecionar intervalo e depois em ${ini} e ${fim ?? ini}.`;
}

export function validarSelectRange(ex: ExercicioDoTipo<"select_range">, e: EstadoCorrecao): Resultado {
  const esperado = normalizarIntervalo(ex.intervalo);
  const atual = normalizarIntervalo(e.selecao);
  if (atual === esperado) return ok();
  return falhou({
    celula: esperado,
    motivo: "selecao-errada",
    mensagem: atual.includes(":")
      ? `Você selecionou ${atual}. O pedido é ${esperado}.`
      : `Só a célula ${atual} está selecionada. ${comoSelecionar(esperado, e.semTecladoFisico)}`,
  });
}
