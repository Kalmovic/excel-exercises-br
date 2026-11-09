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
