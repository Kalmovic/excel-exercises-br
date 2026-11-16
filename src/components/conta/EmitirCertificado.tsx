"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RespostaQuestao } from "@/grader/conferir-teste";
import { useConta } from "@/lib/conta";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const chavePendente = (modulo: string) => `excel-br:certificado-pendente:${modulo}`;

/** Respostas do teste aprovado, guardadas para emitir depois de entrar na conta. */
export function lerPendente(modulo: string): { entregas: RespostaQuestao[]; titulo: string } | null {
  try {
    return JSON.parse(localStorage.getItem(chavePendente(modulo)) ?? "null");
  } catch {
    return null;
  }
}

/**
 * Bloco "Emitir certificado" (no resultado do teste aprovado e em /certificado/emitir).
 * Quem emite é o servidor, que corrige de novo as respostas (`entregas`).
 */
export function EmitirCertificado({
  modulo,
  tituloModulo,
  entregas,
}: {
  modulo: string;
  tituloModulo: string;
  entregas: RespostaQuestao[];
}) {
  const conta = useConta();
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  // Guarda a aprovação: quem não entrou na conta pode emitir depois, sem refazer o teste.
  useEffect(() => {
    try {
      localStorage.setItem(chavePendente(modulo), JSON.stringify({ entregas, titulo: tituloModulo }));
    } catch {}
  }, [modulo, tituloModulo, entregas]);

  // Nome do perfil, se já houver.
  useEffect(() => {
    if (conta.estado !== "logado") return;
    void supabaseNavegador()
      ?.from("perfis")
      .select("nome")
      .maybeSingle<{ nome: string | null }>()
      .then(({ data }) => data?.nome && setNome((n) => n || data.nome!));
  }, [conta]);

  if (conta.estado === "desligada" || conta.estado === "carregando") return null;

  const caixa = "space-y-3 rounded-2xl border-2 border-accent bg-accent-soft p-5";
  if (codigo)
    return (
      <div className={caixa} data-testid="certificado-emitido">
        <p className="font-semibold">Certificado emitido! 🎓</p>
        <p className="text-sm text-muted">Código de verificação: <span className="font-mono font-semibold text-ink">{codigo}</span></p>
        <Link href={`/certificado/${codigo}`} className="inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink-soft">
          Ver e compartilhar o certificado
        </Link>
      </div>
    );

  if (conta.estado !== "logado")
    return (
      <div className={caixa} data-testid="emitir-certificado">
        <p className="font-semibold">Seu certificado do {tituloModulo} está esperando</p>
        <p className="text-sm text-muted">Entre na sua conta para emitir. Sua aprovação fica guardada: não precisa refazer o teste.</p>
        <Link
          href={`/entrar?proximo=${encodeURIComponent(`/certificado/emitir?modulo=${modulo}`)}`}
          className="inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink-soft"
        >
          Entrar e emitir o certificado
        </Link>
      </div>
    );

  const emitir = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = nome.trim().replace(/\s+/g, " ");
    if (limpo.split(" ").length < 2) return setErro("Escreva seu nome completo, como deve aparecer no certificado.");
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/certificado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo, nome: limpo, entregas }),
      });
      const json = (await r.json().catch(() => ({}))) as { codigo?: string; erro?: string };
      if (!r.ok || !json.codigo) throw new Error(json.erro ?? "Não deu certo agora. Tente de novo.");
      try {
        localStorage.removeItem(chavePendente(modulo));
      } catch {}
      setCodigo(json.codigo);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={emitir} className={caixa} data-testid="emitir-certificado" noValidate>
      <p className="font-semibold">Emita seu certificado do {tituloModulo}</p>
      <label className="block space-y-1">
        <span className="text-sm">Nome no certificado</span>
        <input
          value={nome}
          onChange={(e) => (setNome(e.target.value), setErro(null))}
          autoComplete="name"
          className="w-full rounded-lg border border-line bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
          data-testid="nome-certificado"
        />
      </label>
      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className="rounded-lg bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink-soft disabled:opacity-50">
        {enviando ? "Conferindo suas respostas…" : "Emitir certificado"}
      </button>
      <p className="text-xs text-muted">Antes de emitir, conferimos suas respostas de novo. O certificado ganha um link público de verificação.</p>
    </form>
  );
}
