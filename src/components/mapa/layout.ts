/**
 * Geometria do mapa da trilha: posição de cada casa, banner de região e
 * troféu, e os trechos do caminho entre elas. Função pura (sem React), para
 * ser testada e para o mapa crescer com o conteúdo sem desenho à mão.
 */

export const LARGURA = 360;
const CENTRO = LARGURA / 2;
/** Zigue-zague: deslocamento horizontal de cada casa, em ciclo. */
const ONDA = [0, 64, 104, 64, 0, -64, -104, -64];
const PASSO = 84; // distância vertical entre casas
const ALTURA_BANNER = 92;
const ESPACO_ANTES_BANNER = 24;
export const TAMANHO_CASA = 56;
export const TAMANHO_TROFEU = 72;

export type RegiaoEntrada = { slug: string; casas: number; recolhida: boolean };

export type Ponto = { x: number; y: number };
export type CasaLayout = Ponto & { regiao: string; indice: number };
export type BannerLayout = { regiao: string; y: number; altura: number };
export type TrofeuLayout = Ponto & { regiao: string };
/** Trecho do caminho; `ate` é a casa ou troféu de chegada (para saber se foi percorrido). */
export type Trecho = { d: string; de: string; ate: string };

export type Layout = {
  casas: CasaLayout[];
  banners: BannerLayout[];
  trofeus: TrofeuLayout[];
  trechos: Trecho[];
  altura: number;
};

const chaveCasa = (regiao: string, i: number) => `${regiao}#${i}`;
export const chaveTrofeu = (regiao: string) => `${regiao}#trofeu`;
export { chaveCasa };

function curva(a: Ponto, b: Ponto) {
  const meio = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${meio}, ${b.x} ${meio}, ${b.x} ${b.y}`;
}

export function calcularLayout(regioes: RegiaoEntrada[]): Layout {
  const casas: CasaLayout[] = [];
  const banners: BannerLayout[] = [];
  const trofeus: TrofeuLayout[] = [];
  const trechos: Trecho[] = [];
  let y = 0;
  let passo = 0; // posição global na onda, contínua entre regiões
  let anterior: { p: Ponto; chave: string } | null = null;

  const ligar = (p: Ponto, chave: string) => {
    if (anterior) trechos.push({ d: curva(anterior.p, p), de: anterior.chave, ate: chave });
    anterior = { p, chave };
  };

  for (const r of regioes) {
    if (banners.length > 0) y += ESPACO_ANTES_BANNER;
    banners.push({ regiao: r.slug, y, altura: ALTURA_BANNER });
    y += ALTURA_BANNER + PASSO * 0.6;

    if (!r.recolhida) {
      for (let i = 0; i < r.casas; i++) {
        const p = { x: CENTRO + ONDA[passo % ONDA.length], y };
        casas.push({ ...p, regiao: r.slug, indice: i });
        ligar(p, chaveCasa(r.slug, i));
        passo++;
        y += PASSO;
      }
    }
    // Troféu no fim da região, sempre no centro.
    const t = { x: CENTRO, y: y + 6 };
    trofeus.push({ ...t, regiao: r.slug });
    ligar(t, chaveTrofeu(r.slug));
    passo = 0;
    y += TAMANHO_TROFEU + 16;
  }

  return { casas, banners, trofeus, trechos, altura: y };
}
