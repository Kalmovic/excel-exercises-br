import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MODULOS } from "@/content";
import { PAYWALL_ATIVO } from "@/lib/acesso-conteudo";
import { usuarioEhPro } from "@/lib/acesso";
import { ESPECIALISTA, faltamParaEspecialista, modulosDoEspecialista } from "@/lib/especialista";
import { lerJsonLimitado, limitar } from "@/lib/limite";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

const pedido = z.object({ nome: z.string().trim().min(3, "Escreva seu nome completo.").max(80) });
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const novoCodigo = () => {
  const c = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
};

/**
 * Certificado de Especialista: a trilha inteira. Só sai para quem já tem o
 * certificado de TODOS os módulos (cada um emitido com a correção refeita no
 * servidor), conferido aqui direto no banco.
 *
 * Como o de módulo, não muda depois de emitido (nem o nome).
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Entre na sua conta para emitir o certificado.");
  if (!process.env.SUPABASE_SECRET_KEY) return erro(503, "Certificados ainda não estão ligados.");
  const limite = limitar(request.headers, "especialista", usuario.id);
  if (limite) return limite;
  if (PAYWALL_ATIVO && !(await usuarioEhPro())) return erro(402, "O certificado faz parte do Pro.");
  const corpo = await lerJsonLimitado(request, 4096);
  if ("grande" in corpo) return erro(413, "Dados grandes demais.");
  const dados = pedido.safeParse(corpo.dados);
  if (!dados.success) return erro(400, dados.error.issues[0]?.message ?? "Dados inválidos.");
  const nome = dados.data.nome.replace(/\s+/g, " ");

  const admin = supabaseAdmin();
  const buscar = async () =>
    (await admin.from("certificados").select("codigo, modulo").eq("usuario_id", usuario.id).returns<{ codigo: string; modulo: string }[]>()).data ?? [];
  const lista = await buscar();
  const existente = lista.find((c) => c.modulo === ESPECIALISTA);
  if (existente) return NextResponse.json({ codigo: existente.codigo });
  const faltam = faltamParaEspecialista(lista.map((c) => c.modulo));
  if (faltam.length > 0) {
    const nomes = faltam.map((m) => MODULOS.find((x) => x.slug === m)?.titulo ?? m).join(", ");
    return erro(422, `Ainda falta o certificado de: ${nomes}.`);
  }

  const total = modulosDoEspecialista().length;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = novoCodigo();
    const { error } = await admin
      .from("certificados")
      .insert({ codigo, usuario_id: usuario.id, modulo: ESPECIALISTA, nome, acertos: total, total });
    if (!error) {
      await admin.from("perfis").update({ nome }).eq("id", usuario.id);
      console.log(JSON.stringify({ tipo: "certificado_especialista_emitido", codigo }));
      return NextResponse.json({ codigo });
    }
    if (error.code !== "23505") break;
    // Outro pedido ao mesmo tempo já emitiu (regra "um por aluno"): devolve aquele.
    const ganhou = (await buscar()).find((c) => c.modulo === ESPECIALISTA);
    if (ganhou) return NextResponse.json({ codigo: ganhou.codigo });
  }
  return erro(500, "Não deu certo agora. Tente de novo em alguns minutos.");
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
