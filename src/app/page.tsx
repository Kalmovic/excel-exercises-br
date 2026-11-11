import Link from "next/link";
import type { ReactNode } from "react";
import SimuladorCarregavel from "@/components/simulador/SimuladorCarregavel";
import { LinkRastreado } from "@/components/site/LinkRastreado";
import { exercicioDemo } from "@/content";
import { NOME_DESAFIO, NOME_SITE } from "@/lib/site";

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

const MODULOS: { n: number; titulo: string; desc: string; gratis?: boolean; href?: string }[] = [
  { n: 0, titulo: "Intro", desc: "Células, intervalos, barra de fórmulas e sua primeira conta.", gratis: true, href: "/exercicios/nome-da-celula" },
  { n: 1, titulo: "Fundamentos", desc: "SOMA, MÉDIA, MÍNIMO, MÁXIMO, porcentagem e o famoso $.", href: "/exercicios/soma-total-de-vendas" },
  { n: 2, titulo: "Lógica", desc: "SE, SE aninhado, E, OU, SES e SEERRO." },
  { n: 3, titulo: "Contar e somar com condição", desc: "CONT.SE, SOMASE, SOMASES, MÉDIASE." },
  { n: 4, titulo: "Busca", desc: "PROCV, PROCH, ÍNDICE + CORRESP e PROCX." },
  { n: 5, titulo: "Texto", desc: "Juntar, cortar e limpar textos: ESQUERDA, EXT.TEXTO, ARRUMAR." },
  { n: 6, titulo: "Datas", desc: "HOJE, DATADIF, DIATRABALHOTOTAL, FIMMÊS." },
  { n: 7, titulo: "Arrays dinâmicos", desc: "FILTRO, CLASSIFICAR e ÚNICO." },
  { n: 8, titulo: "Casos reais", desc: "Comissão, estoque, parcelamento e INSS por faixa." },
];

const PLANO_GRATIS = ["Módulo Intro completo", `${NOME_DESAFIO}, todo dia`, "Ofensiva de dias seguidos", "1º exercício de cada módulo"];
const PLANO_PRO = [
  "Todos os módulos, do Fundamentos aos casos reais",
  "Pacote de exercícios novo todo mês",
  "Questões de concurso com planilha para testar",
  "Simulados de teste de Excel para vagas",
  "Arquivo de desafios antigos",
  "Certificado de conclusão",
];

const PUBLICOS = [
  { titulo: "Vaga de emprego", texto: "Prepare-se para o teste prático de Excel com simulados no formato das empresas.", link: "Prática de entrevista", href: "/pro" },
  { titulo: "Concurso público", texto: "Questões no estilo das bancas, com uma planilha ao lado para testar cada alternativa.", link: "Excel para concurso", href: "/pro" },
  { titulo: "Empresas", texto: "Nivele a equipe, acompanhe o progresso de cada pessoa e meça o resultado antes e depois.", link: "Falar com a gente", href: "/empresas", escuro: true },
];

const FAQ = [
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, com fórmulas iguais às do Excel em português. Não precisa instalar nada nem ter licença."],
  ["Serve para quem nunca usou Excel?", "Sim. O Módulo 0 (Intro) começa do zero: o que é uma célula, como selecionar, editar e escrever a primeira fórmula."],
  ["As fórmulas são em português ou em inglês?", "Em português, como no Excel brasileiro: PROCV, SOMA, SE, com ponto e vírgula separando os argumentos e vírgula nos decimais."],
  ["Funciona para concurso que cobra LibreOffice Calc?", "As fórmulas básicas são praticamente iguais no Calc em português, mas os exercícios seguem o Excel. Questões específicas de Calc entram na trilha de concurso do Pro."],
  ["Posso cancelar quando quiser?", "Sim. O Pro é uma assinatura sem fidelidade: você cancela quando quiser e mantém o acesso até o fim do período pago."],
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
              <span className="text-xs text-muted">Exercício 1 de 10</span>
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
          Nunca abriu uma planilha? Comece pelo Intro. Já sabe o básico? Faça o teste de nível e pule etapas.
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
            return m.href ? (
              <Link key={m.n} href={m.href} className="rounded-xl border border-line bg-bg p-4 hover:border-ink">
                {conteudo}
              </Link>
            ) : (
              <div key={m.n} className="rounded-xl border border-line bg-bg p-4">
                {conteudo}
              </div>
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
              Um desafio novo por dia, o mesmo para todo mundo. Resolva, mantenha sua ofensiva e compare com os amigos.
            </p>
            <Link href="/desafio" className={botaoEscuro}>
              Jogar o desafio de hoje
            </Link>
          </div>
          <div className="max-w-md rounded-2xl bg-ink p-6 text-white shadow-xl lg:justify-self-center">
            <p className="mb-4 font-display text-xl font-bold">{NOME_DESAFIO} #42</p>
            <div className="mb-4 flex gap-1.5" aria-hidden>
              {["bg-accent", "bg-accent", "bg-success", "bg-ink-soft", "bg-ink-soft"].map((c, i) => (
                <span key={i} className={`h-9 w-9 rounded-md ${c}`} />
              ))}
            </div>
            <p className="mb-2 text-sm text-white/70">Resolvido na 3ª tentativa · ofensiva de 12 dias</p>
            <p className="font-mono text-sm text-accent">planilhes.com.br/desafio</p>
          </div>
        </div>
      </Secao>

      {/* Planos */}
      <Secao id="precos" fundo="bg-surface">
        <Rotulo>Planos</Rotulo>
        <h2 className="mb-10 max-w-xl text-4xl font-extrabold tracking-tight">Comece grátis. Assine quando quiser ir além.</h2>
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
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">Mais escolhido</span>
            </div>
            <p className="font-display text-4xl font-extrabold">
              [PREÇO]<span className="text-base font-medium text-muted">/mês</span>
            </p>
            <p className="mb-5 text-xs text-muted">ou [PREÇO ANUAL]/ano no Pix ou em até 12x</p>
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
              Assinar o Pro
            </LinkRastreado>
          </div>
        </div>
      </Secao>

      {/* Para quem é */}
      <Secao>
        <Rotulo>Para quem é</Rotulo>
        <h2 className="mb-10 max-w-xl text-4xl font-extrabold tracking-tight">Seja qual for o seu motivo para aprender.</h2>
        <div className="grid gap-4 md:grid-cols-3">
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
