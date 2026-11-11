import { describe, expect, it } from "vitest";
import { deEndereco, deIntervalo } from "./address";
import { Planilha } from "./engine";

const nova = () =>
  new Planilha({ linhas: 5, colunas: 3, celulas: { A1: { entrada: "10" }, A2: { entrada: "0,25" } } } as never);

describe("Ctrl+Z com formatação", () => {
  it("desfaz e refaz a formatação na ordem certa, junto com o conteúdo", () => {
    const p = nova();
    p.definir("B1", "=A1*2"); // 1: conteúdo
    p.formatar(deIntervalo("B1"), "moeda"); // 2: formato
    p.formatar(deIntervalo("A2"), "percentual"); // 3: formato
    expect(p.exibicao("B1").replace(/\s/g, " ")).toBe("R$ 20,00");
    expect(p.exibicao("A2")).toBe("25%");

    p.desfazer(); // desfaz 3
    expect(p.exibicao("A2")).toBe("0,25");
    expect(p.formatosDoAluno()).toEqual({ B1: "moeda" });
    p.desfazer(); // desfaz 2
    expect(p.exibicao("B1")).toBe("20");
    p.desfazer(); // desfaz 1
    expect(p.bruto("B1")).toBe("");

    p.refazer();
    expect(p.bruto("B1")).toBe("=A1*2");
    p.refazer();
    expect(p.exibicao("B1").replace(/\s/g, " ")).toBe("R$ 20,00");
  });

  it("volta ao formato anterior (não ao vazio) e uma ação nova limpa o refazer", () => {
    const p = nova();
    p.formatar(deIntervalo("A1"), "moeda");
    p.formatar(deIntervalo("A1"), "percentual");
    p.desfazer();
    expect(p.formatoDe("A1")).toBe("moeda");
    p.definir("C1", "1");
    p.refazer(); // nada a refazer depois de uma ação nova
    expect(p.formatoDe("A1")).toBe("moeda");
  });

  it("colar várias células é um passo só", () => {
    const p = nova();
    p.definir("B1", "=A1+1");
    const o = deEndereco("B1");
    p.preencher({ inicio: o, fim: o }, deIntervalo("B2:B4"));
    expect(p.bruto("B4")).toBe("=A4+1");
    p.desfazer();
    expect(p.bruto("B2")).toBe("");
    expect(p.bruto("B1")).toBe("=A1+1");
  });

  it("depois de restaurar o progresso, Ctrl+Z não apaga o que foi restaurado", () => {
    const p = nova();
    p.definirVarias([{ endereco: "B1", bruto: "=A1" }]);
    p.formatar(deIntervalo("B1"), "moeda");
    p.limparHistorico();
    p.desfazer();
    expect(p.bruto("B1")).toBe("=A1");
    expect(p.formatoDe("B1")).toBe("moeda");
  });
});
