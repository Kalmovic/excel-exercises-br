"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useConta } from "@/lib/conta";
import { PRECO, economiaAnual, reais } from "@/lib/site";

type Plano = "anual" | "mensal";

const PLANOS: Record<Plano, { titulo: string; preco: string; detalhe: string }> = {
  anual: {
    titulo: "Anual",
    preco: `${reais(PRECO.anualPorMes)}/mês`,
    detalhe: `${reais(PRECO.anual)} de uma vez, no cartão (dá para parcelar). ${economiaAnual()}% a menos que o mensal. 12 meses de acesso.`,
  },
  mensal: {
    titulo: "Mensal",
    preco: `${reais(PRECO.mensal)}/mês`,
    detalhe: "No cartão, renova todo mês. Cancele quando quiser em Minha conta.",
  },
};

const planoDaUrl = () => (new URLSearchParams(window.location.search).get("plano") === "mensal" ? "mensal" : "anual");

export function FormAssinar() {
  const conta = useConta();
  const inicial = useSyncExternalStore(() => () => {}, planoDaUrl, () => "anual" as Plano);
  const [escolhido, setEscolhido] = useState<Plano | null>(null);
  const plano = escolhido ?? inicial;
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (conta.estado === "carregando") return <p className="text-muted">Carregando…</p>;
  if (conta.estado !== "logado")
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <p>Para assinar, entre na sua conta. Ela guarda seu progresso e o seu plano.</p>
        <Link
          href={`/entrar?proximo=${encodeURIComponent(`/assinar?plano=${plano}`)}`}
          className="inline-block rounded-lg bg-ink px-4 py-2.5 font-semibold text-white hover:bg-ink-soft"
          data-testid="entrar-para-assinar"
        >
          Entrar ou criar conta
        </Link>
      </div>
    );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano }),
      });
      const json = (await r.json().catch(() => ({}))) as { url?: string; erro?: string };
      if (!r.ok || !json.url) throw new Error(json.erro ?? "Não deu certo agora. Tente de novo.");
      window.location.href = json.url; // página de pagamento do Stripe
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Plano</legend>
        {(Object.keys(PLANOS) as Plano[]).map((p) => (
          <label
            key={p}
            className={`cursor-pointer rounded-xl border-2 bg-white p-4 ${plano === p ? "border-ink" : "border-line hover:border-muted"}`}
          >
            <input type="radio" name="plano" value={p} checked={plano === p} onChange={() => setEscolhido(p)} className="sr-only" />
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{PLANOS[p].titulo}</span>
              <span className="font-display text-xl font-extrabold">{PLANOS[p].preco}</span>
            </span>
            <span className="mt-1 block text-sm text-muted">{PLANOS[p].detalhe}</span>
          </label>
        ))}
      </fieldset>

      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white hover:bg-ink-soft disabled:opacity-50"
        data-testid="ir-para-pagamento"
      >
        {enviando ? "Preparando o pagamento…" : "Ir para o pagamento"}
      </button>
      <p className="text-sm text-muted">
        O pagamento é feito no Stripe, com segurança: o Planilhês não vê nem guarda os dados do seu cartão. Assim que o pagamento for confirmado, o Pro é liberado na sua conta.
        Garantia de {PRECO.garantiaDias} dias: se não gostar, devolvemos o valor.
      </p>
    </form>
  );
}
