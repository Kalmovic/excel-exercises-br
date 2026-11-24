import type { Metadata } from "next";
import Link from "next/link";
import { Documento, Email, type Secao } from "@/components/site/Documento";
import { EMPRESA } from "@/lib/empresa";
import { NOME_SITE, PRECO, reais } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `As regras de uso do ${NOME_SITE}: conta, plano Pro, pagamento, cancelamento, garantia de ${PRECO.garantiaDias} dias e certificados.`,
  alternates: { canonical: "/termos" },
};

const secoes: Secao[] = [
  {
    id: "quem-somos",
    titulo: "Quem somos",
    conteudo: (
      <p>
        O {NOME_SITE} é uma plataforma online de exercícios práticos de Excel, oferecida por <strong>{EMPRESA.razaoSocial}</strong>, CNPJ{" "}
        {EMPRESA.cnpj}, {EMPRESA.endereco ?? `com sede em ${EMPRESA.cidade}`}. Fale com a gente pelo e-mail <Email />.
      </p>
    ),
  },
  {
    id: "aceite",
    titulo: "Aceite destes termos",
    conteudo: (
      <p>
        Ao usar o site, criar uma conta ou assinar o plano Pro, você concorda com estes termos e com a{" "}
        <Link href="/privacidade" className="underline">
          Política de privacidade
        </Link>
        . Se não concordar, não use o serviço. Menores de 18 anos devem usar o site com autorização de um responsável.
      </p>
    ),
  },
  {
    id: "servico",
    titulo: "O que oferecemos",
    conteudo: (
      <>
        <p>
          Exercícios de Excel em português numa planilha simulada no navegador, com correção automática, lições organizadas em módulos, testes de
          módulo e certificados.
        </p>
        <ul>
          <li>
            <strong>Grátis:</strong> sem cadastro, a primeira lição de cada módulo, o desafio do dia e as páginas abertas. O progresso fica salvo no
            seu navegador.
          </li>
          <li>
            <strong>Pro:</strong> todas as lições, os testes de módulo, os certificados e a prática extra.
          </li>
        </ul>
        <p>
          A planilha do {NOME_SITE} simula o Excel em português, mas não é o Microsoft Excel. Em casos raros, um resultado pode diferir do Excel; se
          encontrar um, avise pelo e-mail que corrigimos. &quot;Excel&quot; e &quot;Microsoft&quot; são marcas da Microsoft Corporation, que não tem
          relação com o {NOME_SITE}.
        </p>
        <p>Podemos melhorar, mudar ou retirar exercícios e recursos com o tempo, sem reduzir o que o plano Pro já pago oferece no período contratado.</p>
      </>
    ),
  },
  {
    id: "conta",
    titulo: "Sua conta",
    conteudo: (
      <ul>
        <li>A conta é pessoal: entre com o seu e-mail, pelo código que enviamos. Não compartilhe o acesso.</li>
        <li>Você responde pelo que é feito na sua conta. Se suspeitar de uso indevido, avise pelo e-mail.</li>
        <li>O nome que você informa para o certificado deve ser o seu nome real.</li>
      </ul>
    ),
  },
  {
    id: "pro",
    titulo: "Plano Pro, preços e pagamento",
    conteudo: (
      <>
        <ul>
          <li>
            <strong>Mensal:</strong> {reais(PRECO.mensal)} por mês, cobrado no cartão e renovado automaticamente todo mês até você cancelar.
          </li>
          <li>
            <strong>Anual:</strong> {reais(PRECO.anual)} por 12 meses de acesso, à vista no Pix ou no cartão em até {PRECO.parcelasAnual}x. O anual{" "}
            <strong>não renova sozinho</strong>.
          </li>
        </ul>
        <p>
          O pagamento é processado pela Stripe. Os dados do cartão vão direto para ela; o {NOME_SITE} não vê nem guarda o número do cartão. O acesso
          Pro começa quando o pagamento é confirmado (no Pix e no boleto, pode levar alguns minutos).
        </p>
        <p>
          Para cada pagamento emitimos nota fiscal de serviço (NFS-e), enviada ao seu e-mail. Por isso o pagamento pede CPF ou CNPJ e endereço.
        </p>
        <p>
          Mudanças de preço valem só para novas assinaturas ou renovações, e avisamos com pelo menos 30 dias de antecedência quem tem o mensal.
        </p>
      </>
    ),
  },
  {
    id: "cancelamento",
    titulo: "Cancelamento, garantia e reembolso",
    conteudo: (
      <>
        <ul>
          <li>
            <strong>Garantia de {PRECO.garantiaDias} dias:</strong> nos primeiros {PRECO.garantiaDias} dias depois do primeiro pagamento, peça pelo
            e-mail <Email /> e devolvemos o valor inteiro, sem perguntas. É também o seu direito de arrependimento (art. 49 do Código de Defesa do
            Consumidor).
          </li>
          <li>
            <strong>Mensal:</strong> cancele quando quiser em Minha conta. A renovação para e você continua Pro até o fim do mês já pago; não há
            multa nem reembolso proporcional do mês em curso.
          </li>
          <li>
            <strong>Anual:</strong> depois da garantia, não há reembolso proporcional, e o acesso vale até o fim dos 12 meses.
          </li>
        </ul>
        <p>Com o reembolso, o acesso Pro termina e a nota fiscal daquele pagamento é cancelada. Uma contestação da compra no cartão (chargeback) também encerra o acesso.</p>
      </>
    ),
  },
  {
    id: "certificados",
    titulo: "Certificados",
    conteudo: (
      <ul>
        <li>O certificado comprova a aprovação nos testes do {NOME_SITE}, corrigidos no nosso servidor. Cada um tem um código que qualquer pessoa pode conferir no site.</li>
        <li>É um certificado livre de curso online: não é diploma nem certificação oficial do MEC ou da Microsoft.</li>
        <li>Podemos anular um certificado obtido com fraude (por exemplo, respostas automatizadas ou conta de outra pessoa).</li>
      </ul>
    ),
  },
  {
    id: "uso",
    titulo: "Uso permitido",
    conteudo: (
      <>
        <p>Não é permitido:</p>
        <ul>
          <li>compartilhar, revender ou emprestar o acesso Pro;</li>
          <li>copiar, baixar em massa ou republicar os exercícios, as soluções e as explicações;</li>
          <li>usar robôs ou scripts para responder exercícios e testes ou para sobrecarregar o site;</li>
          <li>tentar burlar o pagamento, a correção ou a segurança do site.</li>
        </ul>
        <p>Nesses casos, podemos suspender ou encerrar a conta. Se houver pagamento em vigor, devolvemos a parte não usada, salvo em caso de fraude.</p>
      </>
    ),
  },
  {
    id: "propriedade",
    titulo: "Propriedade intelectual",
    conteudo: (
      <p>
        Os exercícios, textos, explicações, o simulador de planilha e a marca {NOME_SITE} pertencem a {EMPRESA.razaoSocial}. A assinatura dá a você o
        direito de usar o conteúdo para estudo pessoal, sem transferir nenhum direito sobre ele. As planilhas e fórmulas que você monta nos exercícios
        são suas.
      </p>
    ),
  },
  {
    id: "responsabilidade",
    titulo: "Disponibilidade e responsabilidade",
    conteudo: (
      <>
        <p>
          Trabalhamos para o site ficar no ar o tempo todo, mas pode haver interrupções para manutenção ou por falhas de terceiros (hospedagem,
          pagamento). Se o Pro ficar fora do ar por vários dias seguidos por falha nossa, fale com a gente pelo e-mail.
        </p>
        <p>
          O {NOME_SITE} é uma ferramenta de estudo. As planilhas dos exercícios são fictícias; confira sempre os cálculos que você levar para o
          trabalho real.
        </p>
      </>
    ),
  },
  {
    id: "mudancas",
    titulo: "Mudanças nestes termos",
    conteudo: (
      <p>
        Podemos atualizar estes termos. A data da versão fica no topo da página. Mudanças importantes são avisadas por e-mail a quem tem conta, com pelo
        menos 15 dias de antecedência. Se você não concordar, pode cancelar antes de a mudança valer.
      </p>
    ),
  },
  {
    id: "lei",
    titulo: "Lei aplicável e atendimento",
    conteudo: (
      <p>
        Estes termos seguem as leis brasileiras, incluindo o Código de Defesa do Consumidor. Antes de qualquer outra medida, fale com a gente pelo{" "}
        <Email />: respondemos em até 5 dias úteis. Fica eleito o foro do domicílio do consumidor.
      </p>
    ),
  },
];

export default function Pagina() {
  return (
    <Documento
      titulo="Termos de uso"
      resumo={
        <p>
          <strong>Em resumo:</strong> a primeira lição de cada módulo é grátis. O Pro custa {reais(PRECO.mensal)}/mês ou {reais(PRECO.anual)}/ano, tem
          garantia de {PRECO.garantiaDias} dias com reembolso integral, e o mensal se cancela em um clique. A conta é pessoal e o certificado vale como
          certificado livre de curso online.
        </p>
      }
      secoes={secoes}
    />
  );
}
