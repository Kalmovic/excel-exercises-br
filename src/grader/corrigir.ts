import type { Alvo, Exercicio, Valor } from "@/content/schema";
import { Planilha } from "@/engine/engine";
import { deEndereco } from "@/engine/address";
import { dataIsoParaSerial, type ValorCelula } from "@/engine/format";
import { ptBR } from "@/engine/ptBR";

export type MotivoFalha =
  | "vazia"
  | "sem-formula"
  | "erro"
  | "valor"
  | "funcao-faltando"
  | "funcao-proibida"
  | "valor-fixo";

export type Falha = { celula: string; motivo: MotivoFalha; mensagem: string };
export type Resultado = { ok: boolean; falhas: Falha[] };

const TOLERANCIA_PADRAO = 1e-9;

const nomePt = (canonico: string) =>
  (ptBR.functions as Record<string, string>)[canonico] ?? canonico;

function normalizarEsperado(v: Valor): ValorCelula {
  if (v !== null && typeof v === "object") return dataIsoParaSerial(v.data);
  return v;
}

function iguais(obtido: ValorCelula, esperado: Valor, tol: number): boolean {
  const e = normalizarEsperado(esperado);
  if (typeof e === "number") {
    return typeof obtido === "number" && Math.abs(obtido - e) <= Math.max(tol, Math.abs(e) * 1e-12);
  }
  if (typeof e === "string" && typeof obtido === "string") return obtido.trim() === e.trim();
  if (e === null) return obtido === null || obtido === "";
  return obtido === e;
}

/** Esperado de um alvo como matriz (resultados que derramam: FILTRO, ÚNICO…). */
function comoMatriz(alvo: Alvo): Valor[][] {
  return Array.isArray(alvo.esperado) ? alvo.esperado : [[alvo.esperado]];
}

function conferirValores(p: Planilha, alvo: Alvo): boolean {
  const base = deEndereco(alvo.celula);
  const tol = alvo.tolerancia ?? TOLERANCIA_PADRAO;
  return comoMatriz(alvo).every((linha, dl) =>
    linha.every((esp, dc) =>
      iguais(p.valor({ linha: base.linha + dl, coluna: base.coluna + dc }), esp, tol),
    ),
  );
}

/**
 * Perturba as células `variaveis` e confere se a fórmula do aluno acompanha
 * a solução de referência. Pega quem digitou o resultado à mão ou usou uma
 * referência que só "funciona por acaso" (ex.: esqueceu o $).
 */
function conferirComPerturbacao(ex: Exercicio, conteudos: Record<string, string>): string[] {
  const variaveis = ex.grade.variaveis ?? [];
  if (variaveis.length === 0) return [];
  const falhas = new Set<string>();

  for (const fator of [1.37, 0.61]) {
    const grade = structuredClone(ex.grade);
    for (const end of variaveis) {
      const cel = grade.celulas[end];
      if (!cel) continue;
      const n = Number(cel.entrada.replace(/\./g, "").replace(",", ".").replace("%", ""));
      if (Number.isNaN(n)) continue;
      const pct = cel.entrada.trim().endsWith("%");
      const novo = Math.round(n * fator * 100) / 100;
      cel.entrada = String(novo).replace(".", ",") + (pct ? "%" : "");
    }

    const aluno = new Planilha(grade);
    const referencia = new Planilha(grade);
    try {
      aluno.definirVarias(
        Object.entries(conteudos)
          .filter(([end]) => !aluno.bloqueada(end))
          .map(([endereco, bruto]) => ({ endereco, bruto })),
      );
      referencia.definirVarias(ex.alvos.map((a) => ({ endereco: a.celula, bruto: a.solucaoReferencia })));
      for (const alvo of ex.alvos) {
        const base = deEndereco(alvo.celula);
        const tol = alvo.tolerancia ?? TOLERANCIA_PADRAO;
        comoMatriz(alvo).forEach((linha, dl) =>
          linha.forEach((_, dc) => {
            const pos = { linha: base.linha + dl, coluna: base.coluna + dc };
            const ref = referencia.valor(pos);
            const obt = aluno.valor(pos);
            const ok =
              typeof ref === "number"
                ? iguais(obt, ref, tol)
                : JSON.stringify(ref) === JSON.stringify(obt);
            if (!ok) falhas.add(alvo.celula);
          }),
        );
      }
    } finally {
      aluno.destruir();
      referencia.destruir();
    }
  }
  return [...falhas];
}

export function corrigir(ex: Exercicio, p: Planilha): Resultado {
  const falhas: Falha[] = [];

  for (const alvo of ex.alvos) {
    const c = alvo.celula;
    const valor = p.valor(c);
    if (valor === null || valor === "") {
      falhas.push({ celula: c, motivo: "vazia", mensagem: `A célula ${c} ainda está vazia.` });
      continue;
    }
    if (typeof valor === "object") {
      falhas.push({
        celula: c,
        motivo: "erro",
        mensagem: `A fórmula em ${c} retornou o erro ${valor.erro}.`,
      });
      continue;
    }
    if (alvo.exigeFormula && !p.temFormula(c)) {
      falhas.push({
        celula: c,
        motivo: "sem-formula",
        mensagem: `Em ${c}, use uma fórmula (começando com =) em vez de digitar o valor.`,
      });
      continue;
    }
    if (!conferirValores(p, alvo)) {
      falhas.push({ celula: c, motivo: "valor", mensagem: `O resultado em ${c} não está certo.` });
    }
  }

  // Funções exigidas/proibidas: olhamos o conjunto das fórmulas dos alvos.
  const usadas = new Set(ex.alvos.flatMap((a) => p.funcoesUsadas(a.celula)));
  for (const f of ex.funcoesExigidas ?? []) {
    if (!usadas.has(f)) {
      falhas.push({
        celula: ex.alvos[0].celula,
        motivo: "funcao-faltando",
        mensagem: `Este exercício pede que você use a função ${nomePt(f)}.`,
      });
    }
  }
  for (const f of ex.funcoesProibidas ?? []) {
    if (usadas.has(f)) {
      falhas.push({
        celula: ex.alvos[0].celula,
        motivo: "funcao-proibida",
        mensagem: `Tente resolver sem usar ${nomePt(f)}.`,
      });
    }
  }

  if (falhas.length === 0) {
    for (const c of conferirComPerturbacao(ex, p.conteudos())) {
      falhas.push({
        celula: c,
        motivo: "valor-fixo",
        mensagem: `O valor em ${c} está certo agora, mas não acompanha mudanças nos dados. Confira as referências (faltou um $?) ou se algum número foi digitado à mão.`,
      });
    }
  }

  return { ok: falhas.length === 0, falhas };
}
