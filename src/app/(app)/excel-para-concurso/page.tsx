import type { Metadata } from "next";
import { Cartoes, CtaTrilha, LinkExercicio, Perguntas, Secao, Topo } from "@/components/publico/blocos";
import { ExercicioEmbutido } from "@/components/publico/ExercicioEmbutido";
import { NOME_SITE } from "@/lib/site";

const TITULO = "Excel para concurso público: pratique as funções que as bancas cobram";
const DESCRICAO =
  "Questões de Excel em concurso cobram fórmula, referência relativa e absoluta, SE, CONT.SE e PROCV. Pratique numa planilha no navegador, em português, e veja o resultado de cada fórmula na hora.";

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/excel-para-concurso" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/excel-para-concurso" },
};

const COBRA = [
  { titulo: "Referência relativa e absoluta", texto: <>&quot;Ao copiar a fórmula de C2 para C3, o que acontece?&quot; é clássico de prova. <LinkExercicio slug="soma-total-de-vendas">Fundamentos</LinkExercicio></> },
  { titulo: "SE e funções lógicas", texto: <>Qual valor a fórmula devolve? Na planilha, você testa e vê. <LinkExercicio slug="se-aprovado">Treinar SE</LinkExercicio></> },
  { titulo: "CONT.SE, SOMASE, MÉDIA", texto: <>Contar e somar com critério, com o critério entre aspas. <LinkExercicio slug="cont-valores-vendas">Treinar</LinkExercicio></> },
  { titulo: "PROCV", texto: <>Os quatro argumentos e o famoso FALSO no fim. <LinkExercicio slug="procv-preco-pelo-codigo-exato">Treinar PROCV</LinkExercicio></> },
  { titulo: "Operadores e ordem das contas", texto: "Multiplicação antes da soma, parênteses, & para juntar textos." },
  { titulo: "Questões no estilo das bancas", texto: "Enunciado de prova com a planilha ao lado para testar cada alternativa.", selo: "Em breve no Pro" },
];

const FAQ: [string, string][] = [
  ["A prova cobra Excel ou LibreOffice Calc?", "Depende do edital. As fórmulas básicas são praticamente iguais no Calc em português; os exercícios daqui seguem o Excel. Questões específicas de Calc estão nos planos da trilha de concurso."],
  ["Por que praticar numa planilha se a prova é no papel?", "Porque a dúvida de prova é sempre \"o que essa fórmula devolve?\". Testando na planilha, você fixa a regra em vez de decorar."],
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, sem instalar nada."],
];

export default function ExcelParaConcurso() {
  return (
    <div className="space-y-14">
      <Topo selo="Para concurso público" titulo="Excel para concurso, praticando de verdade." cta={<CtaTrilha local="concurso" />}>
        <p>
          As bancas perguntam o que uma fórmula devolve, o que acontece ao copiar uma célula, qual função usar. Em vez
          de decorar, teste cada regra numa planilha no navegador, em português.
        </p>
      </Topo>
      <ExercicioEmbutido slug="se-aprovado" />
      <Secao rotulo="O que as bancas cobram" titulo="Os assuntos que mais caem">
        <Cartoes itens={COBRA} />
      </Secao>
      <Secao rotulo="Perguntas frequentes" titulo="Sobre Excel em concurso">
        <Perguntas itens={FAQ} />
      </Secao>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent p-6">
        <p className="text-xl font-extrabold tracking-tight">Comece pelo básico e avance no seu ritmo.</p>
        <CtaTrilha local="concurso" />
      </div>
    </div>
  );
}
