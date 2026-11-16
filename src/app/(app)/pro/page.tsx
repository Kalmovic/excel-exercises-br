import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { MODULOS, exercicios, exerciciosDoModulo } from "@/content";
import { asaasConfigurado } from "@/lib/asaas";
import { NOME_DESAFIO, PRECO, economiaAnual, reais } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pro: a trilha completa de Excel",
  description: "Todos os módulos de Excel em português, com correção na hora: SE, SOMASE, PROCV, datas, textos e casos reais.",
  robots: { index: false, follow: true },
};

/** Tudo contado do conteúdo de verdade: a página nunca promete um número que não existe. */
function numeros() {
  const naTrilha = exercicios.filter((e) => !e.extra && !e.teste);
  return {
    modulos: MODULOS.filter((m) => m.slug !== "intro").length,
    questoesPro: naTrilha.filter((e) => e.plano === "pro").length,
    // Grátis dentro dos 8 módulos (a 1ª lição de cada um); o Intro fica de fora.
    questoesGratis: naTrilha.filter((e) => e.plano === "free" && e.modulo !== "intro").length,
    testes: exercicios.filter((e) => e.teste && e.plano === "pro").length / 5,
    extras: exercicios.filter((e) => e.extra).length,
  };
}

const PERGUNTAS: [string, string][] = [
  [
    "Como funciona a garantia?",
    `Você tem ${PRECO.garantiaDias} dias para testar. Se não gostar, é só pedir pelo e-mail e devolvemos o valor inteiro, sem perguntas.`,
  ],
  ["Consigo cancelar quando quiser?", "Sim. No mensal, você cancela a renovação em Minha conta, num clique, e continua Pro até o fim do mês já pago. O anual não renova sozinho."],
  ["Quais as formas de pagamento?", "Mensal no cartão de crédito. Anual no Pix ou no cartão. O pagamento é feito no Asaas, um sistema de pagamentos brasileiro: o Planilhês não vê nem guarda os dados do seu cartão."],
  ["Preciso ter o Excel instalado?", "Não. A planilha roda no navegador, no computador ou no celular, com as fórmulas em português como no Excel brasileiro."],
  ["E o que eu já fiz no plano grátis?", "Continua lá. O progresso fica na sua conta, e o Pro só libera o resto da trilha."],
  ["Serve para quem está começando?", "Sim. A trilha começa no Intro (grátis) e cada lição tem dicas e explicação. Se você já sabe o básico, pode ir direto ao módulo que precisa."],
];

export default function Pro() {
  // Variáveis do Asaas lidas no build: sem elas, os botões viram "em breve".
  const aVenda = asaasConfigurado();
  const n = numeros();
  const total = n.questoesPro + n.extras;

  return (
    <div className="space-y-20 pb-8">
      {/* Topo */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-semibold text-ink">Planilhês Pro</span>
          <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">
            Pratique até o Excel virar reflexo.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            O grátis te mostra o caminho. O Pro libera a trilha inteira: {n.modulos} módulos, do SOMA ao PROCV, com {total} exercícios corrigidos na
            hora, numa planilha de verdade, em português.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Cta aVenda={aVenda} plano="anual" grande>
              Assinar o Pro
            </Cta>
            <a href="#planos" className="rounded-lg border border-ink bg-surface px-6 py-3.5 font-semibold hover:bg-bg">
              Ver os planos
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {[`Garantia de ${PRECO.garantiaDias} dias`, "Cancele quando quiser", "Pix ou cartão"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="text-success" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Ilustracao />
      </section>

      {/* Números */}
      <section aria-label="O que tem no Pro" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [`${n.modulos}`, "módulos completos", "do Fundamentos aos casos reais"],
          [`${n.questoesPro}`, "questões de lição", "com dicas e explicação"],
          [`${n.testes}`, "testes de módulo", "para provar que aprendeu"],
          [`${n.extras}`, "exercícios extras", "para treinar mais cada tema"],
        ].map(([valor, rotulo, detalhe]) => (
          <div key={rotulo} className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-4xl font-extrabold">{valor}</p>
            <p className="font-semibold">{rotulo}</p>
            <p className="text-sm text-muted">{detalhe}</p>
          </div>
        ))}
      </section>

      {/* Grátis x Pro */}
      <Secao rotulo="Comparação" titulo="O que muda quando você assina">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm sm:text-base">
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
                  ["Progresso salvo na conta, em qualquer aparelho", true, true],
                  [`Todas as lições dos ${n.modulos} módulos (${n.questoesPro + n.questoesGratis} questões)`, false, true],
                  [`Teste de cada módulo (${n.testes} testes)`, false, true],
                  [`Prática extra (${n.extras} exercícios)`, false, true],
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

      {/* A trilha */}
      <Secao rotulo="A trilha" titulo="Do primeiro clique ao PROCV, em ordem">
        <ol className="grid gap-3 sm:grid-cols-2">
          {MODULOS.filter((m) => m.slug !== "intro").map((m) => {
            const licoes = exerciciosDoModulo(m.slug).length;
            return (
              <li key={m.slug} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink font-display font-bold text-accent">{m.numero}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{m.titulo}</p>
                  <p className="text-sm text-muted">{m.descricao}</p>
                  <p className="mt-1 text-xs text-muted">
                    {licoes} lições · a 1ª é grátis · teste no final
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Secao>

      {/* Chegando */}
      <Secao rotulo="Chegando ao Pro" titulo="Sem custo extra para quem assina">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pacote do mês", "Exercícios em torno de um tema: orçamento, Imposto de Renda, Black Friday, 13º."],
            ["Excel para concurso", "Questões no formato das bancas, com a planilha para testar a resposta."],
            ["Simulado de vaga", "O teste prático de Excel dos processos seletivos, cronometrado."],
            ["Certificado", "Por módulo, com link público de verificação para o LinkedIn."],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-2xl border border-dashed border-line bg-bg p-5">
              <span className="mb-2 inline-block rounded-full bg-header px-2 py-0.5 text-xs font-semibold text-muted">em breve</span>
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Planos */}
      <Secao id="planos" rotulo="Planos" titulo="Menos que um lanche por mês">
        <div className="grid gap-4 md:grid-cols-2" data-testid="precos-pro">
          <div className="relative flex flex-col rounded-3xl border-2 border-ink bg-surface p-6 shadow-xl sm:p-8">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink">
              {economiaAnual()}% mais barato
            </span>
            <p className="font-semibold">Anual</p>
            <p className="mt-2 font-display text-5xl font-extrabold">
              {reais(PRECO.anualPorMes)}
              <span className="text-lg font-medium text-muted">/mês</span>
            </p>
            <p className="mt-1 text-sm text-muted">{reais(PRECO.anual)} de uma vez, no Pix ou no cartão. 12 meses de acesso, sem renovação automática.</p>
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
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-success-bg p-5" data-testid="garantia">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success font-display text-xl font-bold text-white" aria-hidden>
            {PRECO.garantiaDias}
          </span>
          <p className="flex-1 text-ink">
            <strong>Garantia de {PRECO.garantiaDias} dias.</strong> Assine, faça os exercícios e, se não for para você, devolvemos o valor inteiro.
          </p>
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
          <p className="text-white/70">A partir de {reais(PRECO.anualPorMes)}/mês, com garantia de {PRECO.garantiaDias} dias.</p>
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
        <p className="mb-3 text-xs font-semibold text-muted">Módulo 4: Busca · PROCV</p>
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
