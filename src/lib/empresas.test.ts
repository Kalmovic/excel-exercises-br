import { describe, expect, it } from "vitest";
import { cnpjValido, descricaoItem, formatarCnpj, PRECO_PESSOA_ANO, propostaSchema, totalDoContrato } from "./empresas";

const PROPOSTA = {
  nome: "Empresa Teste Ltda",
  cnpj: "11.222.333/0001-81",
  email_financeiro: "Financeiro@Empresa.com.br",
  gestor_email: "gestora@empresa.com.br",
  cep: "20090-003",
  logradouro: "Av. Rio Branco",
  numero: "1",
  complemento: "",
  bairro: "Centro",
  cidade: "Rio de Janeiro",
  uf: "rj",
  assentos: "12",
  preco_por_pessoa_ano: "180",
};

describe("licenças para empresas", () => {
  it("preço padrão: R$ 15 por pessoa por mês = R$ 180 por ano", () => {
    expect(PRECO_PESSOA_ANO).toBe(180);
    expect(totalDoContrato(12, 180)).toBe(2160);
    expect(totalDoContrato(5, 179.9)).toBe(899.5);
  });

  it("CNPJ: confere os dígitos verificadores e formata para o Stripe", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("proposta: limpa CNPJ e CEP, e-mails em minúsculas, UF em maiúsculas, complemento vazio vira null", () => {
    const r = propostaSchema.parse(PROPOSTA);
    expect(r).toMatchObject({ cnpj: "11222333000181", cep: "20090003", email_financeiro: "financeiro@empresa.com.br", uf: "RJ", complemento: null, assentos: 12, preco_por_pessoa_ano: 180 });
  });

  it("proposta: recusa menos de 5 pessoas, CNPJ errado, UF inexistente", () => {
    const erro = (extra: object) => propostaSchema.safeParse({ ...PROPOSTA, ...extra }).error?.issues[0]?.message;
    expect(erro({ assentos: "4" })).toBe("Mínimo de 5 pessoas.");
    expect(erro({ cnpj: "11.222.333/0001-80" })).toBe("CNPJ inválido.");
    expect(erro({ uf: "XX" })).toBe("UF inválida.");
    expect(erro({ cep: "123" })).toBe("CEP com 8 números.");
  });

  it("item da fatura diz quantas pessoas e o período", () => {
    expect(descricaoItem(12)).toBe("Planilhês Pro para empresas — 12 pessoas × 12 meses");
  });
});
