"use client";

/**
 * Conta do aluno no navegador: quem está logado e a sincronização do
 * progresso com o banco.
 *
 * Fluxo:
 * 1. Ao carregar o site, lemos a sessão (do cookie, sem ir à rede).
 * 2. Logado: uma vez por aba, baixamos o progresso da conta, juntamos com o do
 *    navegador (src/lib/sincronizar.ts) e gravamos o resultado nos dois lados.
 * 3. Depois, a cada mudança local (evento "excel-br:progresso"), subimos só o
 *    que mudou, agrupado a cada 1,5 s.
 * 4. Ao sair, limpamos o progresso do navegador: ele está salvo na conta, e o
 *    próximo a usar este computador não deve vê-lo.
 *
 * Toda escrita passa pelo RLS: o banco só aceita linhas do próprio aluno.
 */
import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gravarDias, lerDias } from "./ofensiva";
import { lerOrigem } from "./origem";
import * as progresso from "./progresso";
import { chavesAlteradas, juntarEstado, juntarProgresso, type Estado, type Progresso } from "./sincronizar";
import { supabaseNavegador } from "./supabase/navegador";
import { gravarTestes, lerTestes } from "./testes";

export type Conta =
  | { estado: "desligada" } // contas não configuradas neste ambiente
  | { estado: "carregando" }
  | { estado: "anonimo" }
  | { estado: "logado"; id: string; email: string };

let atual: Conta = { estado: "carregando" };
const ouvintes = new Set<() => void>();
const mudar = (c: Conta) => {
  atual = c;
  ouvintes.forEach((f) => f());
};

let iniciado = false;

/** Liga a conta (uma vez por aba). Chamado pelo componente <Conta /> do layout. */
export function iniciarConta() {
  if (iniciado) return;
  iniciado = true;
  const supabase = supabaseNavegador();
  if (!supabase) return mudar({ estado: "desligada" });

  // onAuthStateChange dispara já com a sessão atual (INITIAL_SESSION) e depois
  // a cada login, logout e renovação de token.
  supabase.auth.onAuthStateChange((evento, sessao) => {
    const user = sessao?.user;
    if (!user) {
      if (atual.estado === "logado") limparLocal();
      return mudar({ estado: "anonimo" });
    }
    const antes = atual;
    mudar({ estado: "logado", id: user.id, email: user.email ?? "" });
    if (antes.estado !== "logado" || antes.id !== user.id) {
      // Fora do callback: chamar o Supabase dentro dele pode travar a sessão.
      setTimeout(() => void sincronizarAoEntrar(supabase, user.id), 0);
    }
    void evento;
  });
}

export function useConta(): Conta {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
    () => ({ estado: "carregando" }) as Conta,
  );
}

export async function sair() {
  const supabase = supabaseNavegador();
  await enviarPendentes(); // nada se perde no último segundo
  await supabase?.auth.signOut();
}

// --- sincronização ------------------------------------------------------------

/** O que já está igual no banco (JSON por chave), para subir só a diferença. */
let enviado: Record<string, string> = {};
let estadoEnviado = "";
let usuario: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let ouvindo = false;

const lerEstadoLocal = (): Estado => ({
  trofeus: progresso.lerTrofeus(),
  preferencias: progresso.lerPreferencias(),
  ofensiva: lerDias(),
  testes: lerTestes(),
});

type LinhaProgresso = { chave: string; dados: Progresso[string] };

async function sincronizarAoEntrar(supabase: SupabaseClient, id: string) {
  usuario = id;
  const [linhas, estado, perfil] = await Promise.all([
    supabase.from("progresso").select("chave, dados").returns<LinhaProgresso[]>(),
    supabase.from("estado_aluno").select("trofeus, preferencias, ofensiva, testes").maybeSingle<Estado>(),
    supabase.from("perfis").select("origem").maybeSingle<{ origem: unknown }>(),
  ]);
  if (linhas.error || estado.error) return; // sem rede: tenta de novo no próximo carregamento

  const conta: Progresso = Object.fromEntries((linhas.data ?? []).map((l) => [l.chave, l.dados]));
  enviado = Object.fromEntries(Object.entries(conta).map(([k, v]) => [k, JSON.stringify(v)]));
  const estadoConta: Estado = estado.data ?? { trofeus: {}, preferencias: {}, ofensiva: [], testes: {} };
  estadoEnviado = estado.data ? JSON.stringify(estadoConta) : "";

  // Junta e grava no navegador...
  const junto = juntarProgresso(progresso.lerTudo(), conta);
  const estadoJunto = juntarEstado(lerEstadoLocal(), estadoConta);
  progresso.gravarTudo(junto);
  progresso.gravarTrofeus(estadoJunto.trofeus);
  progresso.gravarPreferencias(estadoJunto.preferencias);
  gravarDias(estadoJunto.ofensiva);
  gravarTestes(estadoJunto.testes);

  // ...e sobe o que a conta ainda não tinha.
  await enviarPendentes();

  // Primeira vez com conta: guarda de onde o aluno veio.
  const origem = lerOrigem();
  if (perfil.data && !perfil.data.origem && origem) await supabase.from("perfis").update({ origem }).eq("id", id);

  progresso.avisarMudanca(); // o mapa e o painel releem o progresso juntado
  if (!ouvindo) {
    ouvindo = true;
    progresso.assinar(agendarEnvio);
    // Saindo da página (fechar aba, trocar de app no celular): envia na hora.
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void enviarPendentes());
  }
}

function agendarEnvio() {
  clearTimeout(timer);
  timer = setTimeout(() => void enviarPendentes(), 1500);
}

let enviando: Promise<void> | null = null;

async function enviarPendentes(): Promise<void> {
  clearTimeout(timer);
  if (enviando) await enviando; // um envio por vez
  const supabase = supabaseNavegador();
  if (!supabase || !usuario) return;
  const id = usuario;
  enviando = (async () => {
    const tudo = progresso.lerTudo();
    const chaves = chavesAlteradas(tudo, enviado);
    for (let i = 0; i < chaves.length; i += 200) {
      const lote = chaves.slice(i, i + 200).map((chave) => ({
        usuario_id: id,
        chave,
        versao: tudo[chave].versao,
        status: tudo[chave].status,
        dados: tudo[chave],
        atualizado_em: tudo[chave].atualizadoEm ?? new Date().toISOString(),
      }));
      // upsert = INSERT, ou UPDATE se a linha (usuario_id, chave) já existe.
      const { error } = await supabase.from("progresso").upsert(lote);
      if (error) return; // fica pendente; tenta de novo na próxima mudança
      for (const l of lote) enviado[l.chave] = JSON.stringify(l.dados);
    }
    const estado = lerEstadoLocal();
    const json = JSON.stringify(estado);
    if (json !== estadoEnviado) {
      const { error } = await supabase
        .from("estado_aluno")
        .upsert({ usuario_id: id, ...estado, atualizado_em: new Date().toISOString() });
      if (!error) estadoEnviado = json;
    }
  })();
  try {
    await enviando;
  } finally {
    enviando = null;
  }
}

/** Ao sair: o progresso está na conta; o navegador volta a ficar vazio. */
function limparLocal() {
  usuario = null;
  enviado = {};
  estadoEnviado = "";
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("excel-br:") && k !== "excel-br:origem:v1") localStorage.removeItem(k);
  } catch {}
  progresso.avisarMudanca();
}
