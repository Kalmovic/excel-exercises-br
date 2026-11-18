import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { testeDoModulo } from "@/content";
import { PAYWALL_ATIVO } from "@/lib/acesso-conteudo";
import { usuarioEhPro } from "@/lib/acesso";
import { conferirTeste } from "@/grader/conferir-teste";
import { lerJsonLimitado, limitar } from "@/lib/limite";
import { comoRespostaQuestao, respostaQuestaoSchema } from "@/lib/teste-publico";
import { APROVACAO } from "@/lib/testes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

const pedido = z.object({
  modulo: z.string().regex(/^[a-z-]+$/).max(40),
  nome: z.string().trim().min(3, "Escreva seu nome completo.").max(80),
  entregas: z.array(respostaQuestaoSchema).max(10),
});

/** Dez questões cabem com folga (cada uma tem no máximo uma grade de 1.300 células). */
const MAX_CORPO = 1024 * 1024;

// Sem letras e números que se confundem (O/0, I/1).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const novoCodigo = () => {
  const c = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
};

type Admin = ReturnType<typeof supabaseAdmin>;
const certificadoDe = async (admin: Admin, usuario: string, modulo: string) =>
  (await admin.from("certificados").select("codigo").eq("usuario_id", usuario).eq("modulo", modulo).maybeSingle<{ codigo: string }>()).data;

/** O insert bateu na regra "um certificado por módulo por aluno" (outro pedido ao mesmo tempo ganhou). */
const ehDuplicadoDoAluno = (e: { code?: string; message?: string; details?: string }) =>
  e.code === "23505" && /usuario_id/.test(`${e.message ?? ""} ${e.details ?? ""}`);

/**
 * Emite o certificado do módulo. O servidor NÃO confia no "aprovado" do
 * navegador: corrige de novo as respostas enviadas, com o mesmo motor.
 *
 * Emitido uma vez, não muda mais: nome, nota e data ficam como na emissão.
 * Se desse para trocar o nome depois, um link já verificado passaria a valer
 * para outra pessoa, com a data original.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Entre na sua conta para emitir o certificado.");
  if (!process.env.SUPABASE_SECRET_KEY) return erro(503, "Certificados ainda não estão ligados.");
  const limite = limitar(request.headers, "certificado", usuario.id);
  if (limite) return limite;
  if (PAYWALL_ATIVO && !(await usuarioEhPro())) return erro(402, "O certificado faz parte do Pro.");

  const corpo = await lerJsonLimitado(request, MAX_CORPO);
  if ("grande" in corpo) return erro(413, "Respostas grandes demais.");
  const dados = pedido.safeParse(corpo.dados);
  if (!dados.success) return erro(400, dados.error.issues[0]?.message ?? "Dados inválidos.");
  const { modulo, entregas } = dados.data;
  const nome = dados.data.nome.replace(/\s+/g, " ");

  const questoes = testeDoModulo(modulo);
  if (questoes.length === 0) return erro(404, "Módulo sem teste.");

  // Já tinha: devolve o mesmo (links já compartilhados continuam valendo), sem corrigir de novo.
  const admin = supabaseAdmin();
  const existente = await certificadoDe(admin, usuario.id, modulo);
  if (existente) return NextResponse.json({ codigo: existente.codigo });

  const acertos = conferirTeste(questoes, entregas.map(comoRespostaQuestao)).filter(Boolean).length;
  if (acertos < APROVACAO) {
    console.log(JSON.stringify({ tipo: "certificado_recusado", modulo, acertos, usuario: usuario.id }));
    return erro(422, `Na conferência, suas respostas somaram ${acertos} de ${questoes.length}. Refaça o teste para emitir.`);
  }

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = novoCodigo();
    const { error } = await admin.from("certificados").insert({ codigo, usuario_id: usuario.id, modulo, nome, acertos, total: questoes.length });
    if (!error) {
      await admin.from("perfis").update({ nome }).eq("id", usuario.id);
      console.log(JSON.stringify({ tipo: "certificado_emitido", modulo, codigo }));
      return NextResponse.json({ codigo });
    }
    if (ehDuplicadoDoAluno(error)) {
      const ganhou = await certificadoDe(admin, usuario.id, modulo);
      if (ganhou) return NextResponse.json({ codigo: ganhou.codigo });
    }
    if (error.code !== "23505") {
      console.error(JSON.stringify({ tipo: "erro_certificado", mensagem: error.message }));
      break;
    }
    // 23505 no código (raríssimo): tenta outro.
  }
  return erro(500, "Não deu certo agora. Tente de novo em alguns minutos.");
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
