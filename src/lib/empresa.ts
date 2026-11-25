/**
 * Quem vende o Planilhês. Aparece nos Termos de uso e na Política de privacidade:
 * o Decreto 7.962/2013 (comércio eletrônico) exige razão social, CNPJ, endereço
 * físico e um contato no site.
 */
export const EMPRESA = {
  razaoSocial: "Joseph Torres Kaltenecker Consultoria em Tecnologia da Informação Ltda.",
  cnpj: "45.509.152/0001-52",
  /** Endereço completo da sede (o do cartão CNPJ). Null até ser confirmado: a página mostra só a cidade. */
  endereco: null as string | null,
  cidade: "Rio de Janeiro/RJ",
} as const;

/** Atendimento, pedidos de reembolso e pedidos sobre dados pessoais (LGPD). */
export const EMAIL_CONTATO = "contato@planilhes.com.br";

/** Data da versão em vigor dos Termos e da Política (mudou o texto, muda a data). */
export const VERSAO_DOCUMENTOS = "25/11/2026";
