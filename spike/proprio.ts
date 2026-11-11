import { readFileSync, writeFileSync } from "node:fs";
import { avaliar, lerEntrada, pos, type Item, type Motor } from "./comum";
import { PlanilhaPropria } from "./proprio/motor";

const motor: Motor = {
  nome: "Motor próprio",
  rodar(item) {
    const p = new PlanilhaPropria();
    const pôr = (end: string, bruto: string) => {
      const q = pos(end);
      const e = lerEntrada(bruto);
      p.definir(q.linha - 1, q.coluna - 1, e.tipo === "formula" ? { formula: bruto.trim() } : e.valor);
    };
    for (const [end, bruto] of Object.entries(item.celulas)) pôr(end, bruto);
    for (const [end, f] of Object.entries(item.formulas)) pôr(end, f);
    return (end, dl = 0, dc = 0) => { const q = pos(end); return p.ler(q.linha - 1 + dl, q.coluna - 1 + dc); };
  },
};
const itens = JSON.parse(readFileSync("corpus.json", "utf8")) as Item[];
const r = avaliar(motor, itens);
console.log(`${motor.nome}: ${r.ok}/${r.total} células certas (${((r.ok / r.total) * 100).toFixed(1)}%)`);
writeFileSync("falhas-proprio.json", JSON.stringify(r.falhas, null, 1));
