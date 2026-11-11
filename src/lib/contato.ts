import { z } from "zod";

/**
 * Formulários B2B. O mesmo esquema valida no navegador e no servidor.
 * Hoje a rota grava no log do servidor; no backend (Lote 2) grava no banco
 * e manda e-mail para a equipe.
 */
const texto = (max: number) => z.string().trim().max(max);

export const contatoSchema = z.discriminatedUnion("formulario", [
  z.object({
    formulario: z.literal("contato"),
    publico: z.enum(["empresa", "universidade"]),
    nome: texto(120).min(2, "Escreva seu nome."),
    email: z.email("E-mail inválido.").max(200),
    organizacao: texto(160).min(2, "Escreva o nome da organização."),
    cargo: texto(120).optional(),
    pessoas: texto(40).optional(),
    mensagem: texto(2000).optional(),
    consentimento: z.literal(true, "Precisamos da sua autorização para entrar em contato."),
    /** Campo invisível: robôs preenchem, pessoas não. */
    site: z.string().max(0).optional(),
  }),
  z.object({
    formulario: z.literal("indicacao"),
    nome: texto(120).min(2, "Escreva seu nome."),
    email: z.email("E-mail inválido.").max(200),
    organizacao: texto(160).min(2, "Escreva o nome da empresa ou faculdade indicada."),
    contatoIndicado: texto(200).optional(),
    mensagem: texto(2000).optional(),
    consentimento: z.literal(true, "Precisamos da sua autorização para entrar em contato."),
    site: z.string().max(0).optional(),
  }),
]);

export type Contato = z.infer<typeof contatoSchema>;
