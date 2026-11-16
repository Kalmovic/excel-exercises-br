import { MODULOS, testeDoModulo } from "@/content";

/** Valor de `modulo` na tabela certificados para o certificado final. */
export const ESPECIALISTA = "especialista";

/** Módulos que contam para o certificado de Especialista: todos os que têm teste. */
export const modulosDoEspecialista = () => MODULOS.filter((m) => testeDoModulo(m.slug).length > 0).map((m) => m.slug);

/** O que falta para o Especialista, dado o conjunto de módulos já certificados. */
export const faltamParaEspecialista = (certificados: Iterable<string>) => {
  const tem = new Set(certificados);
  return modulosDoEspecialista().filter((m) => !tem.has(m));
};
