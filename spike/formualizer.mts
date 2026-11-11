import { readFileSync, writeFileSync } from "node:fs";
import init, { Workbook } from "formualizer";
import { avaliar, lerEntrada, pos, type Item, type Motor } from "./comum.ts";

await (init as unknown as () => Promise<void>)?.();

const conv = (v: unknown): number | string | boolean | null | { erro: string } => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("error" in o || "kind" in o || "type" in o) return { erro: String(o.error ?? o.kind ?? o.type) };
    return { erro: JSON.stringify(v).slice(0, 30) };
  }
  if (typeof v === "string" && /^#[A-Z/0!?.]+[!?A]?$/.test(v)) return { erro: v };
  return v as number | string | boolean;
};

const motor: Motor = {
  nome: "Formualizer",
  rodar(item) {
    const wb = new Workbook();
    wb.addSheet("S");
    const pôr = (end: string, bruto: string) => {
      const p = pos(end);
      const e = lerEntrada(bruto);
      if (e.tipo === "formula") wb.setFormula("S", p.linha, p.coluna, e.ingles);
      else wb.setValue("S", p.linha, p.coluna, e.valor);
    };
    for (const [end, bruto] of Object.entries(item.celulas)) pôr(end, bruto);
    for (const [end, f] of Object.entries(item.formulas)) pôr(end, f);
    wb.evaluateAll();
    const sh = wb.sheet("S");
    return (end, dl = 0, dc = 0) => {
      const p = pos(end);
      return conv(sh.getValue(p.linha + dl, p.coluna + dc));
    };
  },
};

const itens = JSON.parse(readFileSync("corpus.json", "utf8")) as Item[];
const r = avaliar(motor, itens);
console.log(`${motor.nome}: ${r.ok}/${r.total} células certas (${((r.ok / r.total) * 100).toFixed(1)}%)`);
writeFileSync("falhas-formualizer.json", JSON.stringify(r.falhas, null, 1));
