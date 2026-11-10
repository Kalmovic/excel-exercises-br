import type { ExercicioDoTipo } from "@/content/schema";
import { falhou, iguais, ok, TOLERANCIA_PADRAO, type EstadoCorrecao, type Falha, type Resultado } from "../tipos";

export function validarTypeValue(ex: ExercicioDoTipo<"type_value">, e: EstadoCorrecao): Resultado {
  const falhas: Falha[] = [];
  for (const alvo of ex.alvos) {
    const v = e.valor(alvo.celula);
    if (v === null || v === "") {
      falhas.push({ celula: alvo.celula, motivo: "vazia", mensagem: `A célula ${alvo.celula} ainda está vazia.` });
    } else if (!iguais(v, alvo.esperado, alvo.tolerancia ?? TOLERANCIA_PADRAO)) {
      falhas.push({
        celula: alvo.celula,
        motivo: "valor",
        mensagem: `${alvo.celula} mostra "${e.exibicao(alvo.celula)}", que não é o valor pedido.`,
      });
    }
  }
  return falhas.length ? falhou(...falhas) : ok();
}
