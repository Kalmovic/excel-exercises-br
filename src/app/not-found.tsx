import Link from "next/link";
import { TelaErro, botaoErro } from "@/components/site/TelaErro";

export default function NaoEncontrado() {
  return (
    <TelaErro codigo="#REF!" titulo="Esta página não existe.">
      <p>A referência aponta para um lugar que não está aqui. Pode ter sido um link antigo ou um erro de digitação.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/trilha" className={botaoErro}>
          Ir para a trilha
        </Link>
        <Link href="/desafio" className="rounded-lg border border-ink bg-surface px-5 py-3 font-semibold text-ink">
          Desafio do dia
        </Link>
      </div>
    </TelaErro>
  );
}
