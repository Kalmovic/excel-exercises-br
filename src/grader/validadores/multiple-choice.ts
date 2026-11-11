import type { ExercicioDoTipo } from "@/content/schema";
import { falhou, ok, type EstadoCorrecao, type Resultado } from "../tipos";

/** A resposta é o índice da alternativa escolhida, guardado como texto em `resposta`. */
export function validarMultipleChoice(ex: ExercicioDoTipo<"multiple_choice">, e: EstadoCorrecao): Resultado {
  if (e.resposta === "") {
    return falhou({ celula: "", motivo: "sem-resposta", mensagem: "Escolha uma das alternativas." });
  }
  const i = Number(e.resposta);
  if (i === ex.correta) return ok();
  return falhou({
    celula: "",
    motivo: "resposta",
    mensagem: ex.opcoes[i]?.dica ?? "Ainda não é essa. Releia a pergunta e tente outra alternativa.",
  });
}
