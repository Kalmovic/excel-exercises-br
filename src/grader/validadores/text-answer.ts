import type { ExercicioDoTipo } from "@/content/schema";
import { falhou, ok, type EstadoCorrecao, type Resultado } from "../tipos";

type Ex = ExercicioDoTipo<"text_answer">;

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Deixa duas respostas equivalentes iguais, conforme o tipo de resposta. */
export function normalizarResposta(texto: string, modo: Ex["normalizar"]): string {
  const t = texto.trim();
  switch (modo) {
    case "endereco":
      // " e 4 " -> "E4"; "$E$4" -> "E4"
      return t.toUpperCase().replace(/[\s$]/g, "");
    case "formula":
      // "= b4 + c4" -> "B4+C4"; o "=" é opcional
      return t.toUpperCase().replace(/\s/g, "").replace(/^=/, "");
    case "texto":
      return semAcento(t.toLowerCase()).replace(/\s+/g, " ");
  }
}

export function validarTextAnswer(ex: Ex, e: EstadoCorrecao): Resultado {
  if (e.resposta.trim() === "") {
    return falhou({
      celula: "",
      motivo: "sem-resposta",
      mensagem: "Escreva sua resposta no campo acima da planilha.",
    });
  }
  const resposta = normalizarResposta(e.resposta, ex.normalizar);
  if (ex.aceitas.some((a) => normalizarResposta(a, ex.normalizar) === resposta)) return ok();

  // Erro comum: inverter linha e coluna ("4E" em vez de "E4").
  if (ex.normalizar === "endereco" && /^\d+[A-Z]+$/.test(resposta)) {
    return falhou({
      celula: "",
      motivo: "resposta",
      mensagem: "Quase: no endereço, a letra da coluna vem primeiro e depois o número da linha.",
    });
  }
  return falhou({ celula: "", motivo: "resposta", mensagem: `"${e.resposta.trim()}" ainda não é a resposta.` });
}
