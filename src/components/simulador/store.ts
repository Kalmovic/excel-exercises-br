import { createStore } from "zustand/vanilla";
import { normalizar, type Intervalo, type Pos } from "@/engine/address";
import type { Planilha } from "@/engine/engine";

export type Modo = "pronto" | "inserir" | "editar";

export type EstadoSimulador = {
  ancora: Pos; // célula ativa
  foco: Pos; // outra ponta da seleção
  modo: Modo;
  rascunho: string;
  mensagem: string | null;
  arrasto: null | "selecao" | "alca";
  alca: Intervalo | null; // área de destino da alça de preenchimento
  copiado: Intervalo | null;

  selecao: () => Intervalo;
  selecionar: (p: Pos, estender?: boolean) => void;
  mover: (dl: number, dc: number, estender?: boolean) => void;
  iniciarEdicao: (modo: "inserir" | "editar", texto?: string) => boolean;
  setRascunho: (t: string) => void;
  /** Grava o rascunho. Devolve false se a validação recusou. */
  confirmar: () => boolean;
  cancelar: () => void;
  limparMensagem: () => void;
  copiar: () => void;
  colar: () => void;
  apagarSelecao: () => void;
  preencherSelecao: (direcao: "baixo" | "direita") => void;
  iniciarAlca: () => void;
  moverAlca: (p: Pos) => void;
  terminarArrasto: () => void;
};

const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));

export function criarStore(planilha: Planilha) {
  return createStore<EstadoSimulador>((set, get) => ({
    ancora: { linha: 0, coluna: 0 },
    foco: { linha: 0, coluna: 0 },
    modo: "pronto",
    rascunho: "",
    mensagem: null,
    arrasto: null,
    alca: null,
    copiado: null,

    selecao: () => normalizar(get().ancora, get().foco),

    selecionar: (p, estender = false) =>
      set(estender ? { foco: p, mensagem: null } : { ancora: p, foco: p, mensagem: null }),

    mover: (dl, dc, estender = false) => {
      const { ancora, foco } = get();
      const base = estender ? foco : ancora;
      const p = {
        linha: clamp(base.linha + dl, planilha.linhas),
        coluna: clamp(base.coluna + dc, planilha.colunas),
      };
      set(estender ? { foco: p } : { ancora: p, foco: p, mensagem: null });
    },

    iniciarEdicao: (modo, texto) => {
      const { ancora } = get();
      if (planilha.bloqueada(ancora)) {
        set({ mensagem: "Esta célula faz parte dos dados do exercício e não pode ser alterada." });
        return false;
      }
      set({
        modo,
        rascunho: texto ?? planilha.bruto(ancora),
        mensagem: null,
        foco: ancora,
      });
      return true;
    },

    setRascunho: (t) => set({ rascunho: t, mensagem: null }),

    confirmar: () => {
      const { modo, rascunho, ancora } = get();
      if (modo === "pronto") return true;
      const r = planilha.definir(ancora, rascunho);
      if (!r.ok) {
        set({ mensagem: r.mensagem });
        return false;
      }
      set({ modo: "pronto", rascunho: "", mensagem: null });
      return true;
    },

    cancelar: () => set({ modo: "pronto", rascunho: "", mensagem: null }),

    limparMensagem: () => set({ mensagem: null }),

    copiar: () => {
      const sel = get().selecao();
      planilha.copiar(sel);
      set({ copiado: sel });
    },

    colar: () => {
      if (planilha.colar(get().selecao())) set({ copiado: null });
    },

    apagarSelecao: () => planilha.limpar(get().selecao()),

    preencherSelecao: (direcao) => {
      const s = get().selecao();
      if (direcao === "baixo" && s.fim.linha > s.inicio.linha) {
        planilha.preencher(
          { inicio: s.inicio, fim: { linha: s.inicio.linha, coluna: s.fim.coluna } },
          { inicio: { linha: s.inicio.linha + 1, coluna: s.inicio.coluna }, fim: s.fim },
        );
      }
      if (direcao === "direita" && s.fim.coluna > s.inicio.coluna) {
        planilha.preencher(
          { inicio: s.inicio, fim: { linha: s.fim.linha, coluna: s.inicio.coluna } },
          { inicio: { linha: s.inicio.linha, coluna: s.inicio.coluna + 1 }, fim: s.fim },
        );
      }
    },

    iniciarAlca: () => set({ arrasto: "alca", alca: null }),

    moverAlca: (p) => {
      const s = get().selecao();
      const abaixo = p.linha - s.fim.linha;
      const direita = p.coluna - s.fim.coluna;
      if (abaixo <= 0 && direita <= 0) return set({ alca: null });
      if (abaixo >= direita) {
        set({
          alca: {
            inicio: { linha: s.fim.linha + 1, coluna: s.inicio.coluna },
            fim: { linha: p.linha, coluna: s.fim.coluna },
          },
        });
      } else {
        set({
          alca: {
            inicio: { linha: s.inicio.linha, coluna: s.fim.coluna + 1 },
            fim: { linha: s.fim.linha, coluna: p.coluna },
          },
        });
      }
    },

    terminarArrasto: () => {
      const { arrasto, alca } = get();
      if (arrasto === "alca" && alca) {
        const s = get().selecao();
        planilha.preencher(s, alca);
        set({ ancora: s.inicio, foco: alca.fim });
      }
      set({ arrasto: null, alca: null });
    },
  }));
}

export type StoreSimulador = ReturnType<typeof criarStore>;
