import { createStore } from "zustand/vanilla";
import { normalizar, type Intervalo, type Pos } from "@/engine/address";
import { ateABorda, ultimaUsada } from "@/engine/navegacao";
import type { Planilha } from "@/engine/engine";
import type { Formato } from "@/content/schema";

export type Modo = "pronto" | "inserir" | "editar";

export type EstadoSimulador = {
  ancora: Pos; // célula ativa
  foco: Pos; // outra ponta da seleção
  modo: Modo;
  rascunho: string;
  /** Posição do cursor no rascunho (para o autocompletar e o F4). */
  cursor: number;
  /** Sugestão destacada na lista do autocompletar. */
  indiceSugestao: number;
  /** Esc fecha a lista até o próximo caractere digitado. */
  sugestoesFechadas: boolean;
  mensagem: string | null;
  /** "apontar": arrastando sobre a grade para inserir um intervalo na fórmula. */
  arrasto: null | "selecao" | "alca" | "apontar";
  alca: Intervalo | null; // área de destino da alça de preenchimento
  copiado: Intervalo | null;
  /** Células-alvo piscam em verde logo após um acerto. */
  celebrando: boolean;
  /** Mudanças de célula ativa/seleção feitas por clique ou arrasto (exercício "só teclado"). */
  mudancasPeloMouse: number;
  /** Resposta dos exercícios text_answer. */
  resposta: string;

  selecao: () => Intervalo;
  selecionar: (p: Pos, estender?: boolean) => void;
  /** Igual a `selecionar`, mas conta como mudança feita pelo mouse se algo mudou. */
  selecionarPeloMouse: (p: Pos, estender?: boolean) => void;
  mover: (dl: number, dc: number, estender?: boolean) => void;
  /** Ctrl+seta: até a borda do bloco de dados. */
  moverAteBorda: (dl: number, dc: number, estender?: boolean) => void;
  /** Home, Ctrl+Home, Ctrl+End. */
  irPara: (destino: "inicioDaLinha" | "inicio" | "fim", estender?: boolean) => void;
  /** Ctrl+A. */
  selecionarTudo: () => void;
  /** Clique no cabeçalho da coluna ou da linha. */
  selecionarCabecalho: (tipo: "coluna" | "linha", indice: number, estender?: boolean) => void;
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
  setResposta: (t: string) => void;
  formatarSelecao: (formato: Formato) => void;
};

const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));

/** `inicio`: seleção ao abrir o exercício. A célula ativa é `inicio.inicio`. */
export function criarStore(
  planilha: Planilha,
  inicio?: Intervalo,
  resposta = "",
  opcoes: { selecaoFixa?: boolean } = {},
) {
  const fixa = opcoes.selecaoFixa ?? false;
  const ancora = inicio?.inicio ?? { linha: 0, coluna: 0 };
  const foco = inicio?.fim ?? ancora;
  return createStore<EstadoSimulador>((set, get) => ({
    ancora,
    foco,
    modo: "pronto",
    rascunho: "",
    cursor: 0,
    indiceSugestao: 0,
    sugestoesFechadas: false,
    mensagem: null,
    arrasto: null,
    alca: null,
    copiado: null,
    celebrando: false,
    mudancasPeloMouse: 0,
    resposta,

    selecao: () => normalizar(get().ancora, get().foco),

    selecionar: (p, estender = false) => {
      if (fixa) return; // seleção travada: ignora em silêncio
      set(estender ? { foco: p, mensagem: null } : { ancora: p, foco: p, mensagem: null });
    },

    selecionarPeloMouse: (p, estender = false) => {
      if (fixa) return; // seleção travada: ignora em silêncio
      const { ancora, foco, mudancasPeloMouse } = get();
      const ref = estender ? foco : ancora;
      const difere = (a: Pos, b: Pos) => a.linha !== b.linha || a.coluna !== b.coluna;
      // Clicar na própria célula ativa não conta; clicar nela desfazendo uma seleção maior, conta.
      const mudou = difere(p, ref) || (!estender && difere(foco, ancora));
      get().selecionar(p, estender);
      if (mudou) set({ mudancasPeloMouse: mudancasPeloMouse + 1 });
    },

    mover: (dl, dc, estender = false) => {
      if (fixa) return; // seleção travada: ignora em silêncio
      const { ancora, foco } = get();
      const base = estender ? foco : ancora;
      const p = {
        linha: clamp(base.linha + dl, planilha.linhas),
        coluna: clamp(base.coluna + dc, planilha.colunas),
      };
      set(estender ? { foco: p } : { ancora: p, foco: p, mensagem: null });
    },

    moverAteBorda: (dl, dc, estender = false) => {
      if (fixa) return;
      const { ancora, foco } = get();
      const preenchida = (q: Pos) => {
        const v = planilha.valor(q);
        return v !== null && v !== "";
      };
      const p = ateABorda(estender ? foco : ancora, dl, dc, preenchida, planilha.linhas, planilha.colunas);
      set(estender ? { foco: p } : { ancora: p, foco: p, mensagem: null });
    },

    irPara: (destino, estender = false) => {
      if (fixa) return;
      const { ancora, foco } = get();
      const base = estender ? foco : ancora;
      const preenchida = (q: Pos) => {
        const v = planilha.valor(q);
        return v !== null && v !== "";
      };
      const p =
        destino === "inicioDaLinha"
          ? { linha: base.linha, coluna: 0 }
          : destino === "inicio"
            ? { linha: 0, coluna: 0 }
            : ultimaUsada(preenchida, planilha.linhas, planilha.colunas);
      set(estender ? { foco: p } : { ancora: p, foco: p, mensagem: null });
    },

    selecionarTudo: () => {
      if (fixa) return;
      set({ ancora: { linha: 0, coluna: 0 }, foco: { linha: planilha.linhas - 1, coluna: planilha.colunas - 1 }, mensagem: null });
    },

    selecionarCabecalho: (tipo, indice, estender = false) => {
      if (fixa) return;
      const ultima = tipo === "coluna" ? planilha.linhas - 1 : planilha.colunas - 1;
      const inicio = tipo === "coluna" ? { linha: 0, coluna: indice } : { linha: indice, coluna: 0 };
      const fim = tipo === "coluna" ? { linha: ultima, coluna: indice } : { linha: indice, coluna: ultima };
      const { ancora, mudancasPeloMouse } = get();
      if (estender) {
        // estende a partir da coluna/linha da célula ativa
        const de = tipo === "coluna" ? { linha: 0, coluna: ancora.coluna } : { linha: ancora.linha, coluna: 0 };
        set({ ancora: de, foco: fim, mensagem: null, mudancasPeloMouse: mudancasPeloMouse + 1 });
      } else set({ ancora: inicio, foco: fim, mensagem: null, mudancasPeloMouse: mudancasPeloMouse + 1 });
    },

    iniciarEdicao: (modo, texto) => {
      const { ancora } = get();
      if (fixa) return false;
      if (planilha.bloqueada(ancora)) {
        set({ mensagem: "Esta célula faz parte dos dados do exercício e não pode ser alterada." });
        return false;
      }
      const rascunho = texto ?? planilha.bruto(ancora);
      set({
        modo,
        rascunho,
        cursor: rascunho.length,
        indiceSugestao: 0,
        sugestoesFechadas: false,
        mensagem: null,
        foco: ancora,
      });
      return true;
    },

    setRascunho: (t) => set({ rascunho: t, mensagem: null, indiceSugestao: 0, sugestoesFechadas: false }),

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
      if (fixa) return;
      if (planilha.colar(get().selecao())) set({ copiado: null });
    },

    apagarSelecao: () => {
      if (!fixa) planilha.limpar(get().selecao());
    },

    preencherSelecao: (direcao) => {
      if (fixa) return;
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

    iniciarAlca: () => {
      if (!fixa) set({ arrasto: "alca", alca: null });
    },

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

    setResposta: (t) => set({ resposta: t }),

    formatarSelecao: (formato) => planilha.formatar(get().selecao(), formato),
  }));
}

export type StoreSimulador = ReturnType<typeof criarStore>;
