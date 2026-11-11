import Link from "next/link";
import type { ReactNode } from "react";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { LinkRastreado } from "@/components/site/LinkRastreado";
import { exercicioDemo, exerciciosDoModulo } from "@/content";
import { NOME_DESAFIO, NOME_SITE, PRECO, economiaAnual, reais } from "@/lib/site";

const botaoEscuro = "inline-block rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink-soft";
const botaoClaro = "inline-block rounded-lg border border-ink bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-bg";

function Rotulo({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-xs font-bold tracking-wider text-success uppercase">{children}</p>;
}

function Secao({ id, fundo = "bg-bg", children }: { id?: string; fundo?: string; children: ReactNode }) {
  return (
    <section id={id} className={`${fundo} scroll-mt-16 border-b border-line`}>
      <div className="mx-auto max-w-6xl px-4 py-20">{children}</div>
    </section>
  );
}

const DORES = [
  ["#VALOR!", "Horas de aula assistida", "Você assiste, acha que entendeu e, na hora de fazer sozinho, não sai."],
  ["#N/D", "Esqueceu na semana seguinte", "Sem repetição, o PROCV some da memória antes de você precisar dele."],
  ["#REF!", "Travou no teste da vaga", "\"Excel avançado\" no currículo, e o teste prático pede uma fórmula que você nunca escreveu."],
];

const PASSOS = [
  ["Leia o desafio", "Situações reais: comissão, estoque, folha de pagamento, controle de gastos."],
  ["Escreva a fórmula", "Numa planilha de verdade no navegador, com as funções em português."],
  ["Correção na hora", "Errou? Você recebe uma dica, tenta de novo e só vê a explicação completa quando precisar."],
];

/** Primeiro exercício da trilha de cada módulo. */
const inicioDo = (modulo: string) => `/exercicios/${exerciciosDoModulo(modulo)[0].slug}`;

const MODULOS: { n: number; titulo: string; desc: string; gratis?: boolean; href: string }[] = [
  { n: 0, titulo: "Intro", desc: "Células, intervalos, barra de fórmulas e sua primeira conta.", gratis: true, href: inicioDo("intro") },
  { n: 1, titulo: "Fundamentos", desc: "SOMA, MÉDIA, MÍNIMO, MÁXIMO, porcentagem, ARRED e o famoso $.", href: inicioDo("fundamentos") },
  { n: 2, titulo: "Lógica", desc: "SE, E, OU, SES e SEERRO.", href: inicioDo("logica") },
  { n: 3, titulo: "Contar e somar com condição", desc: "CONT.SE, SOMASE, SOMASES, MÉDIASE.", href: inicioDo("condicionais") },
  { n: 4, titulo: "Busca", desc: "PROCV, PROCH, ÍNDICE + CORRESP e PROCX.", href: inicioDo("busca") },
  { n: 5, titulo: "Texto", desc: "Juntar, cortar e limpar textos: ESQUERDA, EXT.TEXTO, ARRUMAR.", href: inicioDo("texto") },
  { n: 6, titulo: "Datas", desc: "HOJE, DATADIF, DIATRABALHOTOTAL e FIMMÊS.", href: inicioDo("datas") },
  { n: 7, titulo: "Arrays dinâmicos", desc: "FILTRO, CLASSIFICAR, ÚNICO e SEQUÊNCIA.", href: inicioDo("arrays") },
  { n: 8, titulo: "Casos reais", desc: "Comissão, estoque, parcelamento e INSS por faixa.", href: inicioDo("casos") },
];

const PLANO_GRATIS = ["Módulo Intro completo", "1º exercício de cada módulo", `${NOME_DESAFIO}, todo dia`, "Ofensiva de dias seguidos", "Solução comentada do desafio de ontem", "Progresso salvo no seu navegador"];
const PLANO_PRO = [
  "Todos os exercícios, do Fundamentos aos casos reais",
  "Pacote de exercícios novo todo mês",
  "Questões de concurso com planilha para testar",
  "Simulados de teste de Excel para vagas",
  "Arquivo de desafios antigos",
  "Certificado de conclusão",
];

const PUBLICOS = [
  { titulo: "Vaga de emprego", texto: "Treine as fórmulas que caem no teste prático: PROCV, SE, SOMASE e referência absoluta.", link: "Preparar para o teste", href: "/teste-de-excel" },
  { titulo: "Concurso público", texto: "As funções em português que as bancas cobram, testadas numa planilha de verdade.", link: "Excel para concurso", href: "/excel-para-concurso" },
  { titulo: "Empresas", texto: "Nivele a equipe com um piloto de 30 dias e o resultado medido antes e depois.", link: "Falar com a gente", href: "/empresas", escuro: true },
  { titulo: "Universidades", texto: "Trilha prática de Excel como atividade complementar, com piloto grátis para uma turma.", link: "Montar um piloto", href: "/universidades", escuro: true },
];

const FAQ = [
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, com fórmulas iguais às do Excel em português. Não precisa instalar nada nem ter licença."],
  ["Serve para quem nunca usou Excel?", "Sim. O Módulo 0 (Intro) começa do zero: o que é uma célula, como selecionar, editar e escrever a primeira fórmula."],
  ["As fórmulas são em português ou em inglês?", "Em português, como no Excel brasileiro: PROCV, SOMA, SE, com ponto e vírgula separando os argumentos e vírgula nos decimais."],
  ["Funciona para concurso que cobra LibreOffice Calc?", "As fórmulas básicas são praticamente iguais no Calc em português, mas os exercícios seguem o Excel. Questões específicas de Calc estão nos planos da trilha de concurso do Pro."],
  ["Quanto custa?", `O Intro completo, o desafio diário, a ofensiva e o 1º exercício de cada módulo são grátis. O Pro vai custar ${reais(PRECO.anualPorMes)} por mês no plano anual (${reais(PRECO.anual)} no Pix ou em até ${PRECO.parcelasAnual}x no cartão) ou ${reais(PRECO.mensal)} no mensal. Há garantia de ${PRECO.garantiaDias} dias. Durante os testes, tudo está aberto e nada é cobrado.`],
];

function Check() {
  return <span className="mt-0.5 text-success" aria-hidden>✓</span>;
}

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-bg">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="min-w-0 space-y-6">
            <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">
              Exercícios de Excel na prática, em português
            </span>
            <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Aprenda a falar
              <br />
              <span className="rounded-md bg-accent px-1.5">{NOME_SITE}</span>.
            </h1>
            <p className="max-w-lg text-lg text-muted">
              Pare de assistir aula. Pratique numa planilha de verdade, direto no navegador, com correção na hora. Com
              PROCV, SOMA e ponto e vírgula, do jeito que o Excel em português funciona.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkRastreado href="/trilha" className={botaoEscuro} evento={{ nome: "cta_landing", local: "hero" }}>
                Começar grátis
              </LinkRastreado>
              <Link href="/desafio" className={botaoClaro}>
                Jogar o desafio de hoje
              </Link>
            </div>
            <p className="text-xs text-muted">Sem cadastro para começar. Sem instalar nada.</p>
          </div>

          {/* min-w-0: sem isso, a coluna cresce até a largura da grade e empurra a página no celular */}
          <div className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-xl" data-testid="experimente">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-success uppercase">Experimente agora</span>
              <span className="text-xs text-muted">Demonstração</span>
            </div>
            <p className="mb-3 font-semibold">Em B6, some os gastos do mês (B2 até B5).</p>
            <SimuladorCarregavel exercicio={exercicioDemo} compacto />
          </div>
        </div>
      </section>

      {/* Dores */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-10 text-4xl font-extrabold tracking-tight">
            Curso em vídeo não ensina Excel.
            <br />
            Praticar ensina.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DORES.map(([erro, titulo, texto]) => (
              <div key={erro} className="rounded-xl border border-white/15 p-5">
                <p className="mb-2 font-mono text-sm text-accent">{erro}</p>
                <p className="mb-1 font-semibold">{titulo}</p>
                <p className="text-sm text-white/70">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <Secao>
        <Rotulo>Como funciona</Rotulo>
        <h2 className="mb-10 max-w-xl text-4xl font-extrabold tracking-tight">Ler, escrever, conferir. Alguns minutos por dia.</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PASSOS.map(([titulo, texto], i) => (
            <div key={titulo} className="rounded-xl border border-line bg-surface p-5">
              <span className="mb-3 grid h-8 w-8 place-items-center rounded-md bg-accent font-bold">{i + 1}</span>
              <p className="mb-1 font-semibold">{titulo}</p>
              <p className="text-sm text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Trilha */}
      <Secao id="trilha" fundo="bg-surface">
        <Rotulo>A trilha</Rotulo>
        <h2 className="mb-3 text-4xl font-extrabold tracking-tight">Do primeiro clique ao PROCV.</h2>
        <p className="mb-10 max-w-lg text-muted">
          Nunca abriu uma planilha? Comece pelo Intro. Já sabe o básico? Pule para o módulo que precisar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="modulos-landing">
          {MODULOS.map((m) => {
            const conteudo = (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted">Módulo {m.n}</span>
                  {m.gratis ? (
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">Grátis</span>
                  ) : (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Pro · 1º exercício grátis</span>
                  )}
                </div>
                <p className="mb-1 font-semibold">{m.titulo}</p>
                <p className="text-sm text-muted">{m.desc}</p>
              </>
            );
            return (
              <Link key={m.n} href={m.href} className="rounded-xl border border-line bg-bg p-4 hover:border-ink">
                {conteudo}
              </Link>
            );
          })}
        </div>
      </Secao>

      {/* Desafio do dia */}
      <Secao>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Rotulo>Grátis, todo dia</Rotulo>
            <h2 className="mb-3 text-4xl font-extrabold tracking-tight">{NOME_DESAFIO}</h2>
            <p className="mb-6 max-w-md text-muted">
              Um desafio novo por dia, o mesmo para todo mundo. Resolva, compartilhe o resultado e compare com os amigos.
            </p>
            <Link href="/desafio" className={botaoEscuro}>
              Jogar o desafio de hoje
            </Link>
          </div>
          <div className="max-w-md rounded-2xl bg-ink p-6 text-white shadow-xl lg:justify-self-center">
            <p className="mb-4 font-display text-xl font-bold">{NOME_DESAFIO} #12</p>
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {["bg-accent", "bg-accent", "bg-success", "bg-ink-soft", "bg-ink-soft"].map((c, i) => (
                <span key={i} className={`h-9 w-9 rounded-md ${c}`} />
              ))}
            </div>
            <p className="text-sm text-white/70">Resolvido na 3ª tentativa · nível 2</p>
          </div>
        </div>
      </Secao>

      {/* Planos */}
      <Secao id="precos" fundo="bg-surface">
        <Rotulo>Planos</Rotulo>
        <h2 className="mb-10 max-w-xl text-4xl font-extrabold tracking-tight">Comece grátis. O Pro vem aí.</h2>
        <div className="grid gap-6 md:grid-cols-2" data-testid="planos">
          <div className="flex flex-col rounded-2xl border border-line bg-bg p-6">
            <p className="font-semibold">Grátis</p>
            <p className="mb-5 font-display text-4xl font-extrabold">R$ 0</p>
            <ul className="mb-8 space-y-2 text-sm">
              {PLANO_GRATIS.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check /> {t}
                </li>
              ))}
            </ul>
            <LinkRastreado
              href="/trilha"
              className={`${botaoClaro} mt-auto text-center`}
              evento={{ nome: "cta_landing", local: "planos" }}
            >
              Começar grátis
            </LinkRastreado>
          </div>
          <div className="flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Pro</p>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">Em breve</span>
            </div>
            <p className="font-display text-4xl font-extrabold" data-testid="preco-pro">
              {reais(PRECO.anualPorMes)}
              <span className="text-base font-medium text-muted">/mês</span>
            </p>
            <p className="text-xs text-muted">
              no plano anual: {reais(PRECO.anual)} no Pix ou em até {PRECO.parcelasAnual}x no cartão ({economiaAnual()}% a
              menos que o mensal). Ou {reais(PRECO.mensal)} no mensal.
            </p>
            <p className="mt-2 mb-5 text-xs text-muted">
              Menos que um lanche por mês. Cursos de Excel custam R$ 300 ou mais.
            </p>
            <ul className="mb-8 space-y-2 text-sm">
              {PLANO_PRO.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check /> {t}
                </li>
              ))}
            </ul>
            <LinkRastreado
              href="/pro"
              className={`${botaoEscuro} mt-auto text-center`}
              evento={{ nome: "upsell_clicou", origem: "landing" }}
            >
              Ver o que vem no Pro
            </LinkRastreado>
            <p className="mt-3 text-center text-xs text-muted" data-testid="garantia">
              Garantia de {PRECO.garantiaDias} dias: não gostou, devolvemos o valor. Durante os testes, nada é cobrado.
            </p>
          </div>
        </div>
      </Secao>

      {/* Para quem é */}
      <Secao>
        <Rotulo>Para quem é</Rotulo>
        <h2 className="mb-10 max-w-xl text-4xl font-extrabold tracking-tight">Seja qual for o seu motivo para aprender.</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLICOS.map((p) => (
            <div key={p.titulo} className={`rounded-xl border p-5 ${p.escuro ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
              <p className="mb-1 font-semibold">{p.titulo}</p>
              <p className={`mb-3 text-sm ${p.escuro ? "text-white/70" : "text-muted"}`}>{p.texto}</p>
              <Link href={p.href} className={`text-sm font-semibold ${p.escuro ? "text-accent" : "text-success"}`}>
                {p.link} →
              </Link>
            </div>
          ))}
        </div>
      </Secao>

      {/* FAQ */}
      <Secao fundo="bg-surface">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-4xl font-extrabold tracking-tight">Perguntas frequentes</h2>
          <div className="divide-y divide-line border-b border-line" data-testid="faq">
            {FAQ.map(([pergunta, resposta]) => (
              <details key={pergunta} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {pergunta}
                  <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted">{resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </Secao>

      {/* Chamada final */}
      <section className="bg-accent">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16">
          <h2 className="max-w-2xl text-4xl font-extrabold tracking-tight">Sua primeira fórmula leva menos de um minuto.</h2>
          <LinkRastreado href="/trilha" className={botaoEscuro} evento={{ nome: "cta_landing", local: "chamada_final" }}>
            Começar grátis
          </LinkRastreado>
        </div>
      </section>
    </>
  );
}
