import type { Metadata } from "next";
import { Cartoes, Passos, Perguntas, Secao, Topo } from "@/components/publico/blocos";
import { FormContato } from "@/components/publico/FormContato";
import { NOME_SITE } from "@/lib/site";

const TITULO = "Excel para universidades: atividade complementar com resultado medido";
const DESCRICAO =
  "Ofereça aos alunos uma trilha prática de Excel em português, com certificado de carga horária para atividades complementares. Piloto gratuito para uma turma por um semestre.";

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/universidades" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/universidades" },
};

const PORQUE = [
  { titulo: "Empregabilidade", texto: "Excel aparece em quase toda vaga de estágio de Administração, Contábeis, Economia e Engenharia de Produção." },
  { titulo: "Atividades complementares", texto: "Certificado com carga horária, para o aluno lançar como atividade complementar.", selo: "Em construção" },
  { titulo: "Sem aula a mais", texto: "O aluno pratica sozinho, no navegador, alguns minutos por dia. O professor só acompanha." },
];

const PILOTO: [string, string][] = [
  ["Uma turma", "Um professor aliado escolhe uma turma para o piloto."],
  ["Acesso grátis", "Os alunos da turma usam o Pro de graça durante o semestre."],
  ["Antes e depois", "Medimos o nível no começo e no fim do semestre."],
  ["Proposta", "Com o resultado na mão, montamos a proposta para o curso ou a instituição."],
];

const FAQ: [string, string][] = [
  ["Quem costuma decidir?", "Coordenações de curso e núcleos de carreira. O piloto começa com um professor."],
  ["Como é a licença?", "Por aluno, por semestre, com nota fiscal e boleto. O valor é definido no primeiro piloto."],
  ["Funciona para instituição pública?", "Sim, dentro das regras de contratação pública. Fale com a gente para ver o caminho."],
];

export default function Universidades() {
  return (
    <div className="space-y-14">
      <Topo selo="Para universidades e faculdades" titulo="Excel na prática para os seus alunos.">
        <p>
          Uma trilha de exercícios em português, do zero ao PROCV, que o aluno faz no navegador e que vale como atividade
          complementar. Comece com uma turma, de graça, por um semestre.
        </p>
      </Topo>
      <Secao rotulo="Por que oferecer" titulo="O que muda para o aluno">
        <Cartoes itens={PORQUE} />
      </Secao>
      <Secao rotulo="Como começar" titulo="Piloto de um semestre">
        <Passos itens={PILOTO} />
      </Secao>
      <Secao id="contato" rotulo="Fale com a gente" titulo="Vamos montar o piloto da sua turma">
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
          <FormContato formulario="contato" publico="universidade" />
        </div>
      </Secao>
      <Secao rotulo="Perguntas frequentes" titulo="Sobre o Planilhês para universidades">
        <Perguntas itens={FAQ} />
      </Secao>
      <Secao id="indicar" rotulo="Indique" titulo="Conhece uma coordenação que precisa disso?">
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
          <FormContato formulario="indicacao" />
        </div>
      </Secao>
    </div>
  );
}
