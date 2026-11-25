/**
 * Visitas do dono do site (e de quem ele quiser) não entram no Vercel Analytics.
 *
 * Abra qualquer página com `?interno=1` uma vez em cada navegador/aparelho: a marca
 * fica guardada no navegador e, daí em diante, nenhuma visita nem evento dele é
 * enviado (com ou sem VPN). `?interno=0` desliga.
 */
export const CHAVE_INTERNO = "planilhes:interno";

/** Lê o `?interno=` da URL, grava ou apaga a marca e diz se este navegador é interno. */
export function ehVisitaInterna(url: string, guardado: Pick<Storage, "getItem" | "setItem" | "removeItem">): boolean {
  try {
    const pedido = new URL(url).searchParams.get("interno");
    if (pedido === "1") guardado.setItem(CHAVE_INTERNO, "1");
    else if (pedido === "0") guardado.removeItem(CHAVE_INTERNO);
    return guardado.getItem(CHAVE_INTERNO) === "1";
  } catch {
    return false; // sem armazenamento (modo privado bloqueado): conta normalmente
  }
}
