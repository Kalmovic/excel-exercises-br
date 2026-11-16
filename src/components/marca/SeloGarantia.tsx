import { useId } from "react";

/** Contorno de roseta (borda recortada) com `pontas` pontas, centrado em (cx, cy). */
function roseta(cx: number, cy: number, raioFora: number, raioDentro: number, pontas: number) {
  const pts: string[] = [];
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 === 0 ? raioFora : raioDentro;
    const a = (Math.PI * i) / pontas - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * Selo dourado de garantia (SVG, nítido em qualquer tamanho).
 * `dias` vem de PRECO.garantiaDias.
 */
export function SeloGarantia({ dias, className = "h-40 w-40" }: { dias: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const ouro = `ouro-${id}`;
  const ouroEscuro = `ouro-escuro-${id}`;
  const brilho = `brilho-${id}`;
  const arcoCima = `arco-cima-${id}`;
  const arcoBaixo = `arco-baixo-${id}`;

  return (
    <svg viewBox="0 0 200 230" className={className} role="img" aria-label={`Selo: garantia incondicional de ${dias} dias`}>
      <defs>
        <linearGradient id={ouro} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset="0.35" stopColor="#f5c542" />
          <stop offset="0.65" stopColor="#d99a1e" />
          <stop offset="1" stopColor="#f7d46a" />
        </linearGradient>
        <linearGradient id={ouroEscuro} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b7791f" />
          <stop offset="1" stopColor="#8a5a12" />
        </linearGradient>
        <radialGradient id={brilho} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fffbe6" stopOpacity="0" />
        </radialGradient>
        {/* Arcos para o texto curvo (em cima, da esquerda para a direita; embaixo, idem) */}
        <path id={arcoCima} d="M 37 100 A 63 63 0 0 1 163 100" />
        <path id={arcoBaixo} d="M 34 100 A 66 66 0 0 0 166 100" />
      </defs>

      {/* Fitas */}
      <path d="M 62 150 L 40 222 L 62 208 L 76 228 L 92 160 Z" fill={`url(#${ouroEscuro})`} />
      <path d="M 138 150 L 160 222 L 138 208 L 124 228 L 108 160 Z" fill={`url(#${ouroEscuro})`} />

      {/* Roseta, aro e miolo */}
      <polygon points={roseta(100, 100, 96, 86, 32)} fill={`url(#${ouro})`} stroke="#b7791f" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="78" fill={`url(#${ouroEscuro})`} />
      <circle cx="100" cy="100" r="74" fill={`url(#${ouro})`} />
      <circle cx="100" cy="100" r="50" fill="none" stroke="#8a5a12" strokeWidth="1.5" strokeDasharray="2 3" />
      <circle cx="100" cy="100" r="74" fill={`url(#${brilho})`} />

      {/* Textos */}
      <g fill="#5c3a06" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
        <text fontSize="10" letterSpacing="1.2">
          <textPath href={`#${arcoCima}`} startOffset="50%" textAnchor="middle">
            GARANTIA INCONDICIONAL
          </textPath>
        </text>
        <text fontSize="9.5" letterSpacing="1.6">
          <textPath href={`#${arcoBaixo}`} startOffset="50%" textAnchor="middle">
            SEU DINHEIRO DE VOLTA
          </textPath>
        </text>
        <text x="100" y="108" textAnchor="middle" fontSize="44" fontFamily="Georgia, 'Times New Roman', serif">
          {dias}
        </text>
        <text x="100" y="128" textAnchor="middle" fontSize="13" letterSpacing="3">
          DIAS
        </text>
      </g>
      {/* Estrelinhas */}
      <g fill="#5c3a06">
        <circle cx="62" cy="104" r="2.2" />
        <circle cx="138" cy="104" r="2.2" />
      </g>
    </svg>
  );
}
