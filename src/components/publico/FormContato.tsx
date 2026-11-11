"use client";

import { useState, type FormEvent } from "react";
import { contatoSchema } from "@/lib/contato";
import { registrar } from "@/lib/eventos";

type Props =
  | { formulario: "contato"; publico: "empresa" | "universidade" }
  | { formulario: "indicacao"; publico?: undefined };

const campo = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink";

/** "Fale com a gente" (empresa ou universidade) e "Indicar uma empresa ou faculdade". */
export function FormContato(props: Props) {
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const indicacao = props.formulario === "indicacao";
  const universidade = props.publico === "universidade";

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const obrigatorio = (k: string) => String(f.get(k) ?? "").trim();
    const valor = (k: string) => obrigatorio(k) || undefined;
    const dados = {
      formulario: props.formulario,
      ...(indicacao ? {} : { publico: props.publico }),
      nome: obrigatorio("nome"),
      email: obrigatorio("email"),
      organizacao: obrigatorio("organizacao"),
      cargo: valor("cargo"),
      pessoas: valor("pessoas"),
      contatoIndicado: valor("contatoIndicado"),
      mensagem: valor("mensagem"),
      consentimento: f.get("consentimento") === "on",
      site: String(f.get("site") ?? ""),
    };
    const r = contatoSchema.safeParse(dados);
    if (!r.success) return setErro(r.error.issues[0]?.message ?? "Confira os campos.");
    setErro(null);
    setEstado("enviando");
    try {
      const resp = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r.data),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => null))?.erro ?? "Não foi possível enviar.");
      registrar({ nome: "lead_b2b", formulario: props.formulario, publico: props.publico ?? "indicacao" });
      setEstado("enviado");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível enviar.");
      setEstado("livre");
    }
  };

  if (estado === "enviado")
    return (
      <p className="rounded-lg bg-success-bg p-4 text-success" role="status" data-testid="form-enviado">
        {indicacao
          ? "Obrigado pela indicação! Vamos entrar em contato e, se virar contrato, falamos com você sobre a recompensa."
          : "Recebemos sua mensagem. Respondemos em até 2 dias úteis."}
      </p>
    );

  return (
    <form onSubmit={enviar} className="space-y-3" noValidate data-testid={`form-${props.formulario}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Seu nome</span>
          <input name="nome" autoComplete="name" className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{indicacao ? "Seu e-mail" : "E-mail de trabalho"}</span>
          <input name="email" type="email" autoComplete="email" className={campo} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">{indicacao ? "Empresa ou faculdade indicada" : universidade ? "Instituição" : "Empresa"}</span>
          <input name="organizacao" autoComplete={indicacao ? "off" : "organization"} className={campo} />
        </label>
        {indicacao ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">Contato lá (opcional)</span>
            <input name="contatoIndicado" placeholder="Nome, cargo, e-mail ou telefone" className={campo} />
          </label>
        ) : (
          <label className="space-y-1 text-sm">
            <span className="font-medium">{universidade ? "Cargo ou curso (opcional)" : "Cargo (opcional)"}</span>
            <input name="cargo" autoComplete="organization-title" className={campo} />
          </label>
        )}
        {!indicacao && (
          <label className="space-y-1 text-sm">
            <span className="font-medium">{universidade ? "Quantos alunos, mais ou menos" : "Quantas pessoas, mais ou menos"}</span>
            <input name="pessoas" inputMode="numeric" className={campo} />
          </label>
        )}
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{indicacao ? "Por que eles precisariam? (opcional)" : "Mensagem (opcional)"}</span>
        <textarea name="mensagem" rows={3} className={campo} />
      </label>
      {/* armadilha para robôs: invisível para pessoas */}
      <input name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input name="consentimento" type="checkbox" className="mt-1" />
        <span>
          Autorizo o Planilhês a usar estes dados para entrar em contato sobre {indicacao ? "esta indicação" : "esta proposta"}.
          Não enviamos propaganda nem compartilhamos com terceiros. Veja a{" "}
          <a href="/privacidade" className="underline">
            política de privacidade
          </a>
          .
        </span>
      </label>
      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={estado === "enviando"}
        className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink-soft disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : indicacao ? "Enviar indicação" : "Falar com a gente"}
      </button>
    </form>
  );
}
