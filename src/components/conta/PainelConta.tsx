"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { hojeSP } from "@/lib/data-sp";
import { sair, useConta } from "@/lib/conta";
import { calcularOfensiva, lerDias } from "@/lib/ofensiva";
import * as progresso from "@/lib/progresso";
import { PRECO, reais } from "@/lib/site";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { lerTestes } from "@/lib/testes";
import { IconeTrofeu } from "@/components/simulador/Trofeu";

type Assinatura = {
  plano: string;
  status: "pendente" | "ativa" | "atrasada" | "cancelada";
  acesso_ate: string | null;
  fatura_url: string | null;
  stripe_assinatura_id: string | null;
};

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const cartao = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

export function PainelConta({
  trilha,
  modulos,
  titulos,
  modulosEspecialista,
}: {
  trilha: { slug: string; versao: number }[];
  modulos: number;
  modulosEspecialista: string[];
  /** slug do módulo -> "Módulo N: Título" */
  titulos: Record<string, string>;
}) {
  const conta = useConta();
  const router = useRouter();
  const [assinatura, setAssinatura] = useState<Assinatura | null | undefined>(undefined);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (conta.estado !== "logado") return;
    void supabaseNavegador()!
      .from("assinaturas")
      .select("plano, status, acesso_ate, fatura_url, stripe_assinatura_id")
      .maybeSingle<Assinatura>()
      .then(({ data }) => setAssinatura(data));
  }, [conta, versao]);

  // Pagamento pendente: confere de 5 em 5 segundos até o aviso do Stripe chegar.
  const pendente = assinatura?.status === "pendente";
  useEffect(() => {
    if (!pendente) return;
    const id = setInterval(() => setVersao((v) => v + 1), 5000);
    return () => clearInterval(id);
  }, [pendente]);

  if (conta.estado === "carregando") return <div className="h-96" aria-hidden />;
  if (conta.estado !== "logado")
    return (
      <div className={`${cartao} space-y-3 text-center`}>
        <p className="text-lg">Você não entrou na sua conta.</p>
        <Link href="/entrar?proximo=/conta" className="inline-block rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
          Entrar
        </Link>
      </div>
    );

  const pro = !!assinatura?.acesso_ate && new Date(assinatura.acesso_ate) > new Date();
  return (
    <div className="space-y-6" data-testid="painel-conta">
      <header className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink font-display text-2xl font-bold text-accent uppercase" aria-hidden>
          {conta.email[0]}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
          <p className="truncate text-muted" data-testid="email-conta">
            {conta.email}
          </p>
        </div>
        {assinatura !== undefined && (
          <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${pro ? "bg-accent text-ink" : "bg-header text-muted"}`}>
            {pro ? "Pro" : "Grátis"}
          </span>
        )}
      </header>

      <section className={cartao} data-testid="plano-conta" aria-label="Plano">
        {assinatura === undefined ? <div className="h-16" aria-hidden /> : <Plano assinatura={assinatura} aoMudar={() => setVersao((v) => v + 1)} />}
      </section>

      <Progresso trilha={trilha} modulos={modulos} />

      <Certificados titulos={titulos} modulosEspecialista={modulosEspecialista} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        <p className="text-muted">Entre com este e-mail em qualquer aparelho para continuar de onde parou.</p>
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
    </div>
  );
}

function Plano({ assinatura: a, aoMudar }: { assinatura: Assinatura | null; aoMudar: () => void }) {
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const comAcesso = !!a?.acesso_ate && new Date(a.acesso_ate) > new Date();

  if (a?.status === "pendente" && !comAcesso)
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Plano {a.plano}</p>
          <p className="text-lg font-semibold">Aguardando o pagamento</p>
          <p className="text-sm text-muted">Assim que for confirmado, o Pro aparece aqui. A página se atualiza sozinha.</p>
        </div>
        {a.fatura_url && (
          <a href={a.fatura_url} className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
            Pagar agora
          </a>
        )}
      </div>
    );

  if (!a || !comAcesso)
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Plano grátis</p>
          <p className="text-sm text-muted">
            Libere a trilha inteira, os testes de módulo e a prática extra a partir de {reais(PRECO.anualPorMes)}/mês.
          </p>
        </div>
        <Link href="/pro" className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-ink-soft">
          Conhecer o Pro
        </Link>
      </div>
    );

  const renova = a.plano === "mensal" && a.status !== "cancelada" && !!a.stripe_assinatura_id;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted">Pro {a.plano}</p>
        <p className="text-lg font-semibold" data-testid="plano-pro">
          {renova ? `Renova em ${data(a.acesso_ate!)}` : `Acesso até ${data(a.acesso_ate!)}`}
        </p>
      </div>
      {a.status === "atrasada" && <p className="text-sm text-red-700">O último pagamento não passou. Confira o cartão para não perder o acesso.</p>}
      {a.status === "cancelada" && <p className="text-sm text-muted">A renovação está cancelada. Você continua Pro até essa data.</p>}
      {a.plano === "anual" && <p className="text-sm text-muted">O plano anual não renova sozinho: avisamos por e-mail perto do fim.</p>}
      <BotaoPortal />
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

const lerResumo = () =>
  JSON.stringify({
    tudo: progresso.lerTudo(),
    trofeus: Object.keys(progresso.lerTrofeus()).length,
    ofensiva: calcularOfensiva(lerDias(), hojeSP()),
    aprovados: Object.values(lerTestes()).filter((t) => t.aprovado).length,
  });

/** Resumo do progresso (o mesmo que está na conta: a sincronização mantém os dois iguais). */
function Progresso({ trilha, modulos }: { trilha: { slug: string; versao: number }[]; modulos: number }) {
  const bruto = useSyncExternalStore(progresso.assinar, lerResumo, () => "");
  if (!bruto) return <div className="h-32" aria-hidden />;
  const r = JSON.parse(bruto) as {
    tudo: Record<string, progresso.ProgressoExercicio>;
    trofeus: number;
    ofensiva: { atual: number; recorde: number };
    aprovados: number;
  };
  const feitos = trilha.filter((i) => r.tudo[i.slug]?.versao === i.versao && r.tudo[i.slug]?.status === "concluido").length;
  const numeros = [
    [`${feitos}/${trilha.length}`, "lições concluídas"],
    [`${r.ofensiva.atual}`, r.ofensiva.atual === 1 ? "dia seguido" : "dias seguidos"],
    [`${r.trofeus}/${modulos}`, "troféus"],
    [`${r.aprovados}`, r.aprovados === 1 ? "teste aprovado" : "testes aprovados"],
  ];
  return (
    <section className={`${cartao} space-y-5`} aria-label="Seu progresso">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Seu progresso</h2>
        <Link href="/trilha" className="text-sm font-semibold text-success underline-offset-4 hover:underline">
          Continuar a trilha →
        </Link>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-header">
        <div className="h-full rounded-full bg-success" style={{ width: `${trilha.length ? (feitos / trilha.length) * 100 : 0}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numeros.map(([valor, rotulo]) => (
          <div key={rotulo} className="rounded-xl bg-bg p-3">
            <dt className="text-xs text-muted">{rotulo}</dt>
            <dd className="font-display text-2xl font-extrabold">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type Certificado = { codigo: string; modulo: string; emitido_em: string };

/**
 * Certificados do aluno (lidos pelo RLS: só os dele). O de Especialista é o
 * principal; os de módulo são as etapas até ele.
 */
function Certificados({ titulos, modulosEspecialista }: { titulos: Record<string, string>; modulosEspecialista: string[] }) {
  const [lista, setLista] = useState<Certificado[] | null>(null);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    void supabaseNavegador()
      ?.from("certificados")
      .select("codigo, modulo, emitido_em")
      .order("emitido_em")
      .returns<Certificado[]>()
      .then(({ data }) => setLista(data ?? []));
  }, [versao]);
  if (lista === null) return null;
  const especialista = lista.find((c) => c.modulo === "especialista");
  const deModulo = lista.filter((c) => c.modulo !== "especialista");
  const feitos = modulosEspecialista.filter((m) => deModulo.some((c) => c.modulo === m));
  const faltam = modulosEspecialista.filter((m) => !feitos.includes(m));

  return (
    <section className={`${cartao} space-y-5`} aria-label="Certificados" data-testid="certificados-conta">
      <h2 className="text-lg font-semibold">Certificados</h2>

      <div className={`rounded-2xl border-2 p-5 ${especialista ? "border-amber-500 bg-amber-50" : "border-line bg-bg"}`} data-testid="especialista-conta">
        <div className="flex items-start gap-4">
          <IconeTrofeu className={`h-14 w-14 shrink-0 ${especialista ? "" : "opacity-40 grayscale"}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-display text-xl font-extrabold">Especialista em Excel</p>
            {especialista ? (
              <Link href={`/certificado/${especialista.codigo}`} className="inline-block font-semibold text-success underline-offset-4 hover:underline">
                Ver e compartilhar o certificado →
              </Link>
            ) : (
              <>
                <p className="text-sm text-muted">
                  O certificado da trilha completa: passe no teste de todos os módulos. {feitos.length} de {modulosEspecialista.length} módulos certificados.
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-header">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(feitos.length / modulosEspecialista.length) * 100}%` }} />
                </div>
                {faltam.length > 0 ? (
                  <p className="text-xs text-muted">Faltam: {faltam.map((m) => titulos[m] ?? m).join(" · ")}</p>
                ) : (
                  <EmitirEspecialista aoEmitir={() => setVersao((v) => v + 1)} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {deModulo.length > 0 && (
        <ul className="divide-y divide-line">
          {deModulo.map((c) => (
            <li key={c.codigo} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{titulos[c.modulo] ?? c.modulo}</span>
                <span className="font-mono text-xs text-muted">{c.codigo}</span>
              </span>
              <Link href={`/certificado/${c.codigo}`} className="shrink-0 text-sm font-semibold text-success underline-offset-4 hover:underline">
                Ver certificado
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmitirEspecialista({ aoEmitir }: { aoEmitir: () => void }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    void supabaseNavegador()
      ?.from("perfis")
      .select("nome")
      .maybeSingle<{ nome: string | null }>()
      .then(({ data }) => data?.nome && setNome((n) => n || data.nome!));
  }, []);
  return (
    <form
      className="space-y-2"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const limpo = nome.trim().replace(/\s+/g, " ");
        if (limpo.split(" ").length < 2) return setErro("Escreva seu nome completo.");
        setEnviando(true);
        setErro(null);
        const r = await fetch("/api/certificado/especialista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: limpo }) });
        setEnviando(false);
        if (!r.ok) return setErro(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? "Não deu certo agora.");
        aoEmitir();
      }}
    >
      <p className="text-sm font-semibold text-success">Você completou todos os módulos! 🎉</p>
      <input
        value={nome}
        onChange={(e) => (setNome(e.target.value), setErro(null))}
        placeholder="Nome completo no certificado"
        className="w-full rounded-lg border border-line bg-white px-3 py-2"
      />
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <button type="submit" disabled={enviando} className="rounded-lg bg-ink px-4 py-2 font-semibold text-white disabled:opacity-50">
        {enviando ? "Emitindo…" : "Emitir certificado de Especialista"}
      </button>
    </form>
  );
}

/** Portal do Stripe: trocar o cartão e ver as faturas. */
function BotaoPortal() {
  const [abrindo, setAbrindo] = useState(false);
  return (
    <button
      type="button"
      disabled={abrindo}
      onClick={async () => {
        setAbrindo(true);
        const r = await fetch("/api/assinatura/portal", { method: "POST" });
        const json = (await r.json().catch(() => ({}))) as { url?: string };
        if (json.url) window.location.href = json.url;
        else setAbrindo(false);
      }}
      className="mr-4 text-sm text-success underline-offset-4 hover:underline disabled:opacity-50"
      data-testid="portal-stripe"
    >
      {abrindo ? "Abrindo…" : "Cartão e faturas"}
    </button>
  );
}
