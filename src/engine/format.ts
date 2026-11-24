import type { Formato } from "@/content/schema";

export type ValorCelula = number | string | boolean | null | { erro: string };
export type TipoDetalhado =
  | "NUMBER_RAW"
  | "NUMBER_DATE"
  | "NUMBER_TIME"
  | "NUMBER_DATETIME"
  | "NUMBER_CURRENCY"
  | "NUMBER_PERCENT"
  | "STRING"
  | "BOOLEAN"
  | "ERROR"
  | "EMPTY";

const EPOCA = Date.UTC(1899, 11, 30);
const DIA = 86_400_000;

export function serialParaData(serial: number): Date {
  return new Date(EPOCA + Math.round(serial * DIA));
}

export function dataIsoParaSerial(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - EPOCA) / DIA);
}

const fmtGeral = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10, useGrouping: false });
const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 });

function formatarData(serial: number) {
  const d = serialParaData(serial);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Hora como o formato h:mm do Excel: a parte fracionária do dia (passou de
 * 24 horas, "vira o dia", como no Excel sem [h]). Negativa: ########.
 */
function formatarHora(serial: number) {
  if (serial < 0) return "########";
  const s = Math.round((serial - Math.floor(serial)) * 86400) % 86400;
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(Math.floor(s / 3600))}:${dois(Math.floor((s % 3600) / 60))}`;
}

export function formatarValor(valor: ValorCelula, tipo: TipoDetalhado, formato?: Formato): string {
  if (valor === null) return "";
  if (typeof valor === "object") return valor.erro;
  if (typeof valor === "boolean") return valor ? "VERDADEIRO" : "FALSO";
  if (typeof valor === "string") return valor;

  const f = formato ?? "geral";
  if (typeof f === "object") {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: f.casas,
      maximumFractionDigits: f.casas,
    }).format(valor);
  }
  if (f === "moeda" || (f === "geral" && tipo === "NUMBER_CURRENCY")) return fmtMoeda.format(valor);
  if (f === "percentual" || (f === "geral" && tipo === "NUMBER_PERCENT")) return fmtPct.format(valor);
  if (f === "data" || (f === "geral" && tipo === "NUMBER_DATE")) return formatarData(valor);
  if (f === "geral" && tipo === "NUMBER_TIME") return formatarHora(valor);
  // Excel mostra no máximo ~11 caracteres em "Geral"; arredondamos ruído de ponto flutuante.
  return fmtGeral.format(Number(valor.toPrecision(12)));
}

export function alinhamento(valor: ValorCelula): "esquerda" | "direita" | "centro" {
  if (typeof valor === "number") return "direita";
  if (typeof valor === "boolean" || (valor !== null && typeof valor === "object")) return "centro";
  return "esquerda";
}
