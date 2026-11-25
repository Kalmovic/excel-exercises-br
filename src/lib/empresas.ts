import { z } from "zod";
import { NOME_SITE, PRECO_EMPRESAS } from "./site";

/**
 * Licenças para empresas (B2B): regras e textos que valem no servidor e no
 * navegador. Venda só por proposta: o dono cria a organização no admin, manda a
 * fatura (Stripe) e o link de convite. Ver docs/EMPRESAS.md.
 */

/** Preço padrão da proposta: R$ 15/pessoa/mês em contrato anual. */
export const PRECO_PESSOA_ANO = PRECO_EMPRESAS.porPessoaDesde * 12;

export const apenasDigitos = (s: string) => s.replace(/\D/g, "");

/** CNPJ com os dois dígitos verificadores certos (14 números, não todos iguais). */
export function cnpjValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + p * Number(base[i]), 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

/** "11222333000181" -> "11.222.333/0001-81" (o formato que o Stripe aceita em br_cnpj). */
export const formatarCnpj = (valor: string) =>
  apenasDigitos(valor).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

const texto = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max, msg);
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

/** Formulário "Nova proposta" do admin. */
export const propostaSchema = z.object({
  nome: texto(2, 160, "Escreva a razão social."),
  cnpj: z
    .string()
    .transform(apenasDigitos)
    .refine(cnpjValido, "CNPJ inválido."),
  email_financeiro: z.email("E-mail financeiro inválido.").max(200).transform((s) => s.toLowerCase()),
  gestor_email: z.email("E-mail do gestor inválido.").max(200).transform((s) => s.toLowerCase()),
  cep: z
    .string()
    .transform(apenasDigitos)
    .refine((s) => s.length === 8, "CEP com 8 números."),
  logradouro: texto(2, 200, "Escreva a rua."),
  numero: texto(1, 20, "Escreva o número (ou S/N)."),
  complemento: z.string().trim().max(100).optional().transform((s) => s || null),
  bairro: texto(2, 100, "Escreva o bairro."),
  cidade: texto(2, 100, "Escreva a cidade."),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => UFS.includes(s), "UF inválida."),
  assentos: z.coerce
    .number("Número de pessoas inválido.")
    .int("Número de pessoas inválido.")
    .min(PRECO_EMPRESAS.minimoPessoas, `Mínimo de ${PRECO_EMPRESAS.minimoPessoas} pessoas.`)
    .max(10000, "Número de pessoas alto demais."),
  preco_por_pessoa_ano: z.coerce.number("Preço inválido.").min(1, "Preço inválido.").max(100000, "Preço inválido."),
});

export type Proposta = z.infer<typeof propostaSchema>;

export type StatusOrganizacao = "proposta" | "ativa" | "vencida" | "cancelada";

/** O que a tabela organizacoes guarda (o admin lê com a chave secreta). */
export type Organizacao = Proposta & {
  id: string;
  status: StatusOrganizacao;
  acesso_ate: string | null;
  codigo_convite: string;
  gestor_id: string | null;
  stripe_cliente_id: string | null;
  stripe_fatura_id: string | null;
  fatura_url: string | null;
  criado_em: string;
};

/** Valor total do contrato anual, em centavos. */
export const centavosPorPessoa = (precoPorPessoaAno: number) => Math.round(precoPorPessoaAno * 100);
export const totalDoContrato = (assentos: number, precoPorPessoaAno: number) => (assentos * centavosPorPessoa(precoPorPessoaAno)) / 100;

/** Item da fatura. */
export const descricaoItem = (assentos: number) => `${NOME_SITE} Pro para empresas — ${assentos} pessoas × 12 meses`;

/** Caminho do convite (o link que o gestor repassa à equipe). */
export const caminhoConvite = (codigo: string) => `/convite/${codigo}`;
export const codigoValido = (codigo: string) => /^[0-9a-f]{32}$/i.test(codigo);

/** Resultado de entrar_na_organizacao (função do banco). */
export type ResultadoConvite = "entrou" | "ja_membro" | "invalido" | "inativa" | "vencida" | "cancelada" | "lotada" | "outra_organizacao" | "sem_login" | "erro";

export const MENSAGEM_CONVITE: Record<ResultadoConvite, string> = {
  entrou: "Pronto! Você entrou na equipe e já tem o Pro liberado.",
  ja_membro: "Você já faz parte desta equipe. O Pro está liberado na sua conta.",
  invalido: "Este link de convite não existe. Confira se copiou o endereço inteiro ou peça um novo ao gestor.",
  inativa: "A licença desta empresa ainda não foi ativada. Assim que o pagamento for confirmado, o convite passa a funcionar.",
  vencida: "O contrato desta empresa venceu. Fale com o gestor da equipe para renovar.",
  cancelada: "A licença desta empresa foi cancelada. Fale com o gestor da equipe.",
  lotada: "Todas as vagas desta equipe já estão ocupadas. Peça ao gestor para liberar uma vaga ou contratar mais.",
  outra_organizacao: "Sua conta já está na equipe de outra empresa com contrato em vigor. Peça para sair de lá antes de entrar nesta.",
  sem_login: "Entre na sua conta para aceitar o convite.",
  erro: "Não deu certo agora. Tente de novo em alguns minutos.",
};

/** Situação do convite antes de entrar (função convite_publico). */
export type SituacaoConvite = "aberta" | "lotada" | "vencida" | "inativa" | "cancelada";

/** Dados do painel do gestor (função painel_gestor). */
export type MembroPainel = {
  usuario_id: string;
  email: string | null;
  nome: string | null;
  entrou_em: string;
  licoes: number;
  ultimo_acesso: string | null;
  certificados: string[];
};
export type PainelGestor = {
  organizacao: { nome: string; status: StatusOrganizacao; acesso_ate: string | null; assentos: number; usados: number; codigo_convite: string };
  membros: MembroPainel[];
};

/** dd/mm/aaaa no fuso de São Paulo. */
export const dataBR = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
