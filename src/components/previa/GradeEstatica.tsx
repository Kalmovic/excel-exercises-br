import { colunaParaLetras } from "@/engine/address";
import { ALTURA, LARGURA_CABECALHO, type GradeMontada } from "./montar";

const ALINHAR = { esquerda: "left", direita: "right", centro: "center" } as const;

/**
 * A grade como HTML puro (tabela de verdade, para leitores de tela e buscadores),
 * com as mesmas medidas da grade interativa.
 */
export function GradeEstatica({ grade, solucao = false }: { grade: GradeMontada; solucao?: boolean }) {
  const largura = LARGURA_CABECALHO + grade.larguras.reduce((a, b) => a + b, 0);
  const borda = "border-r border-b border-zinc-300";
  return (
    <div className="overflow-auto rounded-md border border-zinc-300 bg-white shadow-sm" data-testid={solucao ? "tabela-solucao" : "grade-estatica"}>
      <table
        className="table-fixed border-separate border-spacing-0 font-[Calibri,Carlito,Arial,sans-serif] text-[13px]"
        style={{ width: largura }}
      >
        <colgroup>
          <col style={{ width: LARGURA_CABECALHO }} />
          {grade.larguras.map((w, c) => (
            <col key={c} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ height: ALTURA }}>
            <td className={`${borda} bg-header p-0`} />
            {grade.larguras.map((_, c) => (
              <th key={c} scope="col" className={`${borda} bg-header p-0 font-normal text-zinc-500`}>
                {colunaParaLetras(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.linhas.map((linha, l) => (
            <tr key={l} style={{ height: ALTURA }}>
              <th scope="row" className={`${borda} bg-header p-0 font-normal text-zinc-500`}>
                {l + 1}
              </th>
              {linha.map((cel) => (
                <td
                  key={cel.end}
                  className={`overflow-hidden border-r border-b border-line px-1 py-0 leading-[25px] whitespace-nowrap ${cel.alvo && solucao ? "" : "text-zinc-900"} ${
                    cel.alvo ? (solucao ? "bg-success-bg font-medium text-success" : "bg-accent-soft") : "bg-white"
                  } ${cel.negrito ? "font-bold" : ""}`}
                  style={{ textAlign: ALINHAR[cel.alinh], maxWidth: 0 }}
                >
                  {cel.texto}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
