import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ErroAsaas,
  apagarCobranca,
  asaasConfigurado,
  cancelarAssinatura,
  criarAssinaturaMensal,
  criarCliente,
  criarCobrancaAnual,
  primeiraCobranca,
} from "@/lib/asaas";
import { cpfValido, digitosCpf } from "@/lib/cpf";
import { hojeSP, somarDias } from "@/lib/data-sp";
import { PRECO } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/supabase/servidor";

const pedido = z.object({
  plano: z.enum(["mensal", "anual"]),
  nome: z.string().trim().min(3, "Escreva seu nome completo.").max(80),
  cpf: z.string().refine(cpfValido, "Confira o CPF: os dígitos não batem."),
});

type Linha = {
  plano: string;
  status: string;
  acesso_ate: string | null;
  asaas_cliente_id: string | null;
  asaas_assinatura_id: string | null;
  asaas_cobranca_id: string | null;
};

/**
 * Checkout: cria a cobrança no Asaas e devolve a página de pagamento dele.
 *
 * O aluno NÃO vira Pro aqui: só fica "pendente". Quem libera o acesso é o
 * webhook, quando o Asaas avisa que o pagamento foi confirmado.
 */
export async function POST(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Entre na sua conta para assinar.");
  // Sem a chave do Asaas ou a chave secreta do Supabase (que grava a assinatura), não há checkout.
  if (!asaasConfigurado() || !process.env.SUPABASE_SECRET_KEY) return erro(503, "Pagamentos ainda não estão ligados.");

  const dados = pedido.safeParse(await request.json().catch(() => null));
  if (!dados.success) return erro(400, dados.error.issues[0]?.message ?? "Dados inválidos.");
  const { plano, nome } = dados.data;
  const cpf = digitosCpf(dados.data.cpf);

  const admin = supabaseAdmin();
  const { data: atual } = await admin.from("assinaturas").select("*").eq("usuario_id", usuario.id).maybeSingle<Linha>();
  if (atual?.acesso_ate && new Date(atual.acesso_ate) > new Date())
    return erro(409, `Você já é Pro até ${new Date(atual.acesso_ate).toLocaleDateString("pt-BR")}.`);

  try {
    // Checkout anterior abandonado: some com a cobrança velha para não ficar gerando boleto.
    if (atual?.status === "pendente") {
      if (atual.asaas_assinatura_id) await cancelarAssinatura(atual.asaas_assinatura_id).catch(() => {});
      if (atual.asaas_cobranca_id) await apagarCobranca(atual.asaas_cobranca_id).catch(() => {});
    }

    const cliente = atual?.asaas_cliente_id ?? (await criarCliente({ nome, email: usuario.email ?? "", cpf, usuarioId: usuario.id })).id;
    const hoje = hojeSP();
    let assinaturaId: string | null = null;
    let cobranca;
    if (plano === "mensal") {
      const assinatura = await criarAssinaturaMensal({ cliente, valor: PRECO.mensal, hoje, usuarioId: usuario.id });
      assinaturaId = assinatura.id;
      cobranca = await primeiraCobranca(assinatura.id);
      if (!cobranca) throw new Error("assinatura criada sem cobrança");
    } else {
      cobranca = await criarCobrancaAnual({ cliente, valor: PRECO.anual, vencimento: somarDias(hoje, 3), usuarioId: usuario.id });
    }

    // Com a chave secreta: o aluno não pode escrever na própria assinatura.
    const { error } = await admin.from("assinaturas").upsert({
      usuario_id: usuario.id,
      plano,
      status: "pendente",
      asaas_cliente_id: cliente,
      asaas_assinatura_id: assinaturaId,
      asaas_cobranca_id: plano === "anual" ? cobranca.id : null,
      fatura_url: cobranca.invoiceUrl,
      atualizado_em: new Date().toISOString(),
    });
    if (error) throw new Error(`gravar assinatura: ${error.message}`);
    console.log(JSON.stringify({ tipo: "checkout_criado", plano, usuario: usuario.id }));
    return NextResponse.json({ url: cobranca.invoiceUrl });
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro_checkout", mensagem: String(e) }));
    if (e instanceof ErroAsaas && e.status === 400)
      return erro(400, e.detalhes[0]?.description ?? "O Asaas recusou os dados. Confira o nome e o CPF.");
    return erro(502, "Não conseguimos falar com o sistema de pagamento. Tente de novo em alguns minutos.");
  }
}

const erro = (status: number, mensagem: string) => NextResponse.json({ erro: mensagem }, { status });
