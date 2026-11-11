/**
 * Ofensiva: dias seguidos (no fuso de São Paulo) em que a pessoa concluiu pelo
 * menos um exercício ou o desafio do dia. Fica no navegador; na Fase 3 migra
 * para a conta junto com o progresso.
 */
import { hojeSP, somarDias } from "./data-sp";

const CHAVE = "excel-br:ofensiva:v1";
/** Guarda só o necessário para calcular recorde e sequência atual. */
const MAX_DIAS = 400;

export function lerDias(): string[] {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(d) ? d.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Marca o dia de hoje como dia com atividade. */
export function registrarAtividade(hoje = hojeSP()) {
  try {
    const dias = new Set(lerDias());
    if (dias.has(hoje)) return;
    dias.add(hoje);
    localStorage.setItem(CHAVE, JSON.stringify([...dias].sort().slice(-MAX_DIAS)));
  } catch {
    // sem armazenamento: a ofensiva só não é contada
  }
}

export type Ofensiva = { atual: number; fezHoje: boolean; recorde: number };

/**
 * A sequência continua viva até o fim do dia seguinte: quem jogou ontem e
 * ainda não jogou hoje tem a ofensiva de ontem (e pode perdê-la à meia-noite).
 */
export function calcularOfensiva(dias: string[], hoje: string): Ofensiva {
  const set = new Set(dias);
  const fezHoje = set.has(hoje);
  let atual = 0;
  for (let d = fezHoje ? hoje : somarDias(hoje, -1); set.has(d); d = somarDias(d, -1)) atual++;
  let recorde = 0;
  let seq = 0;
  let anterior = "";
  for (const d of [...set].sort()) {
    seq = anterior && somarDias(anterior, 1) === d ? seq + 1 : 1;
    recorde = Math.max(recorde, seq);
    anterior = d;
  }
  return { atual, fezHoje, recorde };
}
