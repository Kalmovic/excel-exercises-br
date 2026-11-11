import type { Metadata } from "next";
import { Cartoes, CtaTrilha, LinkExercicio, Perguntas, Secao, Topo, botaoClaro } from "@/components/publico/blocos";
import { ExercicioEmbutido } from "@/components/publico/ExercicioEmbutido";
import Link from "next/link";
import { NOME_SITE } from "@/lib/site";

const TITULO = "Teste de Excel para vaga de emprego: pratique antes da entrevista";
const DESCRICAO =
  "Prepare-se para o teste prático de Excel do processo seletivo: PROCV, SE, SOMASE, referência absoluta e mais, praticando numa planilha no navegador, em português e com correção na hora.";

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/teste-de-excel" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/teste-de-excel" },
};

const CAI = [
  { titulo: "PROCV e PROCX", texto: <>Buscar o preço de um código ou o salário de uma matrícula. <LinkExercicio slug="procv-preco-pelo-codigo-exato">Treinar PROCV</LinkExercicio></> },
  { titulo: "SE, E e OU", texto: <>Aprovar, classificar, decidir quem ganha bônus. <LinkExercicio slug="se-aprovado">Treinar SE</LinkExercicio></> },
  { titulo: "CONT.SE e SOMASE", texto: <>Quantas vendas, quanto por região, quanto por vendedor. <LinkExercicio slug="cont-valores-vendas">Treinar contagens</LinkExercicio></> },
  { titulo: "Referência absoluta ($)", texto: <>Copiar fórmulas sem quebrar: o erro que mais reprova. <LinkExercicio slug="soma-total-de-vendas">Começar pelo Fundamentos</LinkExercicio></> },
  { titulo: "Porcentagem e variação", texto: "Quanto cresceu, quanto caiu, quanto cada item pesa no total." },
  { titulo: "Simulados no formato das empresas", texto: "Provas cronometradas como as dos processos seletivos.", selo: "Em breve no Pro" },
];

const FAQ: [string, string][] = [
  ["O que costuma cair num teste de Excel?", "Depende da vaga, mas quase sempre: fórmulas básicas (SOMA, MÉDIA, porcentagem), referência absoluta, SE, CONT.SE/SOMASE e PROCV. Para vagas de análise, entram tabela dinâmica, ÍNDICE/CORRESP e PROCX."],
  ["O teste é no Excel em português?", "Na maioria das empresas brasileiras, sim: PROCV, SE, ponto e vírgula. Aqui as funções são as mesmas do Excel em português."],
  ["Quanto tempo leva para me preparar?", "Quem já sabe o básico costuma precisar de alguns dias de prática nas funções acima. Quem está começando do zero deve começar pelo Intro, que leva menos de uma hora."],
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, sem instalar nada."],
];

export default function TesteDeExcel() {
  return (
    <div className="space-y-14">
      <Topo
        selo="Para vaga de emprego"
        titulo="Passe no teste de Excel da entrevista."
        cta={
          <>
            <CtaTrilha local="emprego" />
            <Link href="/desafio" className={botaoClaro}>
              Jogar o desafio de hoje
            </Link>
          </>
        }
      >
        <p>
          &quot;Excel avançado&quot; no currículo e, no teste, uma fórmula que você nunca escreveu. Aqui você pratica
          exatamente o que costuma cair, numa planilha de verdade no navegador, com correção na hora.
        </p>
      </Topo>
      <ExercicioEmbutido slug="procv-preco-pelo-codigo-exato" />
      <Secao rotulo="O que costuma cair" titulo="As funções dos testes práticos">
        <Cartoes itens={CAI} />
      </Secao>
      <Secao rotulo="Perguntas frequentes" titulo="Sobre o teste de Excel">
        <Perguntas itens={FAQ} />
      </Secao>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent p-6">
        <p className="text-xl font-extrabold tracking-tight">Comece hoje. A primeira fórmula leva menos de um minuto.</p>
        <CtaTrilha local="emprego" />
      </div>
    </div>
  );
}
