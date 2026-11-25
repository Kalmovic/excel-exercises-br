"use client";

import { useActionState } from "react";
import { criarProposta, gerarFatura, type EstadoFatura, type EstadoProposta } from "@/app/(app)/admin/empresas/acoes";
import { PRECO_EMPRESAS } from "@/lib/site";
import { PRECO_PESSOA_ANO } from "@/lib/empresas";

const campo = "w-full rounded border border-zinc-300 bg-white px-3 py-2";

type PropsCampo = { nome: string; rotulo: string; tipo?: string; obrigatorio?: boolean; valores?: Record<string, string> } & React.InputHTMLAttributes<HTMLInputElement>;

function Campo({ nome, rotulo, tipo = "text", obrigatorio = true, valores, defaultValue, ...resto }: PropsCampo) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-600">{rotulo}</span>
      <input
        name={nome}
        type={tipo}
        required={obrigatorio}
        className={campo}
        data-testid={`proposta-${nome}`}
        defaultValue={valores?.[nome] ?? defaultValue}
        {...resto}
      />
    </label>
  );
}

/** Nova proposta: grava a organização com status "proposta" (sem cobrar nada ainda). */
export function FormProposta() {
  const [estado, acao, enviando] = useActionState<EstadoProposta, FormData>(criarProposta, { ok: false });
  return (
    <form action={acao} className="space-y-4 rounded-lg border border-line bg-white p-4" data-testid="form-proposta">
      <h2 className="font-semibold">Nova proposta</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo valores={estado.valores} nome="nome" rotulo="Razão social" />
        <Campo valores={estado.valores} nome="cnpj" rotulo="CNPJ" inputMode="numeric" placeholder="00.000.000/0000-00" />
        <Campo valores={estado.valores} nome="email_financeiro" rotulo="E-mail financeiro (recebe a fatura e a nota)" tipo="email" />
        <Campo valores={estado.valores} nome="gestor_email" rotulo="E-mail do gestor (vê o painel da equipe)" tipo="email" />
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-6">
        <legend className="mb-1 text-sm font-medium">Endereço da nota fiscal</legend>
        <div className="sm:col-span-2">
          <Campo valores={estado.valores} nome="cep" rotulo="CEP" inputMode="numeric" />
        </div>
        <div className="sm:col-span-3">
          <Campo valores={estado.valores} nome="logradouro" rotulo="Rua" />
        </div>
        <div className="sm:col-span-1">
          <Campo valores={estado.valores} nome="numero" rotulo="Número" />
        </div>
        <div className="sm:col-span-2">
          <Campo valores={estado.valores} nome="complemento" rotulo="Complemento" obrigatorio={false} />
        </div>
        <div className="sm:col-span-2">
          <Campo valores={estado.valores} nome="bairro" rotulo="Bairro" />
        </div>
        <div className="sm:col-span-1">
          <Campo valores={estado.valores} nome="cidade" rotulo="Cidade" />
        </div>
        <div className="sm:col-span-1">
          <Campo valores={estado.valores} nome="uf" rotulo="UF" maxLength={2} />
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo valores={estado.valores} nome="assentos" rotulo={`Número de pessoas (mínimo ${PRECO_EMPRESAS.minimoPessoas})`} tipo="number" min={PRECO_EMPRESAS.minimoPessoas} defaultValue={PRECO_EMPRESAS.minimoPessoas} />
        <Campo valores={estado.valores} nome="preco_por_pessoa_ano" rotulo="Preço por pessoa por ano (R$)" tipo="number" step="0.01" min={1} defaultValue={PRECO_PESSOA_ANO} />
      </div>
      {estado.erro && (
        <p className="text-sm text-red-700" role="alert" data-testid="erro-proposta">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="text-sm text-success" role="status">
          Proposta criada. Gere a fatura na lista abaixo.
        </p>
      )}
      <button type="submit" disabled={enviando} className="rounded-md bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-50">
        {enviando ? "Gravando…" : "Criar proposta"}
      </button>
    </form>
  );
}

/** "Gerar e enviar fatura": cria (ou reaproveita) a fatura no Stripe e mostra o link. */
export function BotaoFatura({ id, temFatura }: { id: string; temFatura: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoFatura, FormData>(gerarFatura, { ok: false });
  return (
    <form action={acao} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={enviando} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50">
        {enviando ? "Enviando…" : temFatura ? "Gerar e enviar fatura (de novo/renovação)" : "Gerar e enviar fatura"}
      </button>
      {estado.erro && (
        <p className="text-sm text-red-700" role="alert">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="text-sm text-success" role="status">
          {estado.reaproveitada ? "Já havia uma fatura em aberto: é a mesma. " : "Fatura enviada ao e-mail financeiro. "}
          {estado.url && (
            <a href={estado.url} target="_blank" rel="noreferrer" className="underline">
              Abrir a fatura
            </a>
          )}
        </p>
      )}
    </form>
  );
}
