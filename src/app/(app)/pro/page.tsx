import type { Metadata } from "next";
import Link from "next/link";
import { MODULOS_PLANEJADOS } from "@/content/modulos-pro";
import { PRECO, economiaAnual, reais } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pro: em breve",
  description: "Todos os módulos de Excel em português, pacotes de exercícios novos todo mês e o arquivo de desafios.",
  // Página provisória enquanto o Pro não existe: fora do índice de busca.
  robots: { index: false, follow: true },
};

const BENEFICIOS = [
  ["Todos os módulos", "Do Fundamentos aos casos reais, com dezenas de exercícios por módulo."],
  ["Pacote novo todo mês", "Exercícios em torno de um tema do mês: orçamento, Imposto de Renda, Black Friday, 13º."],
  ["Arquivo de desafios", "Todos os desafios diários que já passaram, para refazer na planilha."],
  ["Entrevista e concurso", "Prática no formato de testes de emprego e de questões de banca."],
  ["Certificado", "Por módulo, com link público de verificação para o LinkedIn."],
] as const;

export default function Pro() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-ink">Em breve</span>
        <h1 className="text-3xl font-bold tracking-tight">Pro: pratique Excel até ficar fluente</h1>
        <p className="text-lg text-zinc-600">
          O Intro, o desafio diário, a ofensiva e o 1º exercício de cada módulo continuam grátis. O Pro é para quem quer ir além: todos os exercícios, conteúdo novo
          todo mês e o arquivo completo de desafios.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2" data-testid="precos-pro">
        <div className="rounded-lg border-2 border-ink bg-white p-4">
          <p className="text-sm font-semibold">Anual · mais vantajoso</p>
          <p className="font-display text-3xl font-extrabold">
            {reais(PRECO.anualPorMes)}
            <span className="text-base font-medium text-muted">/mês</span>
          </p>
          <p className="text-sm text-zinc-600">
            {reais(PRECO.anual)} no Pix ou em até {PRECO.parcelasAnual}x no cartão. {economiaAnual()}% a menos que o mensal.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm font-semibold">Mensal</p>
          <p className="font-display text-3xl font-extrabold">
            {reais(PRECO.mensal)}
            <span className="text-base font-medium text-muted">/mês</span>
          </p>
          <p className="text-sm text-zinc-600">No cartão, renovação automática. Cancele quando quiser.</p>
        </div>
        <p className="text-sm text-zinc-600 sm:col-span-2">
          Garantia de {PRECO.garantiaDias} dias: se não gostar, devolvemos o valor. Menos que um lanche por mês, contra
          cursos de Excel de R$ 300 ou mais.
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2" data-testid="beneficios-pro">
        {BENEFICIOS.map(([titulo, texto]) => (
          <li key={titulo} className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold">{titulo}</p>
            <p className="text-sm text-zinc-600">{texto}</p>
          </li>
        ))}
      </ul>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Módulos da trilha</h2>
        <ol className="list-decimal space-y-1 pl-6 text-zinc-700">
          {MODULOS_PLANEJADOS.map((m) => (
            <li key={m.slug}>{m.titulo}</li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-accent bg-accent-soft p-4">
        <p className="flex-1 text-ink">O Pro ainda não está à venda. Enquanto isso, o desafio de hoje te espera.</p>
        <Link href="/desafio" className="rounded-md bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
          Fazer o desafio de hoje
        </Link>
      </div>
    </div>
  );
}
