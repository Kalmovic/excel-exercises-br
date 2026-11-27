import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { botaoClaro, botaoEscuro, Cartoes, Passos, Perguntas, Secao, Topo } from "@/components/publico/blocos";
import { FormContato } from "@/components/publico/FormContato";
import { B2B_NO_AR, NOME_SITE, PRECO_EMPRESAS, reais } from "@/lib/site";

const TITULO = "Treinamento de Excel para equipes: nivelamento com resultado medido";
const DESCRICAO =
  "Nivele o Excel da sua equipe com exercícios práticos em português. Contrato anual por pessoa, com nota fiscal, boleto ou Pix, link de convite e painel do gestor.";

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/empresas" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/empresas" },
};

const DORES = [
  { titulo: "Retrabalho", texto: "Planilhas refeitas à mão porque ninguém confia na fórmula." },
  { titulo: "Erros caros", texto: "Uma referência sem $ ou um PROCV sem FALSO, e o relatório vai errado para a diretoria." },
  { titulo: "Onboarding lento", texto: "Gente nova que demora semanas para dominar as planilhas da área." },
];

const COMO_FUNCIONA: [string, string][] = [
  ["Proposta", "Você conta quantas pessoas e para quem vai a cobrança. Mandamos a proposta com o valor fechado do ano."],
  ["Fatura", "Aprovada a proposta, a fatura chega no e-mail do financeiro: boleto, Pix ou cartão, com nota fiscal para o CNPJ."],
  ["Link de convite", "Com o pagamento confirmado, o gestor recebe o link. Cada pessoa entra com o próprio e-mail e ganha o Pro na hora."],
  ["Painel do gestor", "Vagas usadas, lições concluídas, certificados e último acesso de cada pessoa. Trocou alguém? Remove e a vaga fica livre."],
];

const FAQ: [string, string][] = [
  [
    "Quanto custa?",
    `A partir de ${reais(PRECO_EMPRESAS.porPessoaDesde)} por pessoa por mês, com mínimo de ${PRECO_EMPRESAS.minimoPessoas} pessoas e contrato anual (${reais(PRECO_EMPRESAS.porPessoaDesde * 12)} por pessoa no ano, pago de uma vez).`,
  ],
  ["Emitem nota fiscal?", "Sim, NFS-e para o CNPJ da empresa, com pagamento por boleto, Pix ou cartão."],
  ["Precisa instalar alguma coisa?", "Não. Tudo roda no navegador, sem instalar nada e sem licença de Excel."],
  ["Como acompanho o progresso da equipe?", "No painel do gestor: quem entrou, quantas lições cada pessoa concluiu, os certificados e o último acesso."],
  ["E se alguém sair da empresa?", "O gestor remove a pessoa no painel e a vaga fica livre para outra, sem custo. O progresso da pessoa continua na conta dela."],
  ["O que o gestor vê dos funcionários?", "Nome, e-mail e progresso (lições, certificados, último acesso). Não vê as respostas. A pessoa é avisada disso antes de entrar na equipe."],
];

export default function Empresas() {
  if (!B2B_NO_AR) notFound();
  return (
    <div className="space-y-14">
      <Topo
        selo="Para empresas"
        titulo="Sua equipe fluente em Excel, com o resultado medido."
        cta={
          <>
            <a href="#contato" className={botaoEscuro}>
              Pedir proposta
            </a>
            <a href="#como-funciona" className={botaoClaro}>
              Como funciona
            </a>
          </>
        }
      >
        <p>
          Exercícios práticos em português, no navegador, com correção na hora. A partir de {reais(PRECO_EMPRESAS.porPessoaDesde)} por pessoa por mês
          (contrato anual, mínimo de {PRECO_EMPRESAS.minimoPessoas} pessoas), com painel para o gestor acompanhar cada pessoa.
        </p>
      </Topo>
      <Secao rotulo="O problema" titulo="Quanto custa o time não saber Excel?">
        <Cartoes itens={DORES} />
      </Secao>
      <Secao id="como-funciona" rotulo="Como funciona a contratação" titulo="Da proposta ao painel, em quatro passos">
        <Passos itens={COMO_FUNCIONA} />
      </Secao>
      <Secao id="contato" rotulo="Pedir proposta" titulo="Vamos montar a proposta da sua equipe">
        <p className="max-w-2xl text-muted">Conte quantas pessoas e o que a equipe faz no Excel. Respondemos com a proposta em até 2 dias úteis.</p>
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
          <FormContato formulario="contato" publico="empresa" rotuloBotao="Pedir proposta" />
        </div>
      </Secao>
      <Secao rotulo="Perguntas frequentes" titulo="Sobre o Planilhês para empresas">
        <Perguntas itens={FAQ} />
      </Secao>
      <Secao id="indicar" rotulo="Indique e ganhe" titulo="Conhece uma empresa que precisa disso?">
        <p className="max-w-2xl text-muted">
          Indique uma empresa ou faculdade. Se a indicação virar contrato, você recebe uma recompensa: as condições são
          combinadas depois que a empresa paga. Se a indicada for a empresa onde você trabalha, a recompensa é em acesso
          ao Pro, não em dinheiro.
        </p>
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
          <FormContato formulario="indicacao" />
        </div>
      </Secao>
    </div>
  );
}
