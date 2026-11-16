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

type Assinatura = {
  plano: string;
  status: "pendente" | "ativa" | "atrasada" | "cancelada";
  acesso_ate: string | null;
  fatura_url: string | null;
  asaas_assinatura_id: string | null;
};

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const cartao = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

export function PainelConta({
  trilha,
  modulos,
  titulos,
}: {
  trilha: { slug: string; versao: number }[];
  modulos: number;
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

      <Certificados titulos={titulos} />

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

  const renova = a.plano === "mensal" && a.status !== "cancelada" && !!a.asaas_assinatura_id;
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

/** Certificados do aluno (lidos pelo RLS: só os dele). */
function Certificados({ titulos }: { titulos: Record<string, string> }) {
  const [lista, setLista] = useState<Certificado[] | null>(null);
  useEffect(() => {
    void supabaseNavegador()
      ?.from("certificados")
      .select("codigo, modulo, emitido_em")
      .order("emitido_em")
      .returns<Certificado[]>()
      .then(({ data }) => setLista(data ?? []));
  }, []);
  if (lista === null) return null;
  return (
    <section className={`${cartao} space-y-3`} aria-label="Certificados" data-testid="certificados-conta">
      <h2 className="text-lg font-semibold">Certificados</h2>
      {lista.length === 0 ? (
        <p className="text-sm text-muted">Passe no teste de um módulo (4 de 5) para ganhar o certificado, com link de verificação para o LinkedIn.</p>
      ) : (
        <ul className="divide-y divide-line">
          {lista.map((c) => (
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
