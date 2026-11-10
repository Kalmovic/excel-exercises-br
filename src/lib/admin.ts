import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acesso de admin enquanto não existem contas (Fase 3 troca por um papel
 * de admin no Supabase).
 *
 * - A senha fica SÓ na variável de ambiente ADMIN_TOKEN (Vercel → Settings →
 *   Environment Variables), nunca no código.
 * - O cookie guarda um hash da senha, não a senha: quem copiar o cookie não
 *   descobre a senha. Trocar a ADMIN_TOKEN derruba todas as sessões.
 * - Sem ADMIN_TOKEN (ou com menos de 12 caracteres), o admin fica desligado.
 */
export const COOKIE_ADMIN = "excel_admin";
const TAMANHO_MINIMO = 12;

const hash = (s: string) => createHash("sha256").update(`excel-br-admin:${s}`).digest();

function senhaConfigurada(): string | null {
  const s = process.env.ADMIN_TOKEN;
  return s && s.length >= TAMANHO_MINIMO ? s : null;
}

export function adminConfigurado() {
  return senhaConfigurada() !== null;
}

/** Compara em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres acertou). */
export function senhaCorreta(tentativa: string): boolean {
  const senha = senhaConfigurada();
  if (!senha || !tentativa) return false;
  return timingSafeEqual(hash(tentativa), hash(senha));
}

/** Valor gravado no cookie depois do login. */
export function valorDoCookie(): string {
  const senha = senhaConfigurada();
  if (!senha) throw new Error("ADMIN_TOKEN não configurada");
  return hash(senha).toString("hex");
}

/** O visitante deste request é admin? Sempre checado no servidor. */
export async function ehAdmin(): Promise<boolean> {
  // Ler o cookie ANTES de qualquer outra coisa: é isso que faz o Next tratar a
  // página como dependente do request. Se a checagem da senha viesse antes, no
  // build (sem ADMIN_TOKEN) a página seria congelada como um 404 estático.
  const valor = (await cookies()).get(COOKIE_ADMIN)?.value;
  const senha = senhaConfigurada();
  if (!senha) return false;
  if (!valor || valor.length !== 64) return false;
  return timingSafeEqual(Buffer.from(valor, "hex"), hash(senha));
}
