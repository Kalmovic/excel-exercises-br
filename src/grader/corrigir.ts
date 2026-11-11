import type { Alvo, Exercicio, ExercicioDoTipo, Valor } from "@/content/schema";
import { Planilha } from "@/engine/engine";
import { deEndereco } from "@/engine/address";
import { ptBR } from "@/engine/ptBR";
import { explicarErro } from "@/engine/erros";
import { diagnosticarValor, diagnosticarValorFixo } from "./diagnostico";
import { iguais, TOLERANCIA_PADRAO, type EstadoCorrecao, type Falha, type Resultado } from "./tipos";
import { validarClickCell } from "./validadores/click-cell";
import { validarFormatCell } from "./validadores/format-cell";
import { validarSelectRange } from "./validadores/select-range";
import { validarTextAnswer } from "./validadores/text-answer";
import { validarTypeValue } from "./validadores/type-value";

export type { EstadoCorrecao, Falha, MotivoFalha, Resultado } from "./tipos";

type ExercicioFormula = ExercicioDoTipo<"formula">;

const nomePt = (canonico: string) =>
  (ptBR.functions as Record<string, string>)[canonico] ?? canonico;

/** Esperado de um alvo como matriz (resultados que derramam: FILTRO, ÚNICO…). */
function comoMatriz(alvo: Alvo): Valor[][] {
  return Array.isArray(alvo.esperado) ? alvo.esperado : [[alvo.esperado]];
}

/** Esperado calculado na hora pela solução de referência (respostas que mudam com o dia). */
function esperadoAgora(p: Planilha, alvo: Alvo, ex: ExercicioFormula): Alvo["esperado"] {
  if (!alvo.esperadoDaReferencia) return alvo.esperado;
  const ref = Planilha.deExercicio(ex);
  try {
    ref.definirVarias([{ endereco: alvo.celula, bruto: alvo.solucaoReferencia }]);
    const v = ref.valor(alvo.celula);
    return typeof v === "object" && v !== null ? alvo.esperado : v;
  } finally {
    ref.destruir();
  }
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
function conferirComPerturbacao(ex: ExercicioFormula, conteudos: Record<string, string>): string[] {
  const variaveis = ex.grade.variaveis ?? [];
  const alternativas = ex.grade.alternativas ?? {};
  const comAlternativas = Object.keys(alternativas);
  if (variaveis.length === 0 && comAlternativas.length === 0) return [];
  const falhas = new Set<string>();

  // Rodadas: números multiplicados por um fator e, em cada rodada, as células
  // de texto (critérios como "SP") trocadas por uma das alternativas. Quem
  // escreveu "SP" direto na fórmula não acompanha a troca e é pego aqui.
  const FATORES = [1.37, 0.61];
  const rodadas = Math.max(FATORES.length, ...comAlternativas.map((e) => alternativas[e].length));

  for (let r = 0; r < rodadas; r++) {
    const fator = FATORES[r % FATORES.length];
    const grade = structuredClone(ex.grade);
    for (const [i, end] of variaveis.entries()) {
      const cel = grade.celulas[end];
      if (!cel) continue;
      const n = Number(cel.entrada.replace(/\./g, "").replace(",", ".").replace("%", ""));
      if (Number.isNaN(n)) continue;
      const pct = cel.entrada.trim().endsWith("%");
      // Fator um pouco diferente por célula: com o mesmo fator em todas, uma
      // proporção digitada à mão (=1800/4500) continuaria dando certo.
      // Inteiros continuam inteiros: além de mais realista (quantidades, limites),
      // evita uma divergência do motor, que junta decimais com ponto em ">="&G2.
      const bruto = n * fator * (1 + 0.03 * ((i % 5) - 2));
      const novo = Number.isInteger(n) ? Math.round(bruto) : Math.round(bruto * 100) / 100;
      cel.entrada = String(novo).replace(".", ",") + (pct ? "%" : "");
    }
    for (const end of comAlternativas) {
      const lista = alternativas[end];
      grade.celulas[end] = { ...(grade.celulas[end] ?? {}), entrada: lista[r % lista.length] };
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
        // Resultados que derramam (FILTRO…) podem mudar de tamanho com os dados
        // trocados: compara também as linhas logo abaixo do esperado.
        const matriz = comoMatriz(alvo);
        const extra = Array.isArray(alvo.esperado) ? 20 : 0;
        const janela = Array.from({ length: matriz.length + extra }, (_, i) => matriz[i] ?? matriz[0]);
        janela.forEach((linha, dl) =>
          linha.forEach((_, dc) => {
            const pos = { linha: base.linha + dl, coluna: base.coluna + dc };
            if (pos.linha >= grade.linhas) return;
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

/** Correção dos exercícios de fórmula (o tipo original). */
export function corrigirFormula(ex: ExercicioFormula, p: Planilha): Resultado {
  const falhas: Falha[] = [];

  for (const alvo of ex.alvos) {
    const c = alvo.celula;
    if (p.circular(c)) {
      falhas.push({
        celula: c,
        motivo: "circular",
        mensagem: `A fórmula em ${c} cria uma referência circular: ela usa a própria célula ${c} no cálculo. Tire ${c} da fórmula ou do intervalo.`,
      });
      continue;
    }
    const valor = p.valor(c);
    if (valor === null || valor === "") {
      falhas.push({ celula: c, motivo: "vazia", mensagem: `A célula ${c} ainda está vazia.` });
      continue;
    }
    if (typeof valor === "object") {
      falhas.push({
        celula: c,
        motivo: "erro",
        mensagem: explicarErro(valor.erro)
          ? `A fórmula em ${c} retornou ${valor.erro}: ${explicarErro(valor.erro)}.`
          : `A fórmula em ${c} retornou o erro ${valor.erro}.`,
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
    const alvoAgora = { ...alvo, esperado: esperadoAgora(p, alvo, ex) };
    if (!conferirValores(p, alvoAgora)) {
      const esperado =
        Array.isArray(alvoAgora.esperado) || typeof alvoAgora.esperado === "object" ? null : alvoAgora.esperado;
      const dica = diagnosticarValor({
        formulaAluno: p.bruto(c),
        formulaReferencia: alvo.solucaoReferencia,
        obtido: valor,
        esperado,
      });
      falhas.push({
        celula: c,
        motivo: "valor",
        mensagem: `O resultado em ${c} não está certo.${dica ? ` ${dica}` : ""}`,
      });
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
      const alvo = ex.alvos.find((a) => a.celula === c);
      const dica = alvo && diagnosticarValorFixo(p.bruto(c), alvo.solucaoReferencia);
      falhas.push({
        celula: c,
        motivo: "valor-fixo",
        mensagem: `O valor em ${c} está certo agora, mas não acompanha mudanças nos dados. ${
          dica ?? "Confira as referências (faltou um $?) ou se algum número foi digitado à mão."
        }`,
      });
    }
  }

  return { ok: falhas.length === 0, falhas };
}

/** O que a tela sabe e a planilha não: seleção, resposta digitada, uso do mouse. */
export type EstadoTela = Pick<EstadoCorrecao, "ativa" | "selecao" | "resposta" | "mudancasPeloMouse">;

const TELA_PADRAO: EstadoTela = { ativa: "A1", selecao: "A1", resposta: "", mudancasPeloMouse: 0 };

export function estadoCorrecao(p: Planilha, tela: EstadoTela = TELA_PADRAO): EstadoCorrecao {
  return {
    valor: (e) => p.valor(e),
    formato: (e) => p.formatoDe(e),
    temFormula: (e) => p.temFormula(e),
    exibicao: (e) => p.exibicao(e),
    ...tela,
  };
}

/**
 * Ponto único de correção. `tela` é opcional: os exercícios de fórmula só
 * olham a planilha, então as chamadas antigas `corrigir(ex, p)` continuam iguais.
 */
export function corrigir(ex: Exercicio, p: Planilha, tela?: EstadoTela): Resultado {
  return aplicarErrosComuns(ex, p, tela, corrigirPorTipo(ex, p, tela));
}

const normalizarEntrada = (s: string) => s.toUpperCase().replace(/\s+/g, "");

/** Troca a mensagem genérica pela dica do roteiro quando o erro do aluno é um dos previstos. */
function aplicarErrosComuns(ex: Exercicio, p: Planilha, tela: EstadoTela | undefined, r: Resultado): Resultado {
  if (r.ok || !ex.errosComuns?.length) return r;
  const casa = (entrada: string, celula?: string) =>
    ex.errosComuns!.find(
      (e) => (!e.celula || !celula || e.celula === celula) && new RegExp(e.padrao, "i").test(normalizarEntrada(entrada)),
    );
  if (ex.type === "text_answer") {
    const e = casa(tela?.resposta ?? "");
    return e ? { ok: false, falhas: [{ ...r.falhas[0], mensagem: e.dica }] } : r;
  }
  return {
    ok: false,
    falhas: r.falhas.map((f) => {
      const e = f.celula ? casa(p.bruto(f.celula), f.celula) : undefined;
      return e ? { ...f, mensagem: e.dica } : f;
    }),
  };
}

function corrigirPorTipo(ex: Exercicio, p: Planilha, tela?: EstadoTela): Resultado {
  const estado = () => estadoCorrecao(p, tela);
  switch (ex.type) {
    case "formula":
      return corrigirFormula(ex, p);
    case "text_answer":
      return validarTextAnswer(ex, estado());
    case "click_cell":
      return validarClickCell(ex, estado());
    case "select_range":
      return validarSelectRange(ex, estado());
    case "type_value":
      return validarTypeValue(ex, estado());
    case "format_cell":
      return validarFormatCell(ex, estado());
  }
}
