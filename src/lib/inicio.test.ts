import { describe, expect, it } from "vitest";
import { escolherInicio, type ItemTrilha } from "./inicio";
import type { ProgressoExercicio } from "./progresso";

const trilha: ItemTrilha[] = [
  { slug: "i1", titulo: "I1", modulo: "intro", versao: 1 },
  { slug: "i2", titulo: "I2", modulo: "intro", versao: 1 },
  { slug: "f1", titulo: "F1", modulo: "fundamentos", versao: 1 },
  { slug: "f2", titulo: "F2", modulo: "fundamentos", versao: 1 },
];

const p = (status: ProgressoExercicio["status"], quando: string, versao = 1): ProgressoExercicio => ({
  versao,
  status,
  tentativas: 1,
  conteudos: {},
  atualizadoEm: quando,
});

describe("escolherInicio", () => {
  it("usuário novo: começar pelo Intro, com opção de ir para Fundamentos", () => {
    expect(escolherInicio(trilha, {}, {})).toMatchObject({ tipo: "novo", intro: { slug: "i1" }, fundamentos: { slug: "f1" } });
  });

  it("usuário novo que escolheu pular o Intro", () => {
    expect(escolherInicio(trilha, {}, { pularIntro: true }).tipo).toBe("novo-sem-intro");
  });

  it("quem já tem progresso em Fundamentos NÃO volta para o Intro", () => {
    const r = escolherInicio(trilha, { f1: p("concluido", "2026-11-01") }, {});
    expect(r).toMatchObject({ tipo: "continuar", alvo: { slug: "f2" } });
  });

  it("Intro pela metade: continua no Intro", () => {
    const r = escolherInicio(trilha, { i1: p("concluido", "2026-11-01") }, {});
    expect(r).toMatchObject({ tipo: "continuar", alvo: { slug: "i2" } });
  });

  it("Intro completo: segue para Fundamentos", () => {
    const r = escolherInicio(trilha, { i1: p("concluido", "2026-11-01"), i2: p("concluido", "2026-11-02") }, {});
    expect(r).toMatchObject({ tipo: "continuar", alvo: { slug: "f1" } });
  });

  it("pendentes vêm antes dos pulados", () => {
    const r = escolherInicio(trilha, { i1: p("pulado", "2026-11-01") }, {});
    expect(r).toMatchObject({ tipo: "continuar", alvo: { slug: "i2" } });
  });

  it("só sobraram pulados: volta para o pulado", () => {
    const r = escolherInicio(trilha, { i1: p("pulado", "2026-11-01"), i2: p("concluido", "2026-11-02") }, {});
    // o mais recente é do Intro; no Intro só sobrou o pulado
    expect(r).toMatchObject({ tipo: "continuar", alvo: { slug: "i1" } });
  });

  it("progresso de versão antiga é ignorado", () => {
    expect(escolherInicio(trilha, { f1: p("concluido", "2026-11-01", 0) }, {}).tipo).toBe("novo");
  });

  it("tudo concluído", () => {
    const tudo = Object.fromEntries(trilha.map((i, n) => [i.slug, p("concluido", `2026-11-0${n + 1}`)]));
    expect(escolherInicio(trilha, tudo, {}).tipo).toBe("concluido");
  });
});
