import type { ExercicioDoTipo } from "@/content/schema";
import { deIntervalo, paraEndereco, posicoes } from "@/engine/address";
import { falhou, ok, type EstadoCorrecao, type Falha, type Resultado } from "../tipos";

const NOME = { moeda: "moeda (R$)", percentual: "porcentagem (%)" } as const;

export function validarFormatCell(ex: ExercicioDoTipo<"format_cell">, e: EstadoCorrecao): Resultado {
  const falhas: Falha[] = [];
  for (const alvo of ex.alvos) {
    const faltando = [...posicoes(deIntervalo(alvo.intervalo))]
      .map(paraEndereco)
      .filter((end) => e.formato(end) !== alvo.formato);
    if (faltando.length > 0) {
      falhas.push({
        celula: alvo.intervalo,
        motivo: "formato",
        mensagem:
          faltando.length === 1
            ? `${faltando[0]} ainda não está formatada como ${NOME[alvo.formato]}.`
            : `${faltando.join(", ")} ainda não estão formatadas como ${NOME[alvo.formato]}.`,
      });
    }
  }
  return falhas.length ? falhou(...falhas) : ok();
}
