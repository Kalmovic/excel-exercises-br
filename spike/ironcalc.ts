import { readFileSync, writeFileSync } from "node:fs";
import { Model } from "@ironcalc/nodejs";
import { avaliar, lerEntrada, pos, type Item, type Motor } from "./comum";

const motor: Motor = {
  nome: "IronCalc",
  rodar(item) {
    const m = new Model("w", "en", "UTC", "en");
    const pôr = (end: string, bruto: string) => {
      const p = pos(end);
      const e = lerEntrada(bruto);
      m.setUserInput(0, p.linha, p.coluna, e.tipo === "formula" ? e.ingles : e.tipo === "numero" ? String(e.valor) : e.valor);
    };
    for (const [end, bruto] of Object.entries(item.celulas)) pôr(end, bruto);
    for (const [end, f] of Object.entries(item.formulas)) pôr(end, f);
    m.evaluate();
    return (end, dl = 0, dc = 0) => {
      const p = pos(end);
      const v = m.getCellValue(0, p.linha + dl, p.coluna + dc);
      if (typeof v === "string" && /^#[A-Z/0!?.]+[!?A]?$/.test(v)) return { erro: v };
      return v === "" ? null : v;
    };
  },
};

const itens = JSON.parse(readFileSync("corpus.json", "utf8")) as Item[];
const r = avaliar(motor, itens);
console.log(`${motor.nome}: ${r.ok}/${r.total} células certas (${((r.ok / r.total) * 100).toFixed(1)}%)`);
writeFileSync("falhas-ironcalc.json", JSON.stringify(r.falhas, null, 1));
