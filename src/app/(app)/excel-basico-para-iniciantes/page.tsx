import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PreviaExercicio } from "@/components/previa/PreviaExercicio";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { exercicioPorSlug, exerciciosDoModulo, moduloPorSlug, proximoExercicio } from "@/content";
import { dadosDaTrilha } from "@/content/trilha";
import { NOME_SITE, URL_SITE } from "@/lib/site";

const TITULO = "Excel básico para iniciantes: aprenda praticando";
const DESCRICAO =
  "Nunca abriu uma planilha? Aprenda o básico do Excel em português fazendo exercícios no navegador: células, seleção, edição, barra de fórmulas, primeira fórmula e formatação em R$ e %.";

/** Exercício embutido: o mais simples do Intro, que funciona sem nenhuma explicação prévia. */
const SLUG_DEMO = "clicar-em-uma-celula";

export const metadata: Metadata = {
  title: { absolute: `${TITULO} | ${NOME_SITE}` },
  description: DESCRICAO,
  alternates: { canonical: "/excel-basico-para-iniciantes" },
  openGraph: { title: TITULO, description: DESCRICAO, url: "/excel-basico-para-iniciantes" },
};

const ATALHOS: [string, string][] = [
  ["Setas", "andar uma célula"],
  ["Enter / Shift+Enter", "descer / subir uma linha"],
  ["Tab / Shift+Tab", "ir para a direita / esquerda"],
  ["Shift + setas", "selecionar um intervalo"],
  ["F2", "editar a célula ativa"],
  ["Esc", "cancelar a digitação"],
  ["Ctrl+Z", "desfazer"],
  ["Ctrl+Shift+4", "formato de moeda (R$)"],
  ["Ctrl+Shift+5", "formato de porcentagem"],
];

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      <div className="space-y-3 leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-header px-1 py-0.5 font-mono text-[0.9em] text-success">{children}</code>
);

export default function ExcelBasico() {
  const modulo = moduloPorSlug("intro")!;
  const lista = exerciciosDoModulo("intro").filter((e) => e.plano === "free");
  const demo = exercicioPorSlug(SLUG_DEMO)!;
  const prox = proximoExercicio(SLUG_DEMO);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `Módulo ${modulo.numero}: ${modulo.titulo} | Excel básico para iniciantes`,
    description: DESCRICAO,
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    educationalLevel: "Iniciante",
    url: `${URL_SITE}/excel-basico-para-iniciantes`,
    provider: { "@type": "Organization", name: NOME_SITE, sameAs: URL_SITE },
    hasPart: lista.map((e) => ({
      "@type": "LearningResource",
      name: e.titulo,
      url: `${URL_SITE}/exercicios/${e.slug}`,
      learningResourceType: "Exercício interativo",
    })),
  };

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="space-y-4">
        <p className="text-sm font-medium text-success">Módulo 0 · grátis</p>
        <h1 className="text-3xl font-bold tracking-tight">{TITULO}</h1>
        <p className="text-lg text-zinc-600">
          Se você nunca abriu uma planilha, comece aqui. São {lista.length} exercícios curtos, feitos numa planilha
          de verdade no navegador, com o Excel em português. Nada de vídeo: você aprende fazendo, e a correção é na
          hora.
        </p>
        <Link
          href={`/exercicios/${lista[0].slug}`}
          className="inline-block rounded-md bg-ink px-5 py-3 font-medium text-white hover:bg-ink-soft"
        >
          Começar o Módulo 0
        </Link>
      </header>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Experimente agora: {demo.titulo}</h2>
        <SimuladorCarregavel
          exercicio={demo}
          previa={<PreviaExercicio exercicio={demo} />}
          proximo={prox ? { slug: prox.slug, titulo: prox.titulo } : undefined}
          trilha={dadosDaTrilha("intro").simulador}
        />
      </section>

      <Secao id="celula" titulo="O que é uma célula">
        <p>
          Uma planilha é uma grade. As <strong>colunas</strong> têm letras (A, B, C…) e as <strong>linhas</strong>{" "}
          têm números (1, 2, 3…). Cada quadradinho é uma <strong>célula</strong>, e o nome dela é a letra da coluna
          seguida do número da linha: <C>B3</C> é a célula da coluna B, linha 3.
        </p>
        <p>
          A célula com a borda destacada é a <strong>célula ativa</strong>: é nela que o que você digitar vai entrar.
          O nome dela aparece na <strong>Caixa de Nome</strong>, à esquerda da barra de fórmulas.
        </p>
      </Secao>

      <Secao id="intervalo" titulo="Como selecionar um intervalo">
        <p>
          Um <strong>intervalo</strong> é um bloco de células, escrito com dois-pontos: <C>B2:D5</C> quer dizer
          &quot;de B2 até D5&quot;. Para selecionar, clique na primeira célula e arraste até a última, ou segure{" "}
          <strong>Shift</strong> e use as setas.
        </p>
        <p>
          Intervalos aparecem o tempo todo em fórmulas: <C>=SOMA(B2:B7)</C> soma todas as células de B2 até B7.
        </p>
      </Secao>

      <Secao id="digitar" titulo="Como digitar e corrigir valores">
        <p>
          Selecione a célula e comece a escrever. <strong>Enter</strong> grava e desce para a célula de baixo;{" "}
          <strong>Esc</strong> cancela. Digitar numa célula preenchida substitui todo o conteúdo.
        </p>
        <p>
          Para corrigir só uma parte, entre no modo de edição com <strong>F2</strong> ou com{" "}
          <strong>duplo clique</strong>. No Excel em português, a vírgula é o separador decimal: digite{" "}
          <C>29,90</C>, não <C>29.90</C>.
        </p>
      </Secao>

      <Secao id="barra-de-formulas" titulo="A barra de fórmulas: o que a célula guarda">
        <p>
          Uma célula pode <strong>mostrar</strong> uma coisa e <strong>guardar</strong> outra. Se D4 mostra 300, ela
          pode guardar o número 300 ou a fórmula <C>=B4+C4</C>. A <strong>barra de fórmulas</strong>, acima da
          planilha, sempre mostra o que está guardado na célula ativa.
        </p>
      </Secao>

      <Secao id="primeira-formula" titulo="Sua primeira fórmula">
        <p>
          Toda fórmula começa com <C>=</C>. Para somar A1 e B1, selecione C1 e digite <C>=A1+B1</C>. Os operadores
          são <C>+</C>, <C>-</C>, <C>*</C> (multiplicação) e <C>/</C> (divisão).
        </p>
        <p>
          A vantagem da fórmula é que ela recalcula sozinha: se A1 mudar, C1 muda junto. Se você digitasse o
          resultado à mão, ele ficaria desatualizado.
        </p>
      </Secao>

      <Secao id="formatacao" titulo="Formatar como moeda (R$) e porcentagem">
        <p>
          O formato muda só a <strong>aparência</strong> do número. O valor 29,9 formatado como moeda aparece como
          R$ 29,90; o valor 0,75 formatado como porcentagem aparece como 75%. Por dentro, o número continua o mesmo.
        </p>
        <p>
          No Excel, os botões ficam na guia <strong>Página Inicial</strong>, grupo <strong>Número</strong>.
        </p>
      </Secao>

      <Secao id="atalhos" titulo="Atalhos que valem a pena decorar">
        <table className="w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-header text-left">
              <th className="border border-line px-3 py-2">Tecla</th>
              <th className="border border-line px-3 py-2">O que faz</th>
            </tr>
          </thead>
          <tbody>
            {ATALHOS.map(([tecla, faz]) => (
              <tr key={tecla}>
                <td className="border border-line px-3 py-2 font-mono">{tecla}</td>
                <td className="border border-line px-3 py-2">{faz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao id="exercicios" titulo={`Os ${lista.length} exercícios do Módulo 0`}>
        <ol className="list-decimal space-y-1 pl-6">
          {lista.map((e) => (
            <li key={e.slug}>
              <Link href={`/exercicios/${e.slug}`} className="text-success hover:underline">
                {e.titulo}
              </Link>
            </li>
          ))}
        </ol>
        <p>
          Terminou? O próximo passo é o <Link href="/#modulo-fundamentos" className="text-success underline">Módulo 1: Fundamentos</Link>,
          com SOMA, MÉDIA, MÍNIMO, MÁXIMO e referência absoluta.
        </p>
      </Secao>
    </article>
  );
}
