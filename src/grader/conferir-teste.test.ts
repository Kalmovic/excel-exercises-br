import { describe, expect, it } from "vitest";
import { preencherSolucao } from "@/components/admin/solucao";
import { criarStore } from "@/components/simulador/store";
import { MODULOS, testeDoModulo } from "@/content";
import type { Exercicio } from "@/content/schema";
import { deIntervalo, paraEndereco } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { conferirTeste, type RespostaQuestao } from "./conferir-teste";

/** O que o navegador mandaria para quem acertou a questão. */
function respostaCerta(q: Exercicio): RespostaQuestao {
  const p = Planilha.deExercicio(q);
  const inicio = q.inicio?.selecao ?? q.inicio?.celulaAtiva;
  const store = criarStore(p, inicio ? deIntervalo(inicio) : undefined);
  preencherSolucao(q, p, store);
  const s = store.getState();
  const sel = s.selecao();
  return {
    conteudos: p.conteudosDoAluno(),
    formatos: p.formatosDoAluno(),
    recursos: p.recursos(),
    resposta: s.resposta,
    ativa: paraEndereco(s.ancora),
    selecao: paraEndereco(sel.inicio) === paraEndereco(sel.fim) ? paraEndereco(sel.inicio) : `${paraEndereco(sel.inicio)}:${paraEndereco(sel.fim)}`,
  };
}

describe.each(MODULOS.filter((m) => testeDoModulo(m.slug).length > 0).map((m) => [m.slug] as const))("teste do módulo %s", (modulo) => {
  const questoes = testeDoModulo(modulo);

  it("respostas certas passam na conferência do servidor", () => {
    expect(conferirTeste(questoes, questoes.map(respostaCerta))).toEqual(questoes.map(() => true));
  });

  it("sem resposta, nada passa", () => {
    expect(conferirTeste(questoes, [])).toEqual(questoes.map(() => false));
  });

  it("mandar só o valor final (sem fórmula) não passa onde a fórmula é exigida", () => {
    const certas = questoes.map(respostaCerta);
    const forjadas = questoes.map((q, i) => {
      if (q.type !== "formula") return certas[i];
      const p = Planilha.deExercicio(q);
      p.definirVarias(q.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
      // troca cada fórmula pelo número que ela dá
      return { ...certas[i], conteudos: Object.fromEntries(q.alvos.map((a) => [a.celula, String(p.valor(a.celula)).replace(".", ",")])) };
    });
    const r = conferirTeste(questoes, forjadas);
    questoes.forEach((q, i) => {
      if (q.type === "formula" && q.alvos.some((a) => a.exigeFormula)) expect(r[i], q.slug).toBe(false);
    });
  });
});

it("entrada maliciosa (endereços inválidos, células bloqueadas, textos gigantes) não quebra nem passa", () => {
  const q = testeDoModulo("busca")[0];
  const lixo: RespostaQuestao = {
    conteudos: { "../../etc": "=1", ZZZ99999: "=1", A1: "=1", G2: "x".repeat(10_000) },
    formatos: { A1: "nada" as never },
    ativa: "<script>",
  };
  expect(conferirTeste([q], [lixo])).toEqual([false]);
});
