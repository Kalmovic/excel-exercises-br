"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sair, useConta } from "@/lib/conta";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Assinatura = {
  plano: string;
  status: "pendente" | "ativa" | "atrasada" | "cancelada";
  acesso_ate: string | null;
  fatura_url: string | null;
  asaas_assinatura_id: string | null;
};

export function PainelConta() {
  const conta = useConta();
  const router = useRouter();
  const [assinatura, setAssinatura] = useState<Assinatura | null | undefined>(undefined);

  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (conta.estado !== "logado") return;
    void supabaseNavegador()!
      .from("assinaturas")
      .select("plano, status, acesso_ate, fatura_url, asaas_assinatura_id")
      .maybeSingle<Assinatura>()
      .then(({ data }) => setAssinatura(data));
  }, [conta, versao]);

  // Pagamento pendente: confere de 5 em 5 segundos até o aviso do Asaas chegar.
  const pendente = assinatura?.status === "pendente";
  useEffect(() => {
    if (!pendente) return;
    const id = setInterval(() => setVersao((v) => v + 1), 5000);
    return () => clearInterval(id);
  }, [pendente]);

  if (conta.estado === "carregando") return <p className="text-muted">Carregando…</p>;
  if (conta.estado !== "logado")
    return (
      <p>
        Você não entrou.{" "}
        <Link href="/entrar?proximo=/conta" className="text-success underline underline-offset-4">
          Entrar
        </Link>
      </p>
    );

  return (
    <div className="space-y-6" data-testid="painel-conta">
      <section className="space-y-1 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">E-mail</p>
        <p className="font-medium" data-testid="email-conta">{conta.email}</p>
      </section>
      <section className="space-y-2 rounded-2xl border border-line bg-surface p-5" data-testid="plano-conta">
        <p className="text-sm text-muted">Plano</p>
        {assinatura === undefined ? <p className="text-muted">…</p> : <Plano assinatura={assinatura} aoMudar={() => setVersao((v) => v + 1)} />}
      </section>
      <p className="text-sm text-muted">Seu progresso fica salvo na conta: entre com este e-mail em qualquer aparelho para continuar de onde parou.</p>
      <button
        type="button"
        onClick={async () => {
          await sair();
          router.push("/");
        }}
        className="rounded-lg border border-line bg-white px-4 py-2 font-medium hover:bg-bg"
        data-testid="sair"
      >
        Sair
      </button>
    </div>
  );
}

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function Plano({ assinatura: a, aoMudar }: { assinatura: Assinatura | null; aoMudar: () => void }) {
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const comAcesso = !!a?.acesso_ate && new Date(a.acesso_ate) > new Date();

  if (a?.status === "pendente" && !comAcesso)
    return (
      <div className="space-y-2">
        <p className="font-medium">Pagamento pendente ({a.plano})</p>
        <p className="text-sm text-muted">Assim que o pagamento for confirmado, o Pro é liberado aqui. Esta página se atualiza sozinha.</p>
        {a.fatura_url && (
          <a href={a.fatura_url} className="inline-block rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink-soft">
            Pagar agora
          </a>
        )}
      </div>
    );

  if (!a || !comAcesso)
    return (
      <div className="space-y-2">
        <p className="font-medium">Grátis</p>
        <Link href="/pro" className="text-sm text-success underline-offset-4 hover:underline">
          Conhecer o Pro
        </Link>
      </div>
    );

  const renova = a.plano === "mensal" && a.status !== "cancelada" && !!a.asaas_assinatura_id;
  return (
    <div className="space-y-2">
      <p className="font-medium" data-testid="plano-pro">
        Pro {a.plano} · {renova ? `renova em ${data(a.acesso_ate!)}` : `acesso até ${data(a.acesso_ate!)}`}
      </p>
      {a.status === "atrasada" && (
        <p className="text-sm text-red-700">O último pagamento não passou. Confira o cartão para não perder o acesso.</p>
      )}
      {a.status === "cancelada" && <p className="text-sm text-muted">A renovação está cancelada. Você continua Pro até essa data.</p>}
      {renova && (
        <button
          type="button"
          disabled={cancelando}
          onClick={async () => {
            if (!window.confirm(`Cancelar a renovação? Você continua Pro até ${data(a.acesso_ate!)}.`)) return;
            setCancelando(true);
            setErro(null);
            const r = await fetch("/api/assinatura/cancelar", { method: "POST" });
            setCancelando(false);
            if (!r.ok) return setErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? "Não deu certo agora.");
            aoMudar();
          }}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
          data-testid="cancelar-renovacao"
        >
          {cancelando ? "Cancelando…" : "Cancelar renovação"}
        </button>
      )}
      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </div>
  );
}
