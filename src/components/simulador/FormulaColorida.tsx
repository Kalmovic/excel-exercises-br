import { CORES_REFERENCIA, type ReferenciaNaFormula } from "@/engine/referencias";

/** O texto da fórmula com cada referência na sua cor (camada por cima do input, que fica com o texto transparente). */
export function FormulaColorida({ texto, refs }: { texto: string; refs: ReferenciaNaFormula[] }) {
  const partes: React.ReactNode[] = [];
  let i = 0;
  for (const r of refs) {
    if (r.inicio > i) partes.push(texto.slice(i, r.inicio));
    partes.push(
      <span key={r.inicio} style={{ color: CORES_REFERENCIA[r.cor] }}>
        {r.texto}
      </span>,
    );
    i = r.fim;
  }
  partes.push(texto.slice(i));
  return <>{partes}</>;
}
