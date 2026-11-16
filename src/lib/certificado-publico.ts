import "server-only";
import { MODULOS } from "@/content";
import { ESPECIALISTA } from "./especialista";
import { supabasePublico } from "./supabase/publico";

export type CertificadoPublico = { codigo: string; nome: string; modulo: string; acertos: number; total: number; emitido_em: string };

/** Busca pelo código, pela função pública de verificação (sem sessão). */
export async function buscarCertificado(codigoBruto: string): Promise<CertificadoPublico | null> {
  const codigo = decodeURIComponent(codigoBruto).toUpperCase();
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo)) return null;
  const supabase = supabasePublico();
  if (!supabase) return null;
  const { data } = await supabase.rpc("verificar_certificado", { codigo_buscado: codigo }).maybeSingle<CertificadoPublico>();
  return data ?? null;
}

/** "Especialista em Excel" ou "Módulo 4: Busca". */
export function tituloDoCertificado(c: Pick<CertificadoPublico, "modulo">) {
  if (c.modulo === ESPECIALISTA) return "Especialista em Excel";
  const m = MODULOS.find((x) => x.slug === c.modulo);
  return m ? `Módulo ${m.numero}: ${m.titulo}` : c.modulo;
}
