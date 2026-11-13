"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sair, useConta } from "@/lib/conta";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Assinatura = { plano: string; status: string; acesso_ate: string | null };

export function PainelConta() {
  const conta = useConta();
  const router = useRouter();
  const [assinatura, setAssinatura] = useState<Assinatura | null | undefined>(undefined);

  useEffect(() => {
    if (conta.estado !== "logado") return;
    void supabaseNavegador()!
      .from("assinaturas")
      .select("plano, status, acesso_ate")
      .maybeSingle<Assinatura>()
      .then(({ data }) => setAssinatura(data));
  }, [conta]);

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

  const pro = assinatura?.acesso_ate && new Date(assinatura.acesso_ate) > new Date();
  return (
    <div className="space-y-6" data-testid="painel-conta">
      <section className="space-y-1 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">E-mail</p>
        <p className="font-medium" data-testid="email-conta">{conta.email}</p>
      </section>
      <section className="space-y-2 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">Plano</p>
        {assinatura === undefined ? (
          <p className="text-muted">…</p>
        ) : pro ? (
          <p className="font-medium">
            Pro {assinatura!.plano} · acesso até {new Date(assinatura!.acesso_ate!).toLocaleDateString("pt-BR")}
          </p>
        ) : (
          <p className="font-medium" data-testid="plano-conta">Grátis</p>
        )}
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
