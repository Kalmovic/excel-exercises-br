/**
 * Datas no fuso de São Paulo. O "dia" do desafio vira à meia-noite de
 * Brasília para todo mundo, não no fuso de quem acessa.
 */
const FUSO = "America/Sao_Paulo";

const partes = (agora: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );

/** "2026-11-10" */
export function hojeSP(agora = new Date()): string {
  const p = partes(agora);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Segundos que faltam até a meia-noite de São Paulo. */
export function segundosAteMeiaNoiteSP(agora = new Date()): number {
  const p = partes(agora);
  return 86_400 - (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second));
}

/** "2026-11-10" -> "10/11/2026" */
export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** Dias corridos de `de` até `ate` (datas ISO). */
export function diasEntre(de: string, ate: string): number {
  const utc = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

export const ehDataISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** "2026-11-10" + 1 -> "2026-11-11" */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}
