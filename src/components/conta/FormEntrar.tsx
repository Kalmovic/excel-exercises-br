"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConta } from "@/lib/conta";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Para onde ir depois de entrar: ?proximo=/caminho (só caminhos do próprio site). */
function destino() {
  const p = new URLSearchParams(window.location.search).get("proximo");
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/trilha";
}

/** Login sem senha: o aluno digita o e-mail, recebe um código de 6 dígitos e digita o código. */
export function FormEntrar() {
  const conta = useConta();
  const router = useRouter();
  const [passo, setPasso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (passo === "codigo") campoCodigo.current?.focus();
  }, [passo]);

  if (conta.estado === "logado")
    return (
      <div className="space-y-3" data-testid="ja-logado">
        <p>
          Você entrou como <strong>{conta.email}</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trilha" className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-soft">
            Ir para a trilha
          </Link>
          <Link href="/conta" className="rounded-lg border border-line bg-surface px-4 py-2 font-medium">
            Minha conta
          </Link>
        </div>
      </div>
    );

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = email.trim().toLowerCase();
    if (!EMAIL.test(limpo)) return setErro("Confira o e-mail: parece faltar alguma parte.");
    setErro(null);
    setEnviando(true);
    const { error } = await supabaseNavegador()!.auth.signInWithOtp({ email: limpo, options: { shouldCreateUser: true } });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error.status, error.message));
    setEmail(limpo);
    setPasso("codigo");
  };

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = codigo.replace(/\D/g, "");
    if (token.length !== 6) return setErro("O código tem 6 números.");
    setErro(null);
    setEnviando(true);
    const { error } = await supabaseNavegador()!.auth.verifyOtp({ email, token, type: "email" });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error.status, error.message));
    router.push(destino());
  };

  const botao = "w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white hover:bg-ink-soft disabled:opacity-50";
  const campo = "w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent";

  return passo === "email" ? (
    <form onSubmit={pedirCodigo} className="space-y-3" noValidate>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Seu e-mail</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={campo}
          data-testid="email-entrar"
        />
      </label>
      {erro && <p className="text-sm text-red-700" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando} className={botao}>
        {enviando ? "Enviando…" : "Receber código por e-mail"}
      </button>
      <p className="text-sm text-muted">Sem senha: a cada acesso, mandamos um código de 6 números para o seu e-mail.</p>
    </form>
  ) : (
    <form onSubmit={confirmar} className="space-y-3" noValidate>
      <p>
        Mandamos um código para <strong>{email}</strong>. Ele chega em até 1 minuto; confira também o spam.
      </p>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Código</span>
        <input
          ref={campoCodigo}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className={`${campo} text-center font-mono text-2xl tracking-[0.4em]`}
          data-testid="codigo-entrar"
        />
      </label>
      {erro && <p className="text-sm text-red-700" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando} className={botao}>
        {enviando ? "Conferindo…" : "Entrar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setPasso("email");
          setCodigo("");
          setErro(null);
        }}
        className="text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        Usar outro e-mail
      </button>
    </form>
  );
}

function mensagemDeErro(status: number | undefined, mensagem: string) {
  if (status === 429) return "Muitos pedidos seguidos. Espere um minuto e tente de novo.";
  if (/expired|invalid/i.test(mensagem)) return "Código errado ou vencido. Confira os números ou peça outro código.";
  return "Não deu certo agora. Confira sua conexão e tente de novo.";
}
