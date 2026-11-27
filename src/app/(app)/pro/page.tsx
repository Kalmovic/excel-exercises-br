import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SeloGarantia } from "@/components/marca/SeloGarantia";
import { IconeTrofeu } from "@/components/simulador/Trofeu";
import { modulosDoEspecialista } from "@/lib/especialista";
import { ExercicioEmbutido } from "@/components/publico/ExercicioEmbutido";
import { AbasAmostra } from "@/components/publico/AbasAmostra";
import { IlustracaoDinamica, LICAO_DINAMICA } from "@/components/publico/IlustracaoDinamica";
import { MODULOS, exerciciosDoModulo, questoesDaLicao, testeDoModulo } from "@/content";
import { numerosDoConteudo } from "@/lib/numeros";
import { contasLigadas } from "@/lib/supabase/config";
import { stripeConfigurado } from "@/lib/stripe";
import { B2B_NO_AR, NOME_DESAFIO, PRECO, economiaAnual, reais } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pro: a trilha completa de Excel",
  description:
    "Todos os módulos de Excel em português, com correção na hora: SE, SOMASE, PROCV, tabela dinâmica, gráficos, formatação condicional, validação de dados e várias abas.",
  robots: { index: false, follow: true },
};

/** A lição grátis de PROCV (1ª do módulo de Busca), jogável na página. */
const LICAO_AMOSTRA = "procv-preco-pelo-codigo-exato";

/** "Além das fórmulas": as ferramentas do Excel que o aluno usa na própria grade, com o módulo de cada uma. */
const FERRAMENTAS = [
  { modulo: "dinamica", titulo: "Tabela dinâmica", texto: "Arraste os campos para Linhas, Colunas, Valores e Filtros e resuma a tabela inteira." },
  { modulo: "graficos", titulo: "Gráficos", texto: "Colunas, linhas, barras e pizza: o tipo certo, título, rótulos e as armadilhas de como o Excel lê os dados." },
  { modulo: "destaque", titulo: "Formatação condicional", texto: "A planilha aponta o problema: abaixo da meta, duplicados, a linha inteira com fórmula, barras de dados." },
  { modulo: "dados", titulo: "Filtrar, classificar e SUBTOTAL", texto: "As setas no cabeçalho e o total que acompanha o filtro (o SOMA não acompanha)." },
  { modulo: "validacao", titulo: "Validação de dados", texto: "Lista suspensa, números e datas dentro da regra, e como achar o que já estava errado." },
  { modulo: "abas", titulo: "Várias abas", texto: "Fórmulas que leem outras abas: PROCV na tabela de preços, o resumo do trimestre e a conferência de uma lista contra a outra." },
];

/** Número do módulo (os números mudam quando a trilha ganha módulos; aqui vêm do conteúdo). */
const numeroDoModulo = (slug: string) => MODULOS.find((m) => m.slug === slug)?.numero ?? "";

/** Lição grátis de gráfico (1ª do módulo de Gráficos), jogável na página. */
const LICAO_GRAFICO = "grafico-vendas-por-mes";

const PERGUNTAS: [string, string][] = [
  [
    "Como funciona a garantia?",
    `Você tem ${PRECO.garantiaDias} dias para testar. Se não gostar, é só pedir pelo e-mail e devolvemos o valor inteiro, sem perguntas.`,
  ],
  ["Consigo cancelar quando quiser?", "Sim. No mensal, você cancela a renovação em Minha conta, num clique, e continua Pro até o fim do mês já pago. O anual não renova sozinho."],
  ["Quais as formas de pagamento?", "Cartão de crédito: o mensal renova sozinho e o anual dá para parcelar. O pagamento é feito no Stripe, usado por milhões de empresas: o Planilhês não vê nem guarda os dados do seu cartão."],
  [
    "Tem tabela dinâmica, gráfico e as outras ferramentas?",
    "Tem, e na própria planilha, como no Excel: tabela dinâmica (arrastando os campos), gráficos, formatação condicional, filtro e classificar, validação de dados com lista suspensa e fórmulas entre abas. A correção confere o resultado, não o caminho.",
  ],
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, no computador ou no celular, com as fórmulas em português como no Excel brasileiro."],
  ["Funciona no celular?", "Funciona. No celular você seleciona e edita as células com toques, e uma barrinha faz o papel do mouse e do Ctrl+D. Para estudar muito tempo seguido, o computador é mais confortável."],
  [
    "E o que eu já fiz no plano grátis?",
    contasLigadas()
      ? "Continua lá. O progresso fica na sua conta, e o Pro só libera o resto da trilha."
      : "Continua lá. Por enquanto o progresso fica salvo neste navegador; quando as contas chegarem, ele vai junto para a sua. O Pro só libera o resto da trilha.",
  ],
  ["Serve para quem está começando?", "Sim. A trilha começa no Intro (grátis) e cada lição tem dicas e explicação. Se você já sabe o básico, pode ir direto ao módulo que precisa."],
  [
    "Tem certificado?",
    "Tem. Ao passar no teste de todos os módulos, você recebe o certificado de Especialista em Excel; no caminho, cada módulo também vira um certificado. Todos têm seu nome e um link público de verificação, prontos para o LinkedIn. Antes de emitir, conferimos suas respostas de novo.",
  ],
];

const METODO = [
  {
    numero: "1",
    titulo: "Você escreve a fórmula",
    texto:
      "Nada de assistir alguém fazendo. Cada lição é uma planilha de verdade no navegador, com as funções em português. A correção confere o resultado e se você usou as células certas, não um número digitado à mão.",
  },
  {
    numero: "2",
    titulo: "Você erra com segurança",
    texto:
      "Errou? A dica aponta onde olhar sem entregar a resposta: o intervalo termina cedo demais, o sinal de comparação deixa o limite de fora. A explicação completa vem quando você acerta, ou quando pedir.",
  },
  {
    numero: "3",
    titulo: "Você não esquece",
    texto:
      "Cada lição tem 5 questões: a principal, duas variações, uma pegadinha e uma de conceito. No fim do módulo, um teste sem dicas. E o desafio diário mantém a mão quente.",
  },
];

const PARA_QUEM = [
  "Vai fazer o teste prático de Excel de uma vaga",
  "Estuda para concurso que cobra planilha",
  "Usa Excel no trabalho e quer parar de depender dos outros",
  "Começou do zero e quer um caminho em ordem",
];
const NAO_E = ["Prefere só assistir aulas em vídeo"];

export default function Pro() {
  // Variáveis do Stripe lidas no build: sem elas, os botões viram "em breve".
  const aVenda = stripeConfigurado();
  const n = numerosDoConteudo();

  return (
    <div className="space-y-24 pb-8">
      {/* Topo */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold text-ink">Planilhês Pro</span>
          <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">Pratique até o Excel virar reflexo.</h1>
          <p className="max-w-xl text-lg text-muted">
            O grátis te mostra o caminho. O Pro libera a trilha inteira: os {n.modulos} módulos, do Intro aos casos reais, com {n.questoesLicao} questões de lição e{" "}
            {n.extras} exercícios de prática extra corrigidos na hora, numa planilha de verdade, em português.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Cta aVenda={aVenda} plano="anual" grande>
              Assinar o Pro
            </Cta>
            <a href="#amostra" className="rounded-lg border border-ink bg-surface px-6 py-3.5 font-semibold hover:bg-bg">
              Testar uma lição grátis
            </a>
          </div>
          <div className="flex items-center gap-4">
            <SeloGarantia dias={PRECO.garantiaDias} className="h-20 w-20 shrink-0" />
            <ul className="space-y-1 text-sm text-muted">
              {[`Garantia incondicional de ${PRECO.garantiaDias} dias`, "Certificado de Especialista", "Cancele quando quiser"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="text-success" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Ilustracao />
      </section>

      {/* Números */}
      <section aria-label="O que tem no Pro" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [`${n.modulos}`, "módulos", "do Intro aos casos reais, com tabela dinâmica e gráficos"],
          [`${n.questoesLicao}`, "questões de lição", "com dicas e explicação"],
          [`${n.testes}`, "testes de módulo", "um no fim de cada módulo"],
          [`${n.simulados}`, "simulados de vaga", "teste prático com tempo, como no processo seletivo"],
        ].map(([valor, rotulo, detalhe]) => (
          <div key={rotulo} className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-4xl font-extrabold">{valor}</p>
            <p className="font-semibold">{rotulo}</p>
            <p className="text-sm text-muted">{detalhe}</p>
          </div>
        ))}
      </section>

      {/* Além das fórmulas: o destaque das ferramentas novas */}
      <section
        className="grid items-center gap-10 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-10 lg:grid-cols-[1fr_1.05fr]"
        data-testid="secao-ferramentas"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-white/60 uppercase">Além das fórmulas</span>
          </div>
          <h2 className="font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
            Tabela dinâmica, gráficos e as ferramentas do dia a dia. Na planilha, como no Excel.
          </h2>
          <p className="text-lg text-white/75">
            Não é vídeo nem print: você arrasta os campos, insere o gráfico, cria a regra de cor, e a correção confere o resultado na hora.
          </p>
          <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2" data-testid="lista-ferramentas">
            {FERRAMENTAS.map((f) => {
              const m = MODULOS.find((x) => x.slug === f.modulo);
              return (
                <li key={f.titulo} className="flex gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-ink" aria-hidden>
                    ✓
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {f.titulo}
                      {m && <span className="ml-2 text-xs font-normal text-white/50">Módulo {m.numero}</span>}
                    </span>
                    <span className="block text-sm text-white/70">{f.texto}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-3">
            <a
              href="#amostra-dinamica"
              className="inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-ink hover:brightness-95"
              data-testid="cta-dinamica"
            >
              Montar uma tabela dinâmica, grátis
            </a>
            <a
              href="#amostra-grafico"
              className="inline-block rounded-lg border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10"
              data-testid="cta-grafico"
            >
              Criar um gráfico
            </a>
          </div>
        </div>
        <IlustracaoDinamica />
      </section>

      {/* Carta: a dor */}
      <section className="mx-auto max-w-2xl space-y-5 text-lg leading-relaxed">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Você não precisa de mais um curso de Excel.</h2>
        <p>
          Você já assistiu aula de PROCV. Talvez várias. Na hora fez sentido. Uma semana depois, diante de uma planilha de verdade, a fórmula não sai:
          aparece <code className="rounded bg-header px-1.5 font-mono text-base">#N/D</code>, você não lembra a ordem dos argumentos e volta para o
          vídeo.
        </p>
        <p>
          O problema não é você. É o formato. Ver alguém fazendo dá a <strong>sensação</strong> de aprender, mas a habilidade só aparece quando você
          escreve a fórmula com as próprias mãos, erra, entende o porquê e tenta de novo.
        </p>
        <p>
          É para isso que o Planilhês existe: em vez de horas de vídeo, centenas de exercícios curtos numa planilha que corrige na hora. Alguns
          minutos por dia, e o PROCV do teste da vaga, do concurso ou do relatório de segunda-feira sai sem você precisar procurar no Google.
        </p>
        <p className="font-semibold">Equipe Planilhês</p>
      </section>

      {/* Método */}
      <Secao rotulo="O método" titulo="Ler, escrever, conferir. E repetir.">
        <div className="grid gap-4 md:grid-cols-3">
          {METODO.map((m) => (
            <div key={m.numero} className="rounded-2xl border border-line bg-surface p-6">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent font-display text-lg font-extrabold text-ink">{m.numero}</span>
              <p className="mb-2 text-lg font-semibold">{m.titulo}</p>
              <p className="text-muted">{m.texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Amostra jogável */}
      <section id="amostra" className="scroll-mt-20 space-y-6">
        <div>
          <p className="mb-2 text-xs font-bold tracking-wider text-success uppercase">Experimente</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Três lições do Pro, de graça, aqui mesmo</h2>
          <p className="mt-2 max-w-2xl text-muted">
            É assim que todo o Pro funciona: você lê o problema, resolve na planilha e ela confere. Uma fórmula, uma tabela dinâmica ou um gráfico. Sem cadastro.
          </p>
        </div>
        {/* As âncoras #amostra-procv e #amostra-dinamica abrem direto na aba. */}
        <span id="amostra-procv" className="block scroll-mt-20" />
        <span id="amostra-dinamica" className="block scroll-mt-20" />
        <span id="amostra-grafico" className="block scroll-mt-20" />
        <AbasAmostra
          abas={[
            { id: "procv", rotulo: "PROCV", detalhe: `Módulo ${numeroDoModulo("busca")}`, conteudo: <ExercicioEmbutido slug={LICAO_AMOSTRA} /> },
            { id: "dinamica", rotulo: "Tabela dinâmica", detalhe: `Módulo ${numeroDoModulo("dinamica")}`, conteudo: <ExercicioEmbutido slug={LICAO_DINAMICA} /> },
            { id: "grafico", rotulo: "Gráfico", detalhe: `Módulo ${numeroDoModulo("graficos")}`, conteudo: <ExercicioEmbutido slug={LICAO_GRAFICO} /> },
          ]}
        />
      </section>

      {/* Currículo */}
      <Secao rotulo="O que tem dentro" titulo="O currículo completo, lição por lição">
        <div className="space-y-3">
          {MODULOS.filter((m) => m.slug !== "intro").map((m, i) => {
            const licoes = exerciciosDoModulo(m.slug);
            const questoes = licoes.reduce((s, l) => s + Math.max(1, questoesDaLicao(l.slug).length), 0);
            return (
              <details key={m.slug} className="group rounded-2xl border border-line bg-surface" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink font-display font-bold text-accent">{m.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.titulo}</span>
                    <span className="block text-sm text-muted">
                      {licoes.length} lições · {questoes} questões · teste no final
                    </span>
                  </span>
                  <span className="text-2xl text-muted transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <div className="border-t border-line px-5 pt-3 pb-5">
                  <p className="mb-3 text-sm text-muted">{m.descricao}</p>
                  <ol className="space-y-1.5">
                    {licoes.map((l, j) => (
                      <li key={l.slug} className="flex items-center gap-3 text-sm">
                        <span className="w-5 shrink-0 text-right font-mono text-muted">{j + 1}</span>
                        <span className="min-w-0 flex-1">{l.titulo}</span>
                        {l.plano === "free" ? (
                          <Link href={`/exercicios/${l.slug}`} className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                            grátis
                          </Link>
                        ) : (
                          <span className="shrink-0 rounded-full bg-header px-2 py-0.5 text-xs font-semibold text-muted">Pro</span>
                        )}
                      </li>
                    ))}
                    <li className="flex items-center gap-3 border-t border-line pt-2 text-sm font-semibold">
                      <span className="w-5 shrink-0 text-right" aria-hidden>
                        ★
                      </span>
                      <span className="flex-1">Teste do módulo: {testeDoModulo(m.slug).length} questões, sem dicas</span>
                      <span className="shrink-0 rounded-full bg-header px-2 py-0.5 text-xs font-semibold text-muted">Pro</span>
                    </li>
                  </ol>
                </div>
              </details>
            );
          })}
          <p className="text-sm text-muted">
            Mais {n.extras} exercícios de prática extra, divididos pelos módulos, e o arquivo com todos os {NOME_DESAFIO} anteriores.
          </p>
        </div>
      </Secao>

      {/* Prática que não acaba */}
      <Secao rotulo="Prática que não acaba" titulo="O Pro não termina na última lição">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Um desafio novo todo dia", `O ${NOME_DESAFIO}: uma planilha nova a cada dia, com a ofensiva para manter o ritmo e o arquivo de todos os anteriores.`],
            ["Conteúdo novo todo mês", "Pacotes temáticos (orçamento, Imposto de Renda, Black Friday, 13º) e mais questões de concurso e de simulado entrando na plataforma."],
            ["Refaça quando quiser", "Lições, testes de módulo e simulados podem ser refeitos à vontade. Errou? Volta, treina e tenta de novo."],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-2xl border border-line bg-surface p-6">
              <p className="mb-2 text-lg font-semibold">{titulo}</p>
              <p className="text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Certificado de Especialista */}
      <section className="grid items-center gap-8 rounded-3xl border-4 border-amber-400 bg-amber-50 p-6 sm:p-10 md:grid-cols-[auto_1fr]" data-testid="secao-especialista">
        <IconeTrofeu className="mx-auto h-32 w-32" />
        <div className="space-y-3">
          <p className="text-xs font-bold tracking-wider text-amber-700 uppercase">Certificado</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Termine a trilha como Especialista em Excel</h2>
          <p className="text-lg text-ink">
            Passe no teste de cada um dos {modulosDoEspecialista().length} módulos e receba o <strong>certificado de Especialista em Excel</strong>, com seu nome e um
            link público de verificação. No caminho, cada módulo concluído também vira um certificado.
          </p>
          <ul className="space-y-1.5 text-ink">
            {[
              "Suas respostas são corrigidas de novo antes de emitir: quem vê o certificado sabe que foi conquistado.",
              "Um clique adiciona ao perfil do LinkedIn, e outro compartilha num post.",
              "Salve em PDF para anexar ao currículo.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-success" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Para quem é */}
      <Secao rotulo="Para quem é" titulo="Feito para quem precisa usar, não só entender">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="mb-4 font-semibold">O Pro é para você se…</p>
            <ul className="space-y-3">
              {PARA_QUEM.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-xs font-bold text-white" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-bg p-6">
            <p className="mb-4 font-semibold">Talvez não seja, se você…</p>
            <ul className="space-y-3 text-muted">
              {NAO_E.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-header text-xs font-bold" aria-hidden>
                    ×
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* Grátis x Pro */}
      <Secao rotulo="Comparação" titulo="O que muda quando você assina">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm sm:text-base" data-testid="comparacao">
            <thead className="bg-header text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-6">Recurso</th>
                <th className="w-20 px-2 py-3 text-center font-semibold sm:w-32">Grátis</th>
                <th className="w-20 bg-accent px-2 py-3 text-center font-semibold sm:w-32">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(
                [
                  ["Módulo Intro, do zero à primeira fórmula", true, true],
                  ["1ª lição de cada módulo", true, true],
                  [`${NOME_DESAFIO} e ofensiva`, true, true],
                  contasLigadas()
                    ? ["Progresso salvo na conta, em qualquer aparelho", true, true]
                    : ["Progresso salvo neste navegador (contas em breve)", true, true],
                  [`Todas as lições dos ${n.modulos} módulos (${n.questoesLicao} questões de lição)`, "1ª lição", true],
                  [`Teste de cada módulo (${n.testes} testes)`, n.testesPro < n.testes ? "só o do Intro" : false, true],
                  ["Tabela dinâmica, gráficos, formatação condicional, validação e abas na própria planilha", "1ª lição", true],
                  [`Prática extra (${n.extras} exercícios)`, false, true],
                  [`Simulados de teste de vaga, com tempo (${n.simulados} níveis)`, false, true],
                  [`Questões de concurso no estilo das bancas (${n.questoesConcurso})`, false, true],
                  ["Certificado de Especialista em Excel e por módulo, com verificação para o LinkedIn", false, true],
                  ["Arquivo com todos os desafios anteriores", "só o de ontem", true],
                ] as [string, boolean | string, boolean][]
              ).map(([recurso, gratis, pro]) => (
                <tr key={recurso}>
                  <td className="px-4 py-3 sm:px-6">{recurso}</td>
                  <td className="px-2 py-3 text-center text-muted">{marca(gratis)}</td>
                  <td className="bg-accent-soft px-2 py-3 text-center font-semibold">{marca(pro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* Planos */}
      <Secao id="planos" rotulo="Planos" titulo="Menos que um lanche por mês">
        <div className="grid gap-4 md:grid-cols-2" data-testid="precos-pro">
          <div className="relative flex flex-col rounded-3xl border-2 border-ink bg-surface p-6 shadow-xl sm:p-8">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink">{economiaAnual()}% mais barato</span>
            <p className="font-semibold">Anual</p>
            <p className="mt-2 font-display text-5xl font-extrabold">
              {reais(PRECO.anualPorMes)}
              <span className="text-lg font-medium text-muted">/mês</span>
            </p>
            <p className="mt-1 text-sm text-muted">{reais(PRECO.anual)} de uma vez, no cartão (dá para parcelar). 12 meses de acesso, sem renovação automática.</p>
            <div className="mt-auto pt-6">
              <Cta aVenda={aVenda} plano="anual" largo>
                Assinar o anual
              </Cta>
            </div>
          </div>
          <div className="flex flex-col rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <p className="font-semibold">Mensal</p>
            <p className="mt-2 font-display text-5xl font-extrabold">
              {reais(PRECO.mensal)}
              <span className="text-lg font-medium text-muted">/mês</span>
            </p>
            <p className="mt-1 text-sm text-muted">No cartão, renova todo mês. Cancele quando quiser em Minha conta.</p>
            <div className="mt-auto pt-6">
              <Cta aVenda={aVenda} plano="mensal" largo claro>
                Assinar o mensal
              </Cta>
            </div>
          </div>
        </div>
        {B2B_NO_AR && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
            <div>
              <p className="font-semibold">Para a sua equipe ou turma</p>
              <p className="text-sm text-muted">Licenças em grupo e um piloto de 30 dias, com o resultado medido antes e depois.</p>
            </div>
            <Link href="/empresas" className="rounded-lg border border-ink bg-white px-5 py-2.5 font-semibold hover:bg-bg">
              Falar com a gente
            </Link>
          </div>
        )}
      </Secao>

      {/* Garantia */}
      <section className="flex flex-col items-center gap-8 rounded-3xl bg-success-bg p-8 text-center sm:flex-row sm:p-12 sm:text-left" data-testid="garantia">
        <SeloGarantia dias={PRECO.garantiaDias} className="h-44 w-44 shrink-0" />
        <div className="space-y-3">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Garantia incondicional de {PRECO.garantiaDias} dias</h2>
          <p className="text-lg text-ink">
            Assine, faça os exercícios, teste os módulos. Se em {PRECO.garantiaDias} dias você achar que não é para você, mande um e-mail e devolvemos o
            valor inteiro. Sem perguntas, sem formulário de retenção.
          </p>
          <p className="text-sm text-muted">O risco é todo nosso.</p>
        </div>
      </section>

      {/* Chegando */}
      <Secao rotulo="Chegando ao Pro" titulo="Sem custo extra para quem assina">
        <div className="grid gap-3 sm:max-w-md">
          {[
            ["Pacote do mês", "Exercícios em torno de um tema: orçamento, Imposto de Renda, Black Friday, 13º."],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-2xl border border-dashed border-line bg-bg p-5">
              <span className="mb-2 inline-block rounded-full bg-header px-2 py-0.5 text-xs font-semibold text-muted">em breve</span>
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Perguntas */}
      <Secao rotulo="Dúvidas" titulo="Perguntas frequentes">
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-5 sm:px-6">
          {PERGUNTAS.map(([pergunta, resposta]) => (
            <details key={pergunta} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {pergunta}
                <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-muted">{resposta}</p>
            </details>
          ))}
        </div>
      </Secao>

      {/* Chamada final */}
      <section className="flex flex-col items-start gap-6 rounded-3xl bg-ink p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="font-display text-3xl font-extrabold sm:text-4xl">O próximo PROCV você faz de olhos fechados.</p>
          <p className="text-white/70">
            A partir de {reais(PRECO.anualPorMes)}/mês, com garantia de {PRECO.garantiaDias} dias.
          </p>
        </div>
        {aVenda ? (
          <Link href="/assinar?plano=anual" className="shrink-0 rounded-lg bg-accent px-6 py-3.5 font-semibold text-ink hover:brightness-95">
            Assinar o Pro
          </Link>
        ) : (
          <Link href="/trilha" className="shrink-0 rounded-lg bg-accent px-6 py-3.5 font-semibold text-ink hover:brightness-95">
            Começar grátis
          </Link>
        )}
      </section>
    </div>
  );
}

function marca(v: boolean | string) {
  if (typeof v === "string") return <span className="text-xs sm:text-sm">{v}</span>;
  return v ? <span aria-label="sim">✓</span> : <span aria-label="não">—</span>;
}

function Secao({ id, rotulo, titulo, children }: { id?: string; rotulo: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-6">
      <div>
        <p className="mb-2 text-xs font-bold tracking-wider text-success uppercase">{rotulo}</p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Cta({
  aVenda,
  plano,
  children,
  grande,
  largo,
  claro,
}: {
  aVenda: boolean;
  plano: "anual" | "mensal";
  children: ReactNode;
  grande?: boolean;
  largo?: boolean;
  claro?: boolean;
}) {
  const base = `${largo ? "block w-full text-center" : "inline-block"} rounded-lg font-semibold ${grande || largo ? "px-6 py-3.5" : "px-5 py-3"}`;
  if (!aVenda)
    return (
      <span className={`${base} cursor-not-allowed bg-header text-muted`} aria-disabled>
        Em breve
      </span>
    );
  return (
    <Link
      href={`/assinar?plano=${plano}`}
      className={`${base} ${claro ? "border border-ink bg-white text-ink hover:bg-bg" : "bg-ink text-white hover:bg-ink-soft"}`}
      data-testid={largo ? `assinar-${plano}` : undefined}
    >
      {children}
    </Link>
  );
}

/** Um exercício Pro "em ação": barra de fórmulas, planilha e o acerto. Só HTML, sem imagem. */
function Ilustracao() {
  const linhas = [
    ["Código", "Produto", "Preço"],
    ["A12", "Caderno", "R$ 18,90"],
    ["B07", "Mochila", "R$ 120,00"],
    ["C33", "Estojo", "R$ 24,50"],
  ];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="rotate-1 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
        <p className="mb-3 text-xs font-semibold text-muted">Módulo {numeroDoModulo("busca")}: Busca · PROCV</p>
        <div className="mb-3 flex overflow-hidden rounded-lg border border-line font-mono text-sm">
          <span className="border-r border-line bg-header px-3 py-2 text-muted italic">fx</span>
          <span className="truncate px-3 py-2">=PROCV(E2;A2:C4;3;FALSO)</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-line text-sm">
          {linhas.map((l, i) => (
            <div key={l[0]} className={`grid grid-cols-3 ${i === 0 ? "bg-header font-semibold" : "border-t border-line"}`}>
              {l.map((c, j) => (
                <span key={j} className={`px-3 py-2 ${j === 2 && i > 0 ? "text-right" : ""} ${i === 2 ? "bg-accent-soft" : ""}`}>
                  {c}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border-2 border-success bg-success-bg px-3 py-2">
          <span className="font-mono text-sm">F2 = R$ 120,00</span>
          <span className="text-sm font-semibold text-success">Correto! ✓</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 -rotate-3 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
        🔥 12 dias seguidos
      </div>
    </div>
  );
}
