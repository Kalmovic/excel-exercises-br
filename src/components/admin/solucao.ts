import type { Exercicio, Valor } from "@/content/schema";
import { deIntervalo } from "@/engine/address";
import type { Planilha } from "@/engine/engine";
import type { StoreSimulador } from "@/components/simulador/store";

/** Valor esperado escrito como o aluno digitaria (vírgula decimal, data dd/mm/aaaa). */
function comoDigitado(v: Valor): string {
  if (v === null) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "boolean") return v ? "VERDADEIRO" : "FALSO";
  if (typeof v === "object") return v.data.split("-").reverse().join("/");
  return v;
}

/** Deixa a tela no estado que acerta o exercício, para testar a correção. */
export function preencherSolucao(ex: Exercicio, planilha: Planilha, store: StoreSimulador) {
  switch (ex.type) {
    case "formula":
      planilha.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
      return;
    case "type_value":
      planilha.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: comoDigitado(a.esperado) })));
      return;
    case "format_cell":
      for (const a of ex.alvos) planilha.formatar(deIntervalo(a.intervalo), a.formato);
      return;
    case "text_answer":
      store.getState().setResposta(ex.aceitas[0]);
      return;
    case "click_cell": {
      // Direto no estado: não conta como mudança pelo mouse e ignora a seleção travada.
      const p = deIntervalo(ex.celula).inicio;
      store.setState({ ancora: p, foco: p });
      return;
    }
    case "select_range": {
      const i = deIntervalo(ex.intervalo);
      store.setState({ ancora: i.inicio, foco: i.fim });
      return;
    }
  }
}
