import type { ExercicioDoTipo } from "@/content/schema";
import { normalizarIntervalo } from "@/engine/address";
import { falhou, ok, type EstadoCorrecao, type Resultado } from "../tipos";

export function validarClickCell(ex: ExercicioDoTipo<"click_cell">, e: EstadoCorrecao): Resultado {
  const alvo = normalizarIntervalo(ex.celula);
  if (normalizarIntervalo(e.ativa) !== alvo) {
    return falhou({
      celula: ex.celula,
      motivo: "celula-errada",
      mensagem: `A célula ativa agora é ${normalizarIntervalo(e.ativa)}. Confira a letra da coluna e o número da linha.`,
    });
  }
  if (ex.inputMethod === "keyboard" && e.mudancasPeloMouse > 0) {
    return falhou({
      celula: ex.celula,
      motivo: "usou-mouse",
      mensagem: "Você chegou lá, mas usou o mouse. Clique em Recomeçar e use só as setas do teclado.",
    });
  }
  return ok();
}
