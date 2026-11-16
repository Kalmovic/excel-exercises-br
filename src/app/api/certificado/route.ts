import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { testeDoModulo } from "@/content";
import { PAYWALL_ATIVO } from "@/lib/acesso-conteudo";
import { usuarioEhPro } from "@/lib/acesso";
import { conferirTeste } from "@/grader/conferir-teste";
import { APROVACAO } from "@/lib/testes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

const resposta = z.object({
  conteudos: z.record(z.string(), z.string()),
  formatos: z.record(z.string(), z.enum(["moeda", "percentual", "geral"])).optional(),
  resposta: z.string().optional(),
  ativa: z.string().optional(),
  selecao: z.string().optional(),
});
const pedido = z.object({
  modulo: z.string().regex(/^[a-z-]+$/).max(40),
  nome: z.string().trim().min(3, "Escreva seu nome completo.").max(80),
  entregas: z.array(resposta).max(10),
});

// Sem letras e números que se confundem (O/0, I/1).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const novoCodigo = () => {
  const c = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
};

/**
 * Emite o certificado do módulo. O servidor NÃO confia no "aprovado" do
 * navegador: corrige de novo as respostas enviadas, com o mesmo motor.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Entre na sua conta para emitir o certificado.");
  if (!process.env.SUPABASE_SECRET_KEY) return erro(503, "Certificados ainda não estão ligados.");
  if (PAYWALL_ATIVO && !(await usuarioEhPro())) return erro(402, "O certificado faz parte do Pro.");

  const dados = pedido.safeParse(await request.json().catch(() => null));
  if (!dados.success) return erro(400, dados.error.issues[0]?.message ?? "Dados inválidos.");
  const { modulo, entregas } = dados.data;
  const nome = dados.data.nome.replace(/\s+/g, " ");

  const questoes = testeDoModulo(modulo);
  if (questoes.length === 0) return erro(404, "Módulo sem teste.");
  const acertos = conferirTeste(questoes, entregas).filter(Boolean).length;
  if (acertos < APROVACAO) {
    console.log(JSON.stringify({ tipo: "certificado_recusado", modulo, acertos, usuario: usuario.id }));
    return erro(422, `Na conferência, suas respostas somaram ${acertos} de ${questoes.length}. Refaça o teste para emitir.`);
  }

  const admin = supabaseAdmin();
  const { data: existente } = await admin
    .from("certificados")
    .select("codigo, acertos")
    .eq("usuario_id", usuario.id)
    .eq("modulo", modulo)
    .maybeSingle<{ codigo: string; acertos: number }>();

  // Já tinha: mantém o código (links já compartilhados continuam valendo) e atualiza nome e nota.
  if (existente) {
    await admin
      .from("certificados")
      .update({ nome, acertos: Math.max(acertos, existente.acertos) })
      .eq("codigo", existente.codigo);
    await admin.from("perfis").update({ nome }).eq("id", usuario.id);
    return NextResponse.json({ codigo: existente.codigo });
  }

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = novoCodigo();
    const { error } = await admin.from("certificados").insert({ codigo, usuario_id: usuario.id, modulo, nome, acertos, total: questoes.length });
    if (!error) {
      await admin.from("perfis").update({ nome }).eq("id", usuario.id);
      console.log(JSON.stringify({ tipo: "certificado_emitido", modulo, codigo }));
      return NextResponse.json({ codigo });
    }
    if (error.code !== "23505") {
      console.error(JSON.stringify({ tipo: "erro_certificado", mensagem: error.message }));
      break;
    }
    // 23505 = código repetido (raríssimo): tenta outro.
  }
  return erro(500, "Não deu certo agora. Tente de novo em alguns minutos.");
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
