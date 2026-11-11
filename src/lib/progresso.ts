/**
 * Progresso local (Fase 1). Na Fase 3 isto migra para a tabela `progresso`
 * no Supabase no primeiro login.
 */
import type { Formato } from "@/content/schema";
import { registrarAtividade } from "./ofensiva";

export type ProgressoExercicio = {
  versao: number;
  /** "pulado" não conta como feito (nem para o troféu). */
  status: "em-andamento" | "concluido" | "pulado";
  tentativas: number;
  conteudos: Record<string, string>;
  /** Campos novos são opcionais: progresso salvo antes deles continua válido. */
  formatos?: Record<string, Formato>;
  resposta?: string;
  /** Resultado de cada verificação até acertar (true = acertou). */
  historico?: boolean[];
  /** Quantas dicas foram abertas (para o nivelamento). */
  dicasVistas?: number;
  /** Tempo ativo no exercício, em ms (intervalos ociosos acima de 10 min são cortados). */
  tempoMs?: number;
  atualizadoEm: string;
};

type Progresso = Record<string, ProgressoExercicio>;

const CHAVE = "excel-br:progresso:v1";
const EVENTO = "excel-br:progresso";

export function lerTudo(): Progresso {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Progresso;
  } catch {
    return {};
  }
}

/** Devolve o progresso só se for da mesma versão do exercício. */
export function ler(slug: string, versao: number): ProgressoExercicio | undefined {
  const p = lerTudo()[slug];
  return p && p.versao === versao ? p : undefined;
}

export function salvar(slug: string, dados: Omit<ProgressoExercicio, "atualizadoEm">) {
  try {
    const tudo = lerTudo();
    // Concluiu agora (não estava concluído): conta para a ofensiva do dia.
    if (dados.status === "concluido" && tudo[slug]?.status !== "concluido") registrarAtividade();
    tudo[slug] = { ...dados, atualizadoEm: new Date().toISOString() };
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // modo privado ou armazenamento cheio: o exercício continua funcionando
  }
}

export function apagar(slug: string) {
  try {
    const tudo = lerTudo();
    delete tudo[slug];
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
    window.dispatchEvent(new Event(EVENTO));
  } catch {}
}

export function assinar(fn: () => void) {
  window.addEventListener(EVENTO, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENTO, fn);
    window.removeEventListener("storage", fn);
  };
}

// --- troféus ---------------------------------------------------------------

const CHAVE_TROFEUS = "excel-br:trofeus:v1";

export type Trofeus = Record<string, string>; // modulo -> data ISO da conquista

export function lerTrofeus(): Trofeus {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TROFEUS) ?? "{}") as Trofeus;
  } catch {
    return {};
  }
}

/** Registra o troféu uma vez só. Devolve true se é a primeira vez. */
export function registrarTrofeu(modulo: string): boolean {
  try {
    const t = lerTrofeus();
    if (t[modulo]) return false;
    t[modulo] = new Date().toISOString();
    localStorage.setItem(CHAVE_TROFEUS, JSON.stringify(t));
    window.dispatchEvent(new Event(EVENTO));
    return true;
  } catch {
    return false;
  }
}

/** Todos os exercícios da lista concluídos (na versão atual)? */
export function trilhaConcluida(itens: { slug: string; versao: number }[]): boolean {
  const tudo = lerTudo();
  return itens.every((i) => tudo[i.slug]?.versao === i.versao && tudo[i.slug]?.status === "concluido");
}

/** Marca como pulado, sem apagar o que o aluno já fez. Concluído continua concluído. */
export function pular(slug: string, versao: number) {
  const atual = ler(slug, versao);
  if (atual?.status === "concluido") return;
  salvar(slug, {
    versao,
    status: "pulado",
    tentativas: atual?.tentativas ?? 0,
    conteudos: atual?.conteudos ?? {},
    formatos: atual?.formatos,
    resposta: atual?.resposta,
  });
}

// --- preferências ------------------------------------------------------------

const CHAVE_PREFS = "excel-br:preferencias:v1";

export type Preferencias = { pularIntro?: boolean };

export function lerPreferencias(): Preferencias {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFS) ?? "{}") as Preferencias;
  } catch {
    return {};
  }
}

export function salvarPreferencias(p: Preferencias) {
  try {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify({ ...lerPreferencias(), ...p }));
    window.dispatchEvent(new Event(EVENTO));
  } catch {}
}
