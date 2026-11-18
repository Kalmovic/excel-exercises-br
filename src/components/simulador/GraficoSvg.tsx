import type { Formato, TipoGrafico } from "@/content/schema";
import { eixo, type DadosGrafico } from "@/engine/grafico";

/** As cores do tema padrão do Excel, na ordem das séries. */
export const CORES_SERIE = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", "#264478", "#9E480E"];

const num = (n: number, casas: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 }).format(n);

/** Número do rótulo ou do eixo, com o formato da origem (R$, %). */
export function formatarNoGrafico(v: number, formato?: Formato, curto = false): string {
  const casas = curto || Math.abs(v) >= 100 ? 0 : 2;
  // Centavos só em valores pequenos: "R$ 48.000" cabe em cima da coluna, "R$ 48.000,00" não.
  if (formato === "moeda") return `R$ ${num(v, curto || Math.abs(v) >= 100 ? 0 : 2)}`;
  if (formato === "percentual") return `${num(v * 100, curto ? 0 : 1)}%`;
  return num(v, casas);
}

type Props = {
  dados: DadosGrafico;
  tipo: TipoGrafico;
  titulo: string;
  rotulos: boolean;
  largura: number;
  altura: number;
};

/**
 * O gráfico desenhado em SVG, no estilo do Excel: título em cima, eixo de
 * valores com linhas de grade, legenda embaixo. Sem biblioteca.
 */
export function GraficoSvg({ dados, tipo, titulo, rotulos, largura: W, altura: H }: Props) {
  const fonte = "Calibri, Carlito, Arial, sans-serif";
  if (dados.erro)
    return (
      <svg width={W} height={H} role="img" aria-label="Gráfico sem dados" style={{ fontFamily: fonte }}>
        <rect width={W} height={H} fill="#fff" />
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill="#888">
          {dados.erro}
        </text>
      </svg>
    );

  // Como o Excel: uma série só vira o título quando ninguém escreveu um.
  const tituloMostrado = titulo.trim() || (dados.series.length === 1 && tipo !== "pizza" ? dados.series[0].nome : tipo === "pizza" ? dados.series[0]?.nome : "Título do Gráfico");
  const tituloVazio = !titulo.trim() && dados.series.length !== 1 && tipo !== "pizza";
  const comLegenda = tipo === "pizza" || dados.series.length > 1;
  const topo = 34;
  const base = comLegenda ? 30 : 10;

  return (
    <svg width={W} height={H} role="img" aria-label={`Gráfico de ${tipo}: ${tituloMostrado}. ${resumoDosDados(dados)}`} style={{ fontFamily: fonte }} data-testid="grafico-svg">
      <rect width={W} height={H} fill="#fff" />
      <text x={W / 2} y={22} textAnchor="middle" fontSize={15} fill={tituloVazio ? "#9ca3af" : "#404040"} data-titulo>
        {tituloMostrado}
      </text>
      {tipo === "pizza" ? (
        <Pizza dados={dados} rotulos={rotulos} cx={W / 2} cy={topo + (H - topo - base) / 2} r={Math.min(W, H - topo - base) / 2 - 8} />
      ) : (
        <Eixos dados={dados} tipo={tipo} rotulos={rotulos} x0={8} y0={topo} w={W - 16} h={H - topo - base} />
      )}
      {comLegenda && <Legenda nomes={tipo === "pizza" ? dados.categorias : dados.series.map((s) => s.nome)} W={W} y={H - 12} />}
    </svg>
  );
}

/** Os dados em texto, para o leitor de tela ("Vendas: Jan R$ 100, Fev R$ 200"). Até 12 pontos por série. */
export function resumoDosDados(dados: DadosGrafico): string {
  return dados.series
    .map((s) => {
      const pontos = s.valores
        .slice(0, 12)
        .map((v, i) => `${dados.categorias[i] ?? i + 1} ${v === null ? "vazio" : formatarNoGrafico(v, dados.formato)}`);
      const resto = s.valores.length > 12 ? `, e mais ${s.valores.length - 12}` : "";
      return `${s.nome}: ${pontos.join(", ")}${resto}`;
    })
    .join(". ");
}

function Legenda({ nomes, W, y }: { nomes: string[]; W: number; y: number }) {
  const larguras = nomes.map((n) => 16 + Math.min(n.length, 14) * 6.2 + 10);
  const total = larguras.reduce((a, b) => a + b, 0);
  const inicio = Math.max(4, (W - total) / 2);
  const xs = larguras.map((_, i) => inicio + larguras.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <g fontSize={11} fill="#595959">
      {nomes.map((n, i) => {
        const px = xs[i];
        return (
          <g key={i}>
            <rect x={px} y={y - 8} width={9} height={9} fill={CORES_SERIE[i % CORES_SERIE.length]} />
            <text x={px + 13} y={y}>
              {n.length > 14 ? `${n.slice(0, 13)}…` : n}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Eixos({ dados, tipo, rotulos, x0, y0, w, h }: { dados: DadosGrafico; tipo: TipoGrafico; rotulos: boolean; x0: number; y0: number; w: number; h: number }) {
  const valores = dados.series.flatMap((s) => s.valores).filter((v): v is number => v !== null);
  const max = Math.max(0, ...valores);
  const min = Math.min(0, ...valores);
  const { topo, passo } = eixo(Math.max(max, -min));
  const baixo = min < 0 ? -topo : 0;
  const marcas = Array.from({ length: Math.round((topo - baixo) / passo) + 1 }, (_, i) => baixo + i * passo);
  const rotuloEixo = (v: number) => formatarNoGrafico(v, dados.formato, true);
  const larguraEixo = Math.max(...marcas.map((m) => rotuloEixo(m).length)) * 6 + 8;
  const nCat = dados.categorias.length;
  const nSer = dados.series.length;
  const fmt = (v: number) => formatarNoGrafico(v, dados.formato);

  if (tipo === "barras") {
    // Barras deitadas: categorias de cima para baixo, valores na horizontal.
    const larguraRotulo = Math.min(90, Math.max(...dados.categorias.map((c) => c.length)) * 6 + 8);
    const px = x0 + larguraRotulo, pw = w - larguraRotulo - 6, py = y0, ph = h - 16;
    const X = (v: number) => px + ((v - baixo) / (topo - baixo)) * pw;
    const faixa = ph / Math.max(nCat, 1);
    const grossura = (faixa * 0.65) / Math.max(nSer, 1);
    return (
      <g fontSize={10} fill="#595959">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={X(m)} x2={X(m)} y1={py} y2={py + ph} stroke="#d9d9d9" />
            <text x={X(m)} y={py + ph + 12} textAnchor="middle">
              {rotuloEixo(m)}
            </text>
          </g>
        ))}
        {dados.categorias.map((c, i) => (
          <text key={i} x={px - 4} y={py + faixa * i + faixa / 2 + 3} textAnchor="end">
            {c.length > 14 ? `${c.slice(0, 13)}…` : c}
          </text>
        ))}
        {dados.series.map((s, k) =>
          s.valores.map((v, i) => {
            if (v === null) return null;
            const y = py + faixa * i + faixa * 0.175 + grossura * k;
            const a = X(Math.min(0, v)), b = X(Math.max(0, v));
            return (
              <g key={`${k}-${i}`}>
                <rect x={a} y={y} width={Math.max(0.5, b - a)} height={grossura} fill={CORES_SERIE[k % CORES_SERIE.length]} data-barra-grafico />
                {rotulos && (
                  <text x={b + 3} y={y + grossura / 2 + 3} fontSize={9} data-rotulo-grafico>
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
    );
  }

  const px = x0 + larguraEixo, pw = w - larguraEixo, py = y0, ph = h - 16;
  const Y = (v: number) => py + ph - ((v - baixo) / (topo - baixo)) * ph;
  const faixa = pw / Math.max(nCat, 1);
  const centro = (i: number) => px + faixa * i + faixa / 2;
  const passoRotulo = Math.ceil(nCat / Math.max(1, Math.floor(pw / 46)));
  return (
    <g fontSize={10} fill="#595959">
      {marcas.map((m) => (
        <g key={m}>
          <line x1={px} x2={px + pw} y1={Y(m)} y2={Y(m)} stroke="#d9d9d9" />
          <text x={px - 4} y={Y(m) + 3} textAnchor="end">
            {rotuloEixo(m)}
          </text>
        </g>
      ))}
      {dados.categorias.map((c, i) =>
        i % passoRotulo === 0 ? (
          <text key={i} x={centro(i)} y={py + ph + 12} textAnchor="middle">
            {c.length > 10 ? `${c.slice(0, 9)}…` : c}
          </text>
        ) : null,
      )}
      {tipo === "colunas" &&
        dados.series.map((s, k) =>
          s.valores.map((v, i) => {
            if (v === null) return null;
            const larg = (faixa * 0.65) / nSer;
            const x = px + faixa * i + faixa * 0.175 + larg * k;
            const a = Y(Math.max(0, v)), b = Y(Math.min(0, v));
            return (
              <g key={`${k}-${i}`}>
                <rect x={x} y={a} width={larg} height={Math.max(0.5, b - a)} fill={CORES_SERIE[k % CORES_SERIE.length]} data-barra-grafico />
                {rotulos && (
                  <text x={x + larg / 2} y={a - 3} textAnchor="middle" fontSize={9} data-rotulo-grafico>
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          }),
        )}
      {tipo === "linhas" &&
        dados.series.map((s, k) => {
          const cor = CORES_SERIE[k % CORES_SERIE.length];
          // Célula vazia: a linha se interrompe, como no Excel.
          const trechos: string[] = [];
          let atual = "";
          s.valores.forEach((v, i) => {
            if (v === null) {
              if (atual) trechos.push(atual);
              atual = "";
            } else atual += `${atual ? "L" : "M"}${centro(i)},${Y(v)}`;
          });
          if (atual) trechos.push(atual);
          return (
            <g key={k}>
              {trechos.map((d, j) => (
                <path key={j} d={d} fill="none" stroke={cor} strokeWidth={2.25} strokeLinejoin="round" data-linha-grafico />
              ))}
              {s.valores.map((v, i) =>
                v === null ? null : (
                  <g key={i}>
                    <circle cx={centro(i)} cy={Y(v)} r={2.5} fill={cor} />
                    {rotulos && (
                      <text x={centro(i)} y={Y(v) - 6} textAnchor="middle" fontSize={9} data-rotulo-grafico>
                        {fmt(v)}
                      </text>
                    )}
                  </g>
                ),
              )}
            </g>
          );
        })}
    </g>
  );
}

function Pizza({ dados, rotulos, cx, cy, r }: { dados: DadosGrafico; rotulos: boolean; cx: number; cy: number; r: number }) {
  // Pizza desenha só a primeira série; negativos e vazios ficam de fora.
  const vals = (dados.series[0]?.valores ?? []).map((v) => (v !== null && v > 0 ? v : 0));
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  // Começa no meio-dia, sentido horário, como o Excel.
  const inicios = vals.map((_, i) => -Math.PI / 2 + (vals.slice(0, i).reduce((a, b) => a + b, 0) / total) * Math.PI * 2);
  return (
    <g>
      {vals.map((v, i) => {
        if (v === 0) return null;
        const a0 = inicios[i];
        const a1 = a0 + (v / total) * Math.PI * 2;
        const ponto = (a: number, raio = r) => [cx + raio * Math.cos(a), cy + raio * Math.sin(a)];
        const [x0, y0] = ponto(a0);
        const [x1, y1] = ponto(a1);
        const grande = a1 - a0 > Math.PI ? 1 : 0;
        const d = v === total ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0` : `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${grande},1 ${x1},${y1}Z`;
        const [lx, ly] = ponto((a0 + a1) / 2, r * 0.62);
        return (
          <g key={i}>
            <path d={d} fill={CORES_SERIE[i % CORES_SERIE.length]} stroke="#fff" strokeWidth={1.5} data-fatia-grafico />
            {rotulos && (
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={600} data-rotulo-grafico>
                {formatarNoGrafico(v, dados.formato)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
