import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PainelGestor } from "@/lib/empresas";

vi.mock("@/app/(app)/empresa/acoes", () => ({ removerMembro: async () => "removido" }));
const { PainelEquipe } = await import("./PainelEquipe");

const DADOS: PainelGestor = {
  organizacao: { nome: "Empresa Teste Ltda", status: "ativa", acesso_ate: "2027-11-28T15:00:00Z", assentos: 5, usados: 2, codigo_convite: "0123456789abcdef0123456789abcdef" },
  membros: [
    { usuario_id: "u1", email: "ana@empresa.com.br", nome: "Ana Souza", entrou_em: "2026-11-26T12:00:00Z", licoes: 12, ultimo_acesso: "2026-12-01T13:00:00Z", certificados: ["fundamentos", "especialista"] },
    { usuario_id: "u2", email: "bia@empresa.com.br", nome: null, entrou_em: "2026-11-27T12:00:00Z", licoes: 0, ultimo_acesso: null, certificados: [] },
  ],
};

const html = (dados: PainelGestor) =>
  renderToStaticMarkup(
    createElement(PainelEquipe, {
      dados,
      totalLicoes: 40,
      linkConvite: "https://planilhes.com.br/convite/0123456789abcdef0123456789abcdef",
      titulos: { fundamentos: "Módulo 1", especialista: "Especialista" },
    }),
  );

describe("painel do gestor (visual)", () => {
  it("vagas, validade, convite e o progresso de cada pessoa (tabela e cartões)", () => {
    const h = html(DADOS);
    expect(h).toContain("Empresa Teste Ltda");
    expect(h).toContain("Contrato em vigor");
    expect(h).toMatch(/data-testid="vagas">2\/5</);
    expect(h).toContain("28/11/2027");
    expect(h).toContain("https://planilhes.com.br/convite/0123456789abcdef0123456789abcdef");
    expect(h).toContain("Copiar link");
    // Tabela (telas grandes) e cartões (celular) com os mesmos dados.
    expect(h).toContain('data-testid="membros-tabela"');
    expect(h).toContain('data-testid="membros-cartoes"');
    expect(h.match(/Ana Souza/g)?.length).toBe(2);
    expect(h).toContain(">12/40<");
    expect(h).toContain("Módulo 1, Especialista");
    expect(h).toContain("01/12/2026");
    // Sem nome: mostra o e-mail; sem progresso ainda.
    expect(h).toContain("bia@empresa.com.br");
    expect(h).toContain("Ainda não começou");
    expect(h.match(/data-testid="remover-membro"/g)?.length).toBe(4);
  });

  it("equipe vazia e contrato vencido / lotado", () => {
    const vazia = html({ ...DADOS, membros: [], organizacao: { ...DADOS.organizacao, usados: 0 } });
    expect(vazia).toContain("Ninguém entrou ainda");
    const vencida = html({ ...DADOS, organizacao: { ...DADOS.organizacao, status: "vencida", usados: 5 } });
    expect(vencida).toContain("Contrato vencido");
    expect(vencida).toContain("Todas as vagas estão ocupadas");
  });
});
