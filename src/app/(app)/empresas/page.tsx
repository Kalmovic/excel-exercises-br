import type { Metadata } from "next";
import { Cartoes, Passos, Perguntas, Secao, Topo } from "@/components/publico/blocos";
import { FormContato } from "@/components/publico/FormContato";
import { NOME_SITE, PRECO_EMPRESAS, reais } from "@/lib/site";

const TITULO = "Treinamento de Excel para equipes: nivelamento com resultado medido";
const DESCRICAO =
  "Nivele o Excel da sua equipe com exercícios práticos em português. Piloto de 30 dias, relatório de resultado e contrato anual por pessoa, com nota fiscal e boleto.";

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

const PILOTO: [string, string][] = [
  ["Conversa", "Entendemos onde o Excel trava a equipe e quais funções importam para a área."],
  ["Nível de partida", "Medimos o nível de cada pessoa antes de começar."],
  ["30 dias de prática", "De 5 a 10 pessoas na trilha, alguns minutos por dia, com o desafio diário para manter o ritmo."],
  ["Relatório", "O nível antes e depois, por pessoa, para quem aprova o investimento."],
];

const FAQ: [string, string][] = [
  ["Quanto custa?", `A partir de ${reais(PRECO_EMPRESAS.porPessoaDesde)} por pessoa por mês, com mínimo de ${PRECO_EMPRESAS.minimoPessoas} pessoas e contrato anual. O piloto de 30 dias vem antes de qualquer contrato.`],
  ["Emitem nota fiscal?", "Sim, com pagamento por boleto ou Pix."],
  ["Precisa instalar alguma coisa?", "Não. Tudo roda no navegador, sem instalar nada e sem licença de Excel."],
  ["Como acompanho o progresso da equipe?", "No piloto, enviamos o relatório de progresso. O painel do gestor, com convites e exportação, está em construção."],
];

export default function Empresas() {
  return (
    <div className="space-y-14">
      <Topo selo="Para empresas" titulo="Sua equipe fluente em Excel, com o resultado medido.">
        <p>
          Exercícios práticos em português, no navegador, com correção na hora. Começa com um piloto de 30 dias e termina
          com um relatório de antes e depois.
        </p>
      </Topo>
      <Secao rotulo="O problema" titulo="Quanto custa o time não saber Excel?">
        <Cartoes itens={DORES} />
      </Secao>
      <Secao rotulo="Como funciona" titulo="Piloto de 30 dias">
        <Passos itens={PILOTO} />
      </Secao>
      <Secao id="contato" rotulo="Fale com a gente" titulo="Vamos montar o piloto da sua equipe">
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
          <FormContato formulario="contato" publico="empresa" />
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
