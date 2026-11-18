import { NextResponse } from "next/server";
import { z } from "zod";
import { testeDoModulo } from "@/content";
import { conferirQuestao } from "@/grader/conferir-teste";
import { lerJsonLimitado, limitar } from "@/lib/limite";
import { respostaQuestaoSchema } from "@/lib/teste-publico";

/** Uma questão por pedido: { modulo, indice, resposta } → { ok }. */
const pedido = z.object({
  modulo: z.string().regex(/^[a-z-]+$/).max(40),
  indice: z.number().int().min(0).max(20),
  resposta: respostaQuestaoSchema,
});

/** Uma questão não passa disto (a grade tem no máximo 1.300 células). */
const MAX_CORPO = 256 * 1024;

/**
 * Corrige uma questão do teste do módulo.
 *
 * Por quê no servidor: o navegador recebe a questão sem gabarito
 * (src/lib/teste-publico.ts), então só o servidor sabe a resposta. A
 * correção é a mesma do certificado (conferirQuestao), com o exercício
 * original. Não exige login: o teste é aberto; o certificado continua
 * exigindo e corrige tudo de novo.
 */
export async function POST(request: Request) {
  const limite = limitar(request.headers, "corrigirTeste");
  if (limite) return limite;
  const corpo = await lerJsonLimitado(request, MAX_CORPO);
  if ("grande" in corpo) return erro(413, "Resposta grande demais.");
  const dados = pedido.safeParse(corpo.dados);
  if (!dados.success) return erro(400, "Dados inválidos.");
  const { modulo, indice, resposta } = dados.data;
  const questao = testeDoModulo(modulo)[indice];
  if (!questao) return erro(404, "Questão não encontrada.");
  return NextResponse.json({ ok: conferirQuestao(questao, resposta) });
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
