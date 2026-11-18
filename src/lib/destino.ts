/**
 * Para onde ir depois de entrar (?proximo=/caminho), só dentro do próprio site.
 *
 * Por quê: "começa com / e não com //" não basta. O navegador (e o `new URL`)
 * trata "\" como "/" e joga fora tabs e quebras de linha, então "/\evil.com" e
 * "/\t/evil.com" viram "//evil.com", outro site. Aqui o caminho é resolvido
 * contra a origem de verdade e só vale se continuar nela.
 *
 * Usado no navegador (FormEntrar) e no servidor (/auth/confirmar).
 */
export const DESTINO_PADRAO = "/trilha";

export function destinoSeguro(proximo: string | null | undefined, origem: string): string {
  if (!proximo || proximo.length > 2000) return DESTINO_PADRAO;
  // Uma barra só no começo; nada de barra invertida nem caracteres de controle em lugar nenhum.
  if (!proximo.startsWith("/") || proximo.startsWith("//")) return DESTINO_PADRAO;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(proximo)) return DESTINO_PADRAO;
  let base: URL;
  let url: URL;
  try {
    base = new URL(origem);
    url = new URL(proximo, base);
  } catch {
    return DESTINO_PADRAO;
  }
  if (url.origin !== base.origin) return DESTINO_PADRAO;
  const caminho = url.pathname + url.search + url.hash;
  // Defesa extra: o resultado também precisa ser um caminho de uma barra só.
  return caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : DESTINO_PADRAO;
}
