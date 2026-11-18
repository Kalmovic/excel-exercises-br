"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useConta } from "@/lib/conta";
import { destinoSeguro } from "@/lib/destino";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESPERA_REENVIO = 60;

/** Para onde ir depois de entrar: ?proximo=/caminho (só caminhos do próprio site). */
function destino() {
  return destinoSeguro(new URLSearchParams(window.location.search).get("proximo"), window.location.origin);
}

/**
 * Login sem senha: e-mail → código de 6 dígitos.
 * Quem já entrou vê o atalho para a trilha. O formulário fica num componente
 * à parte: ao entrar ele é desmontado, então ao sair da conta recomeça do zero
 * (o Next mantém a página montada entre navegações).
 */
export function FormEntrar() {
  const conta = useConta();
  if (conta.estado === "carregando") return <div className="h-64" aria-hidden />;
  if (conta.estado === "logado")
    return (
      <div className="space-y-4" data-testid="ja-logado">
        <p className="text-lg">
          Você entrou como <strong className="break-all">{conta.email}</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trilha" className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
            Ir para a trilha
          </Link>
          <Link href="/conta" className="rounded-lg border border-line bg-white px-5 py-3 font-semibold hover:bg-bg">
            Minha conta
          </Link>
        </div>
      </div>
    );
  return <Passos />;
}

function Passos() {
  const router = useRouter();
  const [passo, setPasso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  // Voltou do link do e-mail sem conseguir entrar (/auth/confirmar manda ?erro=link).
  const linkFalhou = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("erro") === "link",
    () => false,
  );
  const [pediu, setPediu] = useState(false);
  const aviso = erro ?? (linkFalhou && !pediu ? "O link venceu ou foi aberto em outro navegador. Peça um código novo." : null);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const enviarCodigo = async (para: string) => {
    setEnviando(true);
    const { error } = await supabaseNavegador()!.auth.signInWithOtp({
      email: para,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirmar?proximo=${encodeURIComponent(destino())}`,
      },
    });
    setEnviando(false);
    if (error) {
      setErro(mensagemDeErro(error.status, error.message));
      return false;
    }
    setEspera(ESPERA_REENVIO);
    return true;
  };

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPediu(true);
    const limpo = email.trim().toLowerCase();
    if (!EMAIL.test(limpo)) return setErro("Confira o e-mail: parece faltar alguma parte.");
    setErro(null);
    if (await enviarCodigo(limpo)) {
      setEmail(limpo);
      setCodigo("");
      setPasso("codigo");
    }
  };

  const confirmar = async (valor: string) => {
    if (valor.length !== 6 || enviando) return;
    setErro(null);
    setEnviando(true);
    const { error } = await supabaseNavegador()!.auth.verifyOtp({ email, token: valor, type: "email" });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error.status, error.message));
    router.push(destino());
  };

  const botao = "w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white hover:bg-ink-soft disabled:opacity-50";

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-sm" aria-label="Etapas">
        {(["E-mail", "Código"] as const).map((nome, i) => {
          const ativo = (passo === "email" ? 0 : 1) === i;
          const feito = passo === "codigo" && i === 0;
          return (
            <li key={nome} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-line" aria-hidden />}
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  feito ? "bg-success text-white" : ativo ? "bg-ink text-white" : "bg-header text-muted"
                }`}
              >
                {feito ? "✓" : i + 1}
              </span>
              <span className={ativo ? "font-semibold" : "text-muted"}>{nome}</span>
            </li>
          );
        })}
      </ol>

      {passo === "email" ? (
        <form onSubmit={pedirCodigo} className="space-y-4" noValidate>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Seu e-mail</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => (setEmail(e.target.value), setErro(null))}
              placeholder="voce@email.com"
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none focus:border-ink focus:ring-2 focus:ring-accent"
              data-testid="email-entrar"
            />
          </label>
          {aviso && (
            <p className="text-sm text-red-700" role="alert">
              {aviso}
            </p>
          )}
          <button type="submit" disabled={enviando} className={botao}>
            {enviando ? "Enviando…" : "Receber código"}
          </button>
          <p className="text-sm text-muted">Sem senha: mandamos um código de 6 números para o seu e-mail. Não tem conta? Ela é criada agora.</p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirmar(codigo);
          }}
          className="space-y-4"
          noValidate
        >
          <p>
            Mandamos um código para <strong className="break-all">{email}</strong>.
          </p>
          <CaixasCodigo
            valor={codigo}
            aoMudar={(v) => {
              setCodigo(v);
              setErro(null);
              if (v.length === 6) void confirmar(v); // completou: entra sem precisar clicar
            }}
          />
          {erro && (
            <p className="text-sm text-red-700" role="alert">
              {erro}
            </p>
          )}
          <button type="submit" disabled={enviando || codigo.length !== 6} className={botao}>
            {enviando ? "Conferindo…" : "Entrar"}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={espera > 0 || enviando}
              onClick={() => void enviarCodigo(email)}
              className="text-success underline-offset-4 hover:underline disabled:text-muted disabled:no-underline"
              data-testid="reenviar-codigo"
            >
              {espera > 0 ? `Reenviar código em ${espera}s` : "Reenviar código"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasso("email");
                setCodigo("");
                setErro(null);
              }}
              className="text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
          <p className="text-xs text-muted">Não chegou em 1 minuto? Confira o spam e a aba Promoções.</p>
        </form>
      )}
    </div>
  );
}

/**
 * Seis "células" para o código. Por baixo é um input só (aceita colar o
 * código inteiro e o preenchimento automático do celular).
 */
function CaixasCodigo({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [foco, setFoco] = useState(false);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 números"
        maxLength={6}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
        data-testid="codigo-entrar"
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const atual = foco && (i === valor.length || (valor.length === 6 && i === 5));
          return (
            <div
              key={i}
              className={`grid h-14 place-items-center rounded-lg border-2 bg-white font-mono text-2xl font-bold ${
                atual ? "border-success bg-accent-soft" : valor[i] ? "border-ink" : "border-line"
              }`}
            >
              {valor[i] ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mensagemDeErro(status: number | undefined, mensagem: string) {
  if (status === 429) return "Muitos pedidos seguidos. Espere um minuto e tente de novo.";
  if (/expired|invalid/i.test(mensagem)) return "Código errado ou vencido. Confira os números ou peça outro código.";
  return "Não deu certo agora. Confira sua conexão e tente de novo.";
}
