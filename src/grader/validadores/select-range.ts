import type { ExercicioDoTipo } from "@/content/schema";
import { normalizarIntervalo } from "@/engine/address";
import { falhou, ok, type EstadoCorrecao, type Resultado } from "../tipos";

export function validarSelectRange(ex: ExercicioDoTipo<"select_range">, e: EstadoCorrecao): Resultado {
  const esperado = normalizarIntervalo(ex.intervalo);
  const atual = normalizarIntervalo(e.selecao);
  if (atual === esperado) return ok();
  return falhou({
    celula: esperado,
    motivo: "selecao-errada",
    mensagem: atual.includes(":")
      ? `Você selecionou ${atual}. O pedido é ${esperado}.`
      : `Só a célula ${atual} está selecionada. Arraste o mouse ou use Shift + setas para selecionar ${esperado}.`,
  });
}
