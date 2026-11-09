/**
 * Progresso local (Fase 1). Na Fase 3 isto migra para a tabela `progresso`
 * no Supabase no primeiro login.
 */
export type ProgressoExercicio = {
  versao: number;
  status: "em-andamento" | "concluido";
  tentativas: number;
  conteudos: Record<string, string>;
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
