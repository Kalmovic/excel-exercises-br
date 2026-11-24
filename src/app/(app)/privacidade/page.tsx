import type { Metadata } from "next";
import Link from "next/link";
import { Documento, Email, type Secao } from "@/components/site/Documento";
import { EMPRESA } from "@/lib/empresa";
import { NOME_SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Quais dados o ${NOME_SITE} coleta, para quê, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos pela LGPD.`,
  alternates: { canonical: "/privacidade" },
};

/** O que o site guarda, para quê e por qual base legal (art. 7º da LGPD). Mantenha em dia com o código. */
const DADOS: [string, string, string][] = [
  ["Sem conta: progresso dos exercícios, sequência do desafio e de onde você veio (UTM)", "Guardar seu avanço e medir quais canais trazem visitantes", "Nenhuma: não sai do seu navegador"],
  ["E-mail", "Entrar na conta pelo código enviado por e-mail", "Execução do contrato"],
  ["Nome", "Mostrar na conta e imprimir no certificado", "Execução do contrato"],
  ["Progresso, respostas e resultados dos testes", "Salvar seu avanço entre aparelhos, corrigir os testes e emitir certificados", "Execução do contrato"],
  ["CPF ou CNPJ e endereço", "Emitir a nota fiscal de cada pagamento", "Obrigação legal"],
  ["Dados do pagamento (plano, status, datas; nunca o número do cartão)", "Liberar e manter o acesso Pro, reembolsos e contestações", "Execução do contrato"],
  ["Código de afiliado ou cupom de quem te indicou", "Atribuir a indicação e aplicar o desconto", "Legítimo interesse"],
  ["Formulário de empresas e universidades (nome, e-mail, empresa, mensagem)", "Responder ao seu contato", "Procedimentos preliminares de contrato"],
  ["Endereço IP e registros técnicos de acesso", "Segurança, limite de tentativas e investigação de erros", "Legítimo interesse e obrigação legal (Marco Civil)"],
];

const FORNECEDORES: [string, string][] = [
  ["Vercel", "hospedagem do site e estatísticas de visita agregadas (sem cookies de rastreamento)"],
  ["Supabase", "banco de dados e login por e-mail"],
  ["Stripe", "pagamento com cartão e Pix (recebe os dados do cartão diretamente)"],
  ["Asaas", "emissão da nota fiscal (recebe nome, CPF/CNPJ, e-mail e endereço)"],
  ["Prefeitura e Receita (Emissor Nacional de NFS-e)", "registro oficial da nota fiscal"],
];

const secoes: Secao[] = [
  {
    id: "controlador",
    titulo: "Quem cuida dos seus dados",
    conteudo: (
      <>
        <p>
          O controlador dos dados é <strong>{EMPRESA.razaoSocial}</strong>, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco ?? `com sede em ${EMPRESA.cidade}`}, que
          oferece o {NOME_SITE}.
        </p>
        <p>
          Canal para assuntos de dados pessoais (encarregado): <Email />.
        </p>
      </>
    ),
  },
  {
    id: "dados",
    titulo: "Quais dados coletamos e para quê",
    conteudo: (
      <>
        <p>Coletamos só o necessário para o site funcionar. Sem conta, você pode fazer os exercícios grátis sem nos dar nenhum dado pessoal.</p>
        {/* Celular: um cartão por dado. Telas maiores: tabela. */}
        <ul className="space-y-2 sm:hidden">
          {DADOS.map(([dado, para, base]) => (
            <li key={dado} className="ml-0! list-none! rounded-lg border border-line bg-surface p-3 text-sm">
              <p className="font-semibold text-ink">{dado}</p>
              <p>{para}</p>
              <p className="text-muted">Base legal: {base}</p>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-2 pr-3 font-semibold">Dado</th>
                <th className="py-2 pr-3 font-semibold">Para quê</th>
                <th className="py-2 font-semibold">Base legal</th>
              </tr>
            </thead>
            <tbody>
              {DADOS.map(([dado, para, base]) => (
                <tr key={dado} className="border-b border-line align-top">
                  <td className="py-2 pr-3">{dado}</td>
                  <td className="py-2 pr-3">{para}</td>
                  <td className="py-2">{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Não vendemos seus dados e não usamos seus dados para publicidade de terceiros.</p>
      </>
    ),
  },
  {
    id: "certificado",
    titulo: "Certificados públicos",
    conteudo: (
      <p>
        Cada certificado tem um código para qualquer pessoa conferir se ele é verdadeiro. Quem tiver o código vê o nome impresso, o módulo, a nota e a
        data. Só compartilhe o código com quem você quiser.
      </p>
    ),
  },
  {
    id: "cookies",
    titulo: "Cookies e armazenamento no navegador",
    conteudo: (
      <ul>
        <li>
          <strong>Sessão da conta:</strong> cookies necessários para você continuar logado.
        </li>
        <li>
          <strong>Indicação:</strong> os cookies <code>planilhes_ref</code> e <code>planilhes_cupom</code> guardam por 60 dias o código de quem te
          indicou, para o desconto e a comissão do afiliado.
        </li>
        <li>
          <strong>Armazenamento local:</strong> progresso, preferências e a origem da primeira visita ficam no seu navegador. Limpar os dados do site
          apaga tudo isso (quem tem conta recupera o progresso ao entrar).
        </li>
        <li>
          <strong>Estatísticas:</strong> contamos visitas e ações (como &quot;começou um exercício&quot;) de forma agregada, sem cookies de rastreamento e
          sem identificar você.
        </li>
      </ul>
    ),
  },
  {
    id: "compartilhamento",
    titulo: "Com quem compartilhamos",
    conteudo: (
      <>
        <p>Só com os fornecedores que fazem o site funcionar, cada um com os dados de que precisa:</p>
        <ul>
          {FORNECEDORES.map(([nome, para]) => (
            <li key={nome}>
              <strong>{nome}:</strong> {para}.
            </li>
          ))}
        </ul>
        <p>Também podemos fornecer dados quando a lei ou uma ordem judicial exigir.</p>
      </>
    ),
  },
  {
    id: "internacional",
    titulo: "Transferência para fora do Brasil",
    conteudo: (
      <p>
        Alguns fornecedores (como Vercel, Supabase e Stripe) guardam dados em servidores fora do Brasil, por exemplo nos Estados Unidos. Eles seguem
        contratos com cláusulas de proteção de dados, conforme o art. 33 da LGPD.
      </p>
    ),
  },
  {
    id: "retencao",
    titulo: "Por quanto tempo guardamos",
    conteudo: (
      <ul>
        <li>Dados da conta e progresso: enquanto a conta existir. Pedindo a exclusão, apagamos em até 15 dias.</li>
        <li>Dados de pagamento e notas fiscais: 5 anos, porque a legislação fiscal exige.</li>
        <li>Registros de acesso: até 6 meses, como pede o Marco Civil da Internet.</li>
        <li>Certificados: enquanto a conta existir, para que possam ser conferidos; você pode pedir a exclusão.</li>
        <li>Contatos de empresas e universidades: até 2 anos depois da última conversa.</li>
      </ul>
    ),
  },
  {
    id: "direitos",
    titulo: "Seus direitos",
    conteudo: (
      <>
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados errados ou desatualizados;</li>
          <li>exclusão da conta e dos dados (menos o que a lei manda guardar, como as notas fiscais);</li>
          <li>portabilidade, informação sobre com quem compartilhamos e revisão de consentimento.</li>
        </ul>
        <p>
          Peça pelo <Email />, do e-mail da sua conta. Respondemos em até 15 dias. Se não ficar satisfeito, você pode reclamar na Autoridade Nacional
          de Proteção de Dados (ANPD).
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    titulo: "Segurança",
    conteudo: (
      <p>
        Usamos conexão criptografada (HTTPS), login sem senha por código de uso único, acesso ao banco restrito por regras por usuário e limite de
        tentativas. Nenhum sistema é 100% seguro: se houver um incidente que possa te afetar, avisamos você e a ANPD.
      </p>
    ),
  },
  {
    id: "menores",
    titulo: "Menores de idade",
    conteudo: <p>O {NOME_SITE} é para adultos e estudantes. Menores de 18 anos devem usar com autorização de um responsável, que pode pedir a exclusão dos dados.</p>,
  },
  {
    id: "mudancas",
    titulo: "Mudanças nesta política",
    conteudo: (
      <p>
        A data da versão fica no topo. Mudanças importantes são avisadas por e-mail a quem tem conta. Veja também os{" "}
        <Link href="/termos" className="underline">
          Termos de uso
        </Link>
        .
      </p>
    ),
  },
];

export default function Pagina() {
  return (
    <Documento
      titulo="Política de privacidade"
      resumo={
        <p>
          <strong>Em resumo:</strong> sem conta, seus dados ficam só no seu navegador. Com conta, guardamos e-mail, nome e progresso; no pagamento,
          CPF/CNPJ e endereço para a nota fiscal. O cartão vai direto para a Stripe. Não vendemos dados. Para ver, corrigir ou apagar seus dados,
          escreva para o e-mail de contato.
        </p>
      }
      secoes={secoes}
    />
  );
}
