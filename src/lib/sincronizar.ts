/**
 * Como juntar o progresso do navegador com o da conta.
 *
 * O site continua lendo e gravando tudo no localStorage (rápido, funciona
 * offline e sem conta). Com conta, o localStorage vira um espelho: ao entrar,
 * juntamos as duas cópias; depois, cada mudança local sobe para o banco.
 *
 * As regras abaixo são funções puras (sem banco nem navegador) para poderem
 * ser testadas à parte. Princípio: juntar nunca faz o aluno perder nada.
 */
import type { ProgressoExercicio, Preferencias, Trofeus } from "./progresso";
import type { ResultadoTeste } from "./testes";

export type Progresso = Record<string, ProgressoExercicio>;
export type Testes = Record<string, ResultadoTeste>;

export type Estado = {
  trofeus: Trofeus;
  preferencias: Preferencias;
  ofensiva: string[];
  testes: Testes;
};

const PESO_STATUS: Record<ProgressoExercicio["status"], number> = { pulado: 0, "em-andamento": 1, concluido: 2 };

/**
 * Qual das duas cópias de uma questão vale:
 * 1. a da versão mais nova do exercício (a outra é de um enunciado que mudou);
 * 2. concluída ganha de em andamento, que ganha de pulada (não se "desconclui");
 * 3. empate: a gravada por último.
 */
export function melhorProgresso(a: ProgressoExercicio | undefined, b: ProgressoExercicio | undefined) {
  if (!a) return b;
  if (!b) return a;
  if (a.versao !== b.versao) return a.versao > b.versao ? a : b;
  if (a.status !== b.status) return PESO_STATUS[a.status] > PESO_STATUS[b.status] ? a : b;
  return (a.atualizadoEm ?? "") >= (b.atualizadoEm ?? "") ? a : b;
}

export function juntarProgresso(local: Progresso, conta: Progresso): Progresso {
  const junto: Progresso = {};
  for (const chave of new Set([...Object.keys(local), ...Object.keys(conta)])) {
    junto[chave] = melhorProgresso(local[chave], conta[chave])!;
  }
  return junto;
}

/** Troféu conquistado em qualquer lugar vale; fica a data mais antiga. */
export function juntarTrofeus(a: Trofeus, b: Trofeus): Trofeus {
  const junto: Trofeus = { ...a };
  for (const [modulo, em] of Object.entries(b)) if (!junto[modulo] || em < junto[modulo]) junto[modulo] = em;
  return junto;
}

/** Dias com atividade: união dos dois lados. */
export function juntarOfensiva(a: string[], b: string[], max = 400): string[] {
  return [...new Set([...a, ...b])].sort().slice(-max);
}

/** Teste do módulo: aprovação conquistada não se perde; fica a melhor nota. */
export function juntarTestes(a: Testes, b: Testes): Testes {
  const junto: Testes = { ...a };
  for (const [modulo, r] of Object.entries(b)) {
    const x = junto[modulo];
    if (!x) {
      junto[modulo] = r;
      continue;
    }
    const aprovacao = [x, r].filter((t) => t.aprovado).sort((p, q) => p.em.localeCompare(q.em))[0];
    junto[modulo] = {
      acertos: Math.max(x.acertos, r.acertos),
      total: Math.max(x.total, r.total),
      aprovado: x.aprovado || r.aprovado,
      em: aprovacao?.em ?? (x.em > r.em ? x.em : r.em),
      tentativas: Math.max(x.tentativas, r.tentativas),
    };
  }
  return junto;
}

export function juntarEstado(local: Estado, conta: Estado): Estado {
  return {
    trofeus: juntarTrofeus(local.trofeus, conta.trofeus),
    // Preferência é escolha explícita; a do navegador atual é a mais recente.
    preferencias: { ...conta.preferencias, ...local.preferencias },
    ofensiva: juntarOfensiva(local.ofensiva, conta.ofensiva),
    testes: juntarTestes(local.testes, conta.testes),
  };
}

/** Questões que mudaram desde a última vez que subimos (comparando o JSON). */
export function chavesAlteradas(atual: Progresso, enviado: Record<string, string>): string[] {
  return Object.keys(atual).filter((k) => JSON.stringify(atual[k]) !== enviado[k]);
}
