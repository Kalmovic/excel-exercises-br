"use client";

import { useSemTeclado } from "@/lib/toque";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  colunaParaLetras,
  contem,
  deEndereco,
  intervaloParaTexto,
  normalizar,
  paraEndereco,
  type Pos,
} from "@/engine/address";
import { alinhamento } from "@/engine/format";
import { CORES_REFERENCIA, referenciasDaFormula } from "@/engine/referencias";
import { FormulaColorida } from "./FormulaColorida";
import { IconeFunil, MenuFiltro } from "./MenuFiltro";
import { CORES_DESTAQUE } from "@/engine/condicional";
import { GraficoSvg } from "./GraficoSvg";
import { ListaSuspensa } from "./ValidacaoDados";
import type { ValorCelula } from "@/engine/format";
import type { EstiloDestaque } from "@/content/schema";
import { ajustarLinha, larguraParaCaber } from "./transbordo";

let contextoMedida: CanvasRenderingContext2D | null = null;
/** Largura do texto na fonte da grade (para transbordo, #### e ajuste de coluna). */
function medirTexto(texto: string, negrito: boolean) {
  contextoMedida ??= document.createElement("canvas").getContext("2d");
  if (!contextoMedida) return 0;
  contextoMedida.font = `${negrito ? "bold " : ""}13px Calibri, Carlito, Arial, sans-serif`;
  return contextoMedida.measureText(texto).width;
}
import { AjudaFormula, rastrearCursor, teclaDeFormula } from "./AjudaFormula";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";

const LARGURA_PADRAO = 96;

async function escreverNaAreaDeTransferencia(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // sem permissão (ou contexto inseguro): a cópia interna continua funcionando
  }
}
const ALTURA = 26;
/** Tamanho do gráfico na grade (o Excel usa 480 × 288; aqui um pouco menor, para caber ao lado dos dados). */
const LARGURA_GRAFICO = 380;
const ALTURA_GRAFICO = 240;
const LARGURA_CABECALHO = 44;
/** Largura do menu do filtro (w-60). */
const LARGURA_MENU_FILTRO = 240;

/** Caracteres depois dos quais um clique insere uma referência na fórmula. */
const ACEITA_REFERENCIA = /[=(;+\-*/^&<>:]\s*$/;

/**
 * `autoFoco` falso (demonstração da página inicial): a grade só pega o foco depois
 * que a pessoa clica ou toca nela; antes disso o Tab anda pela página normalmente.
 */
export function Grade({ larguras, autoFoco = true }: { larguras?: Record<string, number>; autoFoco?: boolean }) {
  const { planilha, store, entradaRef, alvos, formatacao, selecaoFixa, dados, nomeAba, apontarExterno, formulaExterna } = useSimulador();
  // Apontando de outra aba: arrastar sobre a grade estende o intervalo inserido na fórmula de lá.
  const inicioExterno = useRef<Pos | null>(null);
  const semTeclado = useSemTeclado();
  const versao = useVersaoPlanilha();
  const ancora = useEstado((e) => e.ancora);
  const foco = useEstado((e) => e.foco);
  const modo = useEstado((e) => e.modo);
  const rascunho = useEstado((e) => e.rascunho);
  const copiado = useEstado((e) => e.copiado);
  const alca = useEstado((e) => e.alca);
  const arrasto = useEstado((e) => e.arrasto);
  const celebrando = useEstado((e) => e.celebrando);
  const graficoAtivo = useEstado((e) => e.graficoAtivo);
  const circularInvalidos = useEstado((e) => e.circularInvalidos);

  const selecao = normalizar(ancora, foco);
  // Larguras ajustadas pelo aluno (arrastar a borda do cabeçalho ou duplo clique nela).
  const [larguraManual, setLarguraManual] = useState<Record<number, number>>({});
  const colunas = useMemo(
    () =>
      Array.from(
        { length: planilha.colunas },
        (_, c) => larguraManual[c] ?? larguras?.[colunaParaLetras(c)] ?? LARGURA_PADRAO,
      ),
    [planilha.colunas, larguras, larguraManual],
  );

  // O que cada célula mostra: texto longo invade as vazias à direita; número que não cabe vira ####.
  // Também o alinhamento, as cores e a formatação condicional: a Celula recebe tudo pronto
  // em props simples e, memorizada, só re-renderiza quando algo dela mudou.
  const vistas = useMemo(
    () =>
      Array.from({ length: planilha.linhas }, (_, l) => {
        const valores: ValorCelula[] = [];
        const linha = ajustarLinha(
          colunas.map((w, c) => {
            const p = { linha: l, coluna: c };
            const v = planilha.valor(p);
            valores.push(v);
            return {
              texto: planilha.exibicao(p),
              tipo: typeof v === "number" ? ("numero" as const) : typeof v === "string" ? ("texto" as const) : ("outro" as const),
              vazia: v === null || v === "",
              negrito: planilha.negrito(paraEndereco(p)),
              largura: w,
            };
          }),
          medirTexto,
        );
        return linha.map((a, c): Vista => {
          const p = { linha: l, coluna: c };
          const end = paraEndereco(p);
          const v = valores[c];
          const circular = planilha.circular(p);
          const cond = planilha.estiloCondicional(end);
          return {
            texto: a.texto,
            larguraVisivel: a.larguraVisivel,
            alinh: circular ? "direita" : alinhamento(v),
            erro: typeof v === "object" && v !== null && !circular,
            circular,
            negrito: planilha.negrito(end),
            destaque: cond?.destaque,
            escala: cond?.escala,
            barra: cond?.barra,
          };
        });
      }),
    // versao: recalcula quando a planilha muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planilha, colunas, versao],
  );

  const redimensionar = (c: number, x0: number) => {
    const w0 = colunas[c];
    const mover = (ev: globalThis.MouseEvent) =>
      setLarguraManual((m) => ({ ...m, [c]: Math.max(24, Math.round(w0 + ev.clientX - x0)) }));
    const soltar = () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
  };

  const ajustarAoConteudo = (c: number) => {
    const textos = Array.from({ length: planilha.linhas }, (_, l) => {
      const p = { linha: l, coluna: c };
      return { texto: planilha.exibicao(p), negrito: planilha.negrito(paraEndereco(p)) };
    });
    setLarguraManual((m) => ({ ...m, [c]: larguraParaCaber(textos, medirTexto) }));
  };
  const esquerda = (c: number) => LARGURA_CABECALHO + colunas.slice(0, c).reduce((a, b) => a + b, 0);
  const larguraTotal = esquerda(planilha.colunas);

  // Linhas escondidas pelo filtro têm altura zero: a posição de cada linha depende das de cima.
  const tops = useMemo(() => {
    const t = [ALTURA];
    for (let l = 0; l < planilha.linhas; l++) t.push(t[l] + (planilha.linhaOculta(l) ? 0 : ALTURA));
    return t;
    // versao: o filtro (ou um valor filtrado) mudou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planilha, versao]);
  const topo = (l: number) => tops[Math.max(0, Math.min(l, planilha.linhas))];
  const alturaEntre = (de: number, ate: number) => topo(ate + 1) - topo(de);
  const filtro = planilha.filtroAtual();
  const filtrando = !!filtro && Object.keys(filtro.criterios).length > 0;
  const [menuFiltro, setMenuFiltro] = useState<number | null>(null);

  // A ajuda de fórmula fica fora da área rolável (para não ser cortada) e acompanha a rolagem.
  const [rolagem, setRolagem] = useState({ x: 0, y: 0 });

  // Depois de inserir uma referência pelo clique, põe o cursor logo após ela.
  // useLayoutEffect roda antes do navegador processar a próxima tecla.
  const cursorPendente = useRef<number | null>(null);
  useLayoutEffect(() => {
    const pos = cursorPendente.current;
    if (pos === null) return;
    cursorPendente.current = null;
    entradaRef.current?.focus();
    entradaRef.current?.setSelectionRange(pos, pos);
  }, [rascunho, entradaRef]);

  // Mantém o foco no input da grade (ele captura a digitação, inclusive acentos).
  const raizRef = useRef<HTMLDivElement>(null);
  // Sem autofoco: só depois do primeiro clique, toque ou foco dentro da grade.
  const usada = useRef(autoFoco);
  const apontandoDeFora = !!apontarExterno;
  useEffect(() => {
    // Apontando de outra aba, quem digita é a barra de fórmulas (a célula da fórmula está lá).
    if (apontandoDeFora) {
      document.querySelector<HTMLInputElement>('[data-testid="barra-formulas"]')?.focus();
      return;
    }
    const ativo = document.activeElement;
    // Não rouba o foco de campos que têm o próprio foco (barra de fórmulas, campo de resposta).
    if (ativo?.closest("[data-foco-proprio]")) return;
    // Nem de quem saiu da grade de propósito (Esc e Tab, um botão do exercício, um link):
    // só refoca se o foco se perdeu ou ainda está dentro da grade.
    const perdido = !ativo || ativo === document.body;
    if (!perdido && !raizRef.current?.contains(ativo)) return;
    if (perdido && !usada.current) return;
    const el = entradaRef.current;
    // Celular, fora da edição: refoca para o teclado virtual fechar (inputMode "none").
    if (semTeclado && modo === "pronto" && el && ativo === el) el.blur();
    el?.focus({ preventScroll: true });
  }, [ancora, modo, entradaRef, semTeclado, apontandoDeFora]);

  const gradeRef = useRef<HTMLDivElement>(null);
  // Largura visível da grade (o menu do filtro não pode passar dela no celular).
  const [larguraVisivel, setLarguraVisivel] = useState<number | null>(null);
  useEffect(() => {
    const el = gradeRef.current;
    if (!el) return;
    const medir = () => setLarguraVisivel(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // Celular: o gráfico não pode ser mais largo que a área visível da grade (senão o último mês fica cortado).
  const larguraGrafico = larguraVisivel ? Math.max(220, Math.min(LARGURA_GRAFICO, larguraVisivel - LARGURA_CABECALHO)) : LARGURA_GRAFICO;

  /**
   * Rola a grade por dentro até o retângulo (coordenadas do conteúdo), sem deixá-lo
   * por baixo do cabeçalho fixo das linhas. Maior que a área visível, mostra o canto
   * esquerdo/de cima. `pagina`: também rola a página
   * na vertical, o mínimo para o retângulo aparecer.
   */
  const rolarPara = useCallback((x0: number, x1: number, y0: number, y1: number, pagina = false) => {
    const g = gradeRef.current;
    if (!g) return;
    let sl = g.scrollLeft;
    let st = g.scrollTop;
    // À esquerda e em cima, mostra também um pedaço da coluna e da linha anteriores
    // (ou os cabeçalhos, na primeira coluna e na primeira linha).
    // O cabeçalho das linhas fica fixo à esquerda: a área útil começa depois dele.
    // Maior que a área útil (o gráfico no celular), alinha pelo começo.
    const util = g.clientWidth - LARGURA_CABECALHO;
    if (x1 > sl + g.clientWidth) sl = x1 - g.clientWidth;
    if (x0 - LARGURA_CABECALHO < sl || x1 - x0 > util) sl = Math.max(0, x0 - LARGURA_CABECALHO);
    if (y1 > st + g.clientHeight) st = y1 - g.clientHeight;
    if (y0 - ALTURA < st || y1 - y0 > g.clientHeight) st = Math.max(0, y0 - ALTURA);
    if (sl !== g.scrollLeft || st !== g.scrollTop) g.scrollTo({ left: sl, top: st });
    if (!pagina) return;
    const r = g.getBoundingClientRect();
    const topoNaTela = r.top + (y0 - st);
    const fimNaTela = r.top + (y1 - st);
    const alturaTela = window.innerHeight;
    if (fimNaTela > alturaTela) window.scrollBy({ top: Math.min(fimNaTela - alturaTela + 8, topoNaTela - 8) });
    else if (topoNaTela < 0) window.scrollBy({ top: topoNaTela - 8 });
  }, []);

  useEffect(() => {
    const soltar = () => {
      inicioExterno.current = null;
      store.getState().terminarArrasto();
    };
    window.addEventListener("mouseup", soltar);
    return () => window.removeEventListener("mouseup", soltar);
  }, [store]);

  // Modo "apontar": a referência inserida pelo clique, arrasto ou setas. Enquanto o
  // texto não muda e o cursor está logo depois dela, novos cliques/setas a substituem.
  const apontador = useRef<{ ini: number; fim: number; ancora: Pos; foco: Pos; rascunho: string } | null>(null);

  const apontadorAtivo = () => {
    const a = apontador.current;
    const s = store.getState();
    if (!a || s.modo === "pronto" || s.rascunho !== a.rascunho) return null;
    const cursor = entradaRef.current?.selectionStart ?? s.rascunho.length;
    return cursor === a.fim ? a : null;
  };

  const apontar = (de: Pos, ate: Pos) => {
    const s = store.getState();
    const ativo = apontadorAtivo();
    const cursor = entradaRef.current?.selectionStart ?? s.rascunho.length;
    const ini = ativo ? ativo.ini : cursor;
    const fim = ativo ? ativo.fim : cursor;
    const ref = intervaloParaTexto(normalizar(de, ate));
    const novo = s.rascunho.slice(0, ini) + ref + s.rascunho.slice(fim);
    apontador.current = { ini, fim: ini + ref.length, ancora: de, foco: ate, rascunho: novo };
    cursorPendente.current = ini + ref.length;
    s.setRascunho(novo);
    store.setState({ cursor: ini + ref.length });
  };

  const apontandoReferencia = () => {
    const { modo, rascunho } = store.getState();
    const el = entradaRef.current;
    if (modo === "pronto" || !rascunho.startsWith("=")) return false;
    const cursor = el?.selectionStart ?? rascunho.length;
    return ACEITA_REFERENCIA.test(rascunho.slice(0, cursor));
  };

  const aoPressionarCelula = (e: MouseEvent, p: Pos) => {
    e.preventDefault();
    if (apontarExterno) {
      inicioExterno.current = p;
      apontarExterno(p, p);
      return;
    }
    const s = store.getState();
    if (s.graficoAtivo !== null) store.setState({ graficoAtivo: null });
    // Modo "apontar": clicar (ou arrastar) numa célula enquanto digita uma fórmula insere a referência.
    if ((apontandoReferencia() || apontadorAtivo()) && !(p.linha === s.ancora.linha && p.coluna === s.ancora.coluna)) {
      apontar(p, p);
      store.setState({ arrasto: "apontar" });
      return;
    }
    if (s.modo !== "pronto" && !s.confirmar()) return;
    // Clicar numa célula traz o foco para a grade (de um botão, de um painel, da barra de fórmulas).
    if (document.activeElement !== entradaRef.current) entradaRef.current?.focus({ preventScroll: true });
    // "Selecionar intervalo" (barra de toque): 1º toque marca o começo, 2º toque o fim.
    const fimDoIntervalo = s.intervaloNoToque === "fim";
    s.selecionarPeloMouse(p, e.shiftKey || fimDoIntervalo);
    store.setState({
      arrasto: "selecao",
      intervaloNoToque: s.intervaloNoToque === "inicio" ? "fim" : null,
    });
  };

  const aoEntrarCelula = (p: Pos) => {
    if (apontarExterno && inicioExterno.current) return apontarExterno(inicioExterno.current, p);
    const s = store.getState();
    if (s.arrasto === "selecao") s.selecionarPeloMouse(p, true);
    if (s.arrasto === "alca") s.moverAlca(p);
    if (s.arrasto === "apontar" && apontador.current) apontar(apontador.current.ancora, p);
  };

  const aoPressionarCabecalho = (e: MouseEvent, tipo: "coluna" | "linha", indice: number) => {
    e.preventDefault();
    const s = store.getState();
    if (s.modo !== "pronto" && !s.confirmar()) return;
    if (document.activeElement !== entradaRef.current) entradaRef.current?.focus({ preventScroll: true });
    s.selecionarCabecalho(tipo, indice, e.shiftKey);
  };

  // Esc no modo pronto (ou ao cancelar a edição) libera o próximo Tab para sair da grade.
  // Sem isso o Tab anda para a direita, como no Excel, e a grade prenderia o teclado.
  const liberarTab = useRef(false);

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    const tecla = e.key;
    if (tecla === "Tab" && liberarTab.current && store.getState().modo === "pronto") {
      liberarTab.current = false;
      return; // o navegador leva o foco ao próximo (ou anterior) controle da página
    }
    if (tecla !== "Shift") liberarTab.current = false;
    // (Esc fechando a lista do autocompletar é tratado aqui e não libera o Tab.)
    if (teclaDeFormula(e, store)) return; // autocompletar e F4
    const s = store.getState();
    const ctrl = e.ctrlKey || e.metaKey;

    if (s.modo === "pronto") {
      // Alt+↓: abre o menu do filtro (no cabeçalho com seta) ou a lista da validação, como no Excel.
      if (tecla === "ArrowDown" && e.altKey) {
        e.preventDefault();
        if (filtro && s.ancora.linha === filtro.intervalo.inicio.linha && s.ancora.coluna >= filtro.intervalo.inicio.coluna && s.ancora.coluna <= filtro.intervalo.fim.coluna) {
          setMenuFiltro(s.ancora.coluna);
          return;
        }
        if (planilha.itensDaLista(s.ancora)?.length) setListaAberta(paraEndereco(s.ancora));
        return;
      }
      const setas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (setas[tecla]) {
        e.preventDefault();
        if (ctrl) s.moverAteBorda(...setas[tecla], e.shiftKey);
        else s.mover(...setas[tecla], e.shiftKey);
        return;
      }
      if (tecla === "Home") {
        e.preventDefault();
        s.irPara(ctrl ? "inicio" : "inicioDaLinha", e.shiftKey);
        return;
      }
      if (tecla === "End" && ctrl) {
        e.preventDefault();
        s.irPara("fim", e.shiftKey);
        return;
      }
      if (tecla === "Enter") {
        e.preventDefault();
        s.mover(e.shiftKey ? -1 : 1, 0);
        return;
      }
      if (tecla === "Tab") {
        e.preventDefault();
        s.mover(0, e.shiftKey ? -1 : 1);
        return;
      }
      if (tecla === "F2") {
        e.preventDefault();
        s.iniciarEdicao("editar");
        return;
      }
      if (tecla === "Delete" || tecla === "Backspace") {
        e.preventDefault();
        s.apagarSelecao();
        return;
      }
      if (tecla === "Escape") {
        store.setState({ copiado: null, mensagem: null });
        liberarTab.current = true;
        return;
      }
      if (ctrl) {
        // Ctrl+Shift+L: liga/desliga o filtro, como no Excel.
        if (dados && e.shiftKey && e.code === "KeyL") {
          e.preventDefault();
          s.alternarFiltro();
          return;
        }
        // Ctrl+Shift+4 (R$) e Ctrl+Shift+5 (%), como no Excel. e.code ignora o layout do teclado.
        if (formatacao && e.shiftKey && (e.code === "Digit4" || e.code === "Digit5")) {
          e.preventDefault();
          s.formatarSelecao(e.code === "Digit4" ? "moeda" : "percentual");
          return;
        }
        const k = tecla.toLowerCase();
        if (k === "c") {
          e.preventDefault();
          s.copiar();
          void escreverNaAreaDeTransferencia(planilha.textoDoIntervalo(s.selecao()));
          return;
        }
        if (k === "x") {
          // Recortar: vai para a área do sistema e sai daqui. Ao colar, as
          // referências ficam como estão (como no Excel).
          e.preventDefault();
          void escreverNaAreaDeTransferencia(planilha.textoDoIntervalo(s.selecao()));
          s.apagarSelecao();
          store.setState({ copiado: null });
          return;
        }
        if (k === "v") {
          // Com uma cópia interna marcada, cola ajustando as referências.
          // Sem ela, deixa o navegador disparar o evento "paste" (texto de fora).
          if (s.copiado) {
            e.preventDefault();
            s.colar();
          }
          return;
        }
        if (k === "a") return (e.preventDefault(), s.selecionarTudo());
        if (k === "z") return (e.preventDefault(), e.shiftKey ? planilha.refazer() : planilha.desfazer());
        if (k === "y") return (e.preventDefault(), planilha.refazer());
        if (k === "d") return (e.preventDefault(), s.preencherSelecao("baixo"));
        if (k === "r") return (e.preventDefault(), s.preencherSelecao("direita"));
      }
      return; // demais teclas caem no onChange (inicia edição)
    }

    // inserir / editar
    if (tecla === "Enter") {
      e.preventDefault();
      if (s.confirmar()) s.mover(e.shiftKey ? -1 : 1, 0);
      return;
    }
    if (tecla === "Tab") {
      e.preventDefault();
      if (s.confirmar()) s.mover(0, e.shiftKey ? -1 : 1);
      return;
    }
    if (tecla === "Escape") {
      e.preventDefault();
      s.cancelar();
      liberarTab.current = true;
      return;
    }
    if (tecla === "F2") {
      e.preventDefault();
      store.setState({ modo: s.modo === "inserir" ? "editar" : "inserir" });
      return;
    }
    // Fórmula esperando uma referência (depois de "=", "(", ";", operador): as setas
    // apontam uma célula, como no Excel. Shift+seta estende para um intervalo.
    if (tecla.startsWith("Arrow") && s.modo === "inserir" && s.rascunho.startsWith("=")) {
      const a = apontadorAtivo();
      if (a || apontandoReferencia()) {
        e.preventDefault();
        const d: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        };
        const [dl, dc] = d[tecla];
        const andar = (q: Pos) => ({
          linha: Math.max(0, Math.min(planilha.linhas - 1, q.linha + dl)),
          coluna: Math.max(0, Math.min(planilha.colunas - 1, q.coluna + dc)),
        });
        if (a && e.shiftKey) apontar(a.ancora, andar(a.foco));
        else {
          const q = andar(a ? a.foco : s.ancora);
          apontar(q, q);
        }
        return;
      }
    }
    // No modo inserir, setas confirmam e movem, exceto em fórmulas
    // (lá elas movem o cursor, o que é mais previsível para quem está aprendendo).
    if (s.modo === "inserir" && tecla.startsWith("Arrow") && !s.rascunho.startsWith("=")) {
      e.preventDefault();
      if (!s.confirmar()) return;
      const d: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      s.mover(...d[tecla]);
    }
  };

  // Colar vindo de fora (Ctrl+V sem cópia interna, ou menu do navegador).
  // Editando uma célula, o texto entra no editor normalmente.
  const aoColar = (e: ClipboardEvent<HTMLInputElement>) => {
    const s = store.getState();
    if (s.modo !== "pronto") return;
    e.preventDefault();
    if (s.copiado) {
      s.colar();
      return;
    }
    const texto = e.clipboardData.getData("text/plain");
    if (!texto) return;
    const r = planilha.colarTexto(s.ancora, texto);
    store.setState({ foco: r.fim, mensagem: r.ok ? null : r.mensagem });
  };

  const aoDigitar = (valor: string) => {
    const s = store.getState();
    if (s.modo === "pronto") {
      if (s.iniciarEdicao("inserir", valor)) return;
      // célula bloqueada: descarta o que foi digitado
      if (entradaRef.current) entradaRef.current.value = "";
      return;
    }
    s.setRascunho(valor);
  };

  const selecionarTextoNoToque = useRef(false);
  const iniciarEdicaoNaAtiva = () => {
    if (!store.getState().iniciarEdicao("editar")) return;
    // Celular: o teclado virtual só abre aqui (toque duplo). O foco precisa acontecer
    // dentro do próprio toque, senão o celular não mostra o teclado.
    const el = entradaRef.current;
    if (semTeclado && el) {
      el.inputMode = "text";
      el.blur();
      el.focus({ preventScroll: true });
      // No celular, quem toca duas vezes quer reescrever a célula: o texto entra
      // selecionado e a digitação o substitui (antes, anexava ao fim e virava
      // "=SOMA(B2;B7)=SOMA(B2:B7)" → FALSO).
      selecionarTextoNoToque.current = true;
    }
  };
  useLayoutEffect(() => {
    if (!selecionarTextoNoToque.current || modo === "pronto") return;
    selecionarTextoNoToque.current = false;
    const el = entradaRef.current;
    if (!el) return;
    el.setSelectionRange(0, el.value.length);
    store.setState({ cursor: el.value.length });
  }, [modo, rascunho, entradaRef, store]);

  // As funções que as células recebem ficam estáveis (senão o memo da Celula não serve):
  // chamam a versão mais nova guardada num ref.
  const manipuladores = useRef({ aoPressionarCelula, aoEntrarCelula, iniciarEdicaoNaAtiva });
  useLayoutEffect(() => {
    manipuladores.current = { aoPressionarCelula, aoEntrarCelula, iniciarEdicaoNaAtiva };
  });
  const pressionarCelula = useCallback((e: MouseEvent, p: Pos) => manipuladores.current.aoPressionarCelula(e, p), []);
  const entrarCelula = useCallback((p: Pos) => manipuladores.current.aoEntrarCelula(p), []);
  const duploClique = useCallback(() => manipuladores.current.iniciarEdicaoNaAtiva(), []);

  // Lista da validação aberta (pela setinha ou Alt+↓): vale para a célula onde foi aberta.
  const [listaAbertaEm, setListaAberta] = useState<string | null>(null);

  // A célula ativa sempre à vista dentro da grade (celular: a grade é bem mais larga que a tela).
  // Na abertura, mostra também a primeira célula do exercício, se couberem as duas.
  const ax0 = esquerda(ancora.coluna);
  const ax1 = esquerda(ancora.coluna + 1);
  const ay0 = topo(ancora.linha);
  const ay1 = topo(ancora.linha + 1);
  const primeiraRolagem = useRef(true);
  const primeiroAlvo = useMemo(() => {
    const a = alvos.values().next().value;
    if (!a) return null;
    try {
      return deEndereco(a);
    } catch {
      return null;
    }
  }, [alvos]);
  const alvoRet = primeiroAlvo
    ? [esquerda(primeiroAlvo.coluna), esquerda(primeiroAlvo.coluna + 1), topo(primeiroAlvo.linha), topo(primeiroAlvo.linha + 1)]
    : null;
  const alvoRetRef = useRef(alvoRet);
  useLayoutEffect(() => {
    alvoRetRef.current = alvoRet;
  });
  useEffect(() => {
    const g = gradeRef.current;
    if (!g) return;
    if (primeiraRolagem.current) {
      primeiraRolagem.current = false;
      const a = alvoRetRef.current;
      if (a) {
        const x0 = Math.min(ax0, a[0]);
        const x1 = Math.max(ax1, a[1]);
        if (x1 - x0 <= g.clientWidth - LARGURA_CABECALHO) rolarPara(x0, x1, Math.min(ay0, a[2]), Math.max(ay1, a[3]));
      }
      rolarPara(ax0, ax1, ay0, ay1);
      return;
    }
    // Navegando pela grade (teclado ou toque), a página também acompanha a célula.
    rolarPara(ax0, ax1, ay0, ay1, document.activeElement === entradaRef.current);
  }, [ax0, ax1, ay0, ay1, rolarPara, entradaRef]);

  // Tabela dinâmica recém-criada: rola até ela (no celular, G1 fica fora da tela).
  const totalDinamicas = planilha.tabelasDinamicas().length;
  const dinamicasAntes = useRef(totalDinamicas);
  const ultimaDinamica = totalDinamicas > 0 ? planilha.tabelasDinamicas()[totalDinamicas - 1].area : null;
  const retDinamica = ultimaDinamica
    ? [
        esquerda(ultimaDinamica.inicio.coluna),
        esquerda(Math.min(ultimaDinamica.fim.coluna, planilha.colunas - 1) + 1),
        topo(ultimaDinamica.inicio.linha),
        topo(Math.min(ultimaDinamica.fim.linha, planilha.linhas - 1) + 1),
      ]
    : null;
  const retDinamicaRef = useRef(retDinamica);
  useLayoutEffect(() => {
    retDinamicaRef.current = retDinamica;
  });
  useEffect(() => {
    const antes = dinamicasAntes.current;
    dinamicasAntes.current = totalDinamicas;
    const r = retDinamicaRef.current;
    if (totalDinamicas > antes && r) rolarPara(r[0], r[1], r[2], r[3], true);
  }, [totalDinamicas, rolarPara]);

  // Gráfico selecionado (recém-inserido, por exemplo): rola a grade até ele.
  const posGrafico = graficoAtivo !== null ? planilha.graficos()[graficoAtivo]?.posicao : undefined;
  const retGrafico = posGrafico
    ? (() => {
        const p = deEndereco(posGrafico);
        const x = esquerda(Math.min(p.coluna, planilha.colunas - 1));
        const y = topo(Math.min(p.linha, planilha.linhas - 1));
        return [x, x + larguraGrafico, y, y + ALTURA_GRAFICO];
      })()
    : null;
  const retGraficoRef = useRef(retGrafico);
  useLayoutEffect(() => {
    retGraficoRef.current = retGrafico;
  });
  useEffect(() => {
    const r = retGraficoRef.current;
    if (graficoAtivo !== null && r) rolarPara(r[0], r[1], r[2], r[3], true);
  }, [graficoAtivo, posGrafico, rolarPara]);

  // Leitor de tela: endereço e valor exibido da célula ativa ("B8, R$ 7.355,00"),
  // um instante depois da última tecla (setas seguidas não viram uma fila de anúncios).
  const descricaoAtiva = (() => {
    const end = paraEndereco(ancora);
    const unica = selecao.inicio.linha === selecao.fim.linha && selecao.inicio.coluna === selecao.fim.coluna;
    if (!unica) return `${intervaloParaTexto(selecao)} selecionado, célula ativa ${end}`;
    const v = vistas[ancora.linha]?.[ancora.coluna];
    const partes = [end, v?.texto.trim() ? v.texto.trim() : "vazia"];
    if (planilha.temFormula(ancora)) partes.push(`fórmula ${planilha.bruto(ancora)}`);
    if (v?.destaque) partes.push(`destacada em ${v.destaque}`);
    if (alvos.has(end)) partes.push("célula do exercício");
    if (planilha.itensDaLista(ancora)?.length) partes.push("com lista, Alt+seta para baixo abre");
    if (filtro && ancora.linha === filtro.intervalo.inicio.linha && ancora.coluna >= filtro.intervalo.inicio.coluna && ancora.coluna <= filtro.intervalo.fim.coluna)
      partes.push(`filtro${filtro.criterios[colunaParaLetras(ancora.coluna)] ? " aplicado" : ""}, Alt+seta para baixo abre`);
    return partes.join(", ");
  })();
  const [anuncio, setAnuncio] = useState(descricaoAtiva);
  useEffect(() => {
    if (modo !== "pronto") return;
    const t = setTimeout(() => setAnuncio(descricaoAtiva), 250);
    return () => clearTimeout(t);
  }, [descricaoAtiva, modo]);

  const editando = modo !== "pronto";
  const idAjuda = useId();
  const fecharMenuFiltro = useCallback(() => {
    setMenuFiltro(null);
    // O foco volta para quem abriu (a setinha ou a grade); se ele se perdeu, para a grade.
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) entradaRef.current?.focus({ preventScroll: true });
    });
  }, [entradaRef]);
  const larguraEditor = Math.max(colunas[ancora.coluna], (rascunho.length + 2) * 8);
  // Referências da fórmula: todas colorem o texto; na grade, só as que caem nesta aba.
  const daqui = (aba?: string) => (aba === undefined ? !formulaExterna : !!nomeAba && aba.toUpperCase() === nomeAba.toUpperCase());
  // Referência 3D (Jan:Mar!B2): pinta em todas as abas do intervalo, pela ordem das abas.
  const nesta = (r: { aba?: string; ateAba?: string }) => {
    if (r.ateAba === undefined || !nomeAba) return daqui(r.aba);
    const ordem = (planilha.pasta?.nomes() ?? []).map((n) => n.toUpperCase());
    const i = ordem.indexOf(r.aba!.toUpperCase()), j = ordem.indexOf(r.ateAba.toUpperCase()), k = ordem.indexOf(nomeAba.toUpperCase());
    return i >= 0 && j >= 0 && k >= Math.min(i, j) && k <= Math.max(i, j);
  };
  const refsTexto = editando ? referenciasDaFormula(rascunho) : [];
  const refsCoradas = (editando ? refsTexto : formulaExterna ? referenciasDaFormula(formulaExterna) : []).filter(nesta);

  return (
    <div
      className="relative"
      ref={raizRef}
      onPointerDownCapture={() => (usada.current = true)}
      onFocusCapture={() => (usada.current = true)}
    >
      <div
        ref={gradeRef}
        onScroll={(e) => setRolagem({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop })}
        // isolate: os z-index de dentro (cabeçalho fixo, editor) não passam por cima do resto da página
        className="isolate overflow-auto rounded-md border border-zinc-300 bg-white shadow-sm"
        data-testid="grade"
      >
      <div
        className="relative select-none font-[Calibri,Carlito,Arial,sans-serif] text-[13px]"
        style={{ width: larguraTotal, height: topo(planilha.linhas) }}
        onMouseLeave={() => {
          if (store.getState().arrasto === "alca") store.setState({ alca: null });
        }}
      >
        {/* Números das linhas: coluna fixa à esquerda (sticky), como no Excel. No celular a
            grade rola sozinha até a célula ativa, a tabela dinâmica ou o gráfico, e sem isso
            os números sumiam junto. Fundo opaco e acima das células; o canto, acima de tudo. */}
        <div
          data-testid="cabecalho-linhas"
          className="sticky left-0 z-40"
          style={{ width: LARGURA_CABECALHO, height: topo(planilha.linhas) }}
        >
          {/* canto */}
          <div
            className="absolute z-[1] border-r border-b border-zinc-300 bg-header"
            style={{ left: 0, top: 0, width: LARGURA_CABECALHO, height: ALTURA }}
          />
          {/* linhas */}
          {Array.from({ length: planilha.linhas }, (_, l) => {
            if (planilha.linhaOculta(l)) return null;
            const ativa = l >= selecao.inicio.linha && l <= selecao.fim.linha;
            // Como no Excel: com algum critério ligado, os números das linhas da tabela ficam azuis.
            const azul = filtrando && filtro && l > filtro.intervalo.inicio.linha && l <= filtro.intervalo.fim.linha;
            return (
              <div
                key={`l${l}`}
                data-linha-filtrada={azul || undefined}
                className={`absolute flex items-center justify-center border-r border-b border-zinc-300 ${
                  ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-600"
                } ${azul ? "!text-blue-600" : ""}`}
                style={{ left: 0, top: topo(l), width: LARGURA_CABECALHO, height: ALTURA }}
                onMouseDown={(e) => aoPressionarCabecalho(e, "linha", l)}
                data-cabecalho={l + 1}
              >
                {l + 1}
              </div>
            );
          })}
        </div>
        {/* cabeçalhos de coluna */}
        {colunas.map((w, c) => {
          const ativa = c >= selecao.inicio.coluna && c <= selecao.fim.coluna;
          return (
            <div
              key={`c${c}`}
              className={`absolute flex items-center justify-center border-r border-b border-zinc-300 ${
                ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-600"
              }`}
              style={{ left: esquerda(c), top: 0, width: w, height: ALTURA }}
              onMouseDown={(e) => aoPressionarCabecalho(e, "coluna", c)}
              data-cabecalho={colunaParaLetras(c)}
            >
              {colunaParaLetras(c)}
              {/* borda arrastável: muda a largura; duplo clique ajusta ao conteúdo */}
              <div
                data-borda-coluna={colunaParaLetras(c)}
                title="Arraste para mudar a largura · duplo clique ajusta ao conteúdo"
                className="absolute top-0 right-[-4px] z-[3] h-full w-[7px] cursor-col-resize"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  redimensionar(c, e.clientX);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  ajustarAoConteudo(c);
                }}
              />
            </div>
          );
        })}
        {/* células */}
        {Array.from({ length: planilha.linhas }, (_, l) =>
          planilha.linhaOculta(l) ? null : colunas.map((w, c) => {
            const p = { linha: l, coluna: c };
            const end = paraEndereco(p);
            return (
              <Celula
                key={end}
                endereco={end}
                linha={l}
                coluna={c}
                left={esquerda(c)}
                top={topo(l)}
                largura={w}
                {...vistas[l][c]}
                naSelecao={contem(selecao, p) && !(l === ancora.linha && c === ancora.coluna)}
                alvo={alvos.has(end)}
                celebrando={celebrando && alvos.has(end)}
                onPressionar={pressionarCelula}
                onEntrar={entrarCelula}
                onDuploClique={duploClique}
              />
            );
          }),
        )}
        {/* setas do AutoFiltro no cabeçalho da tabela */}
        {filtro &&
          Array.from({ length: filtro.intervalo.fim.coluna - filtro.intervalo.inicio.coluna + 1 }, (_, i) => {
            const c = filtro.intervalo.inicio.coluna + i;
            const letra = colunaParaLetras(c);
            const ativo = !!filtro.criterios[letra];
            return (
              <button
                key={`f${c}`}
                type="button"
                data-testid={`seta-filtro-${letra}`}
                aria-label={`Filtrar a coluna ${letra}${ativo ? " (filtro aplicado)" : ""}`}
                aria-haspopup="dialog"
                aria-expanded={menuFiltro === c}
                title={ativo ? "Filtro aplicado nesta coluna" : "Filtrar ou classificar"}
                // mousedown: não tira o foco da grade (stopPropagation: o clique fora não fecha o menu antes do toggle)
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  if (store.getState().modo !== "pronto" && !store.getState().confirmar()) return;
                  setMenuFiltro((m) => (m === c ? null : c));
                }}
                // before: área de toque de 24 px sem mudar o desenho da setinha
                className={`absolute z-[4] flex items-center justify-center rounded-sm border text-[9px] leading-none shadow-sm before:absolute before:-inset-x-1 before:-inset-y-1 before:content-[''] ${
                  ativo ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-400 bg-white text-zinc-600 hover:bg-zinc-100"
                }`}
                style={{ left: esquerda(c + 1) - 19, top: topo(filtro.intervalo.inicio.linha) + 4, width: 16, height: 17 }}
              >
                {ativo ? <IconeFunil /> : "▼"}
              </button>
            );
          })}
        {/* tabelas dinâmicas: o quadro vazio antes de escolher os campos, o erro, e o contorno da ativa */}
        {planilha.tabelasDinamicas().map((t, i) => {
          const fl = Math.min(t.area.fim.linha, planilha.linhas - 1);
          const fc = Math.min(t.area.fim.coluna, planilha.colunas - 1);
          const ativa = contem(t.area, ancora);
          if (!t.vazia && !t.erro && !ativa) return null;
          return (
            <div
              key={`d${i}`}
              data-testid={t.vazia ? "dinamica-vazia" : t.erro ? "dinamica-erro" : "dinamica-ativa"}
              className={`pointer-events-none absolute z-[1] flex items-center justify-center p-2 text-center text-xs leading-snug ${
                t.erro
                  ? "border-2 border-dashed border-red-400 bg-red-50/70 text-red-800"
                  : t.vazia
                    ? "border border-zinc-400 bg-zinc-50 text-zinc-500"
                    : "border-2 border-blue-300/70"
              }`}
              style={{
                left: esquerda(t.area.inicio.coluna),
                top: topo(t.area.inicio.linha),
                width: esquerda(fc + 1) - esquerda(t.area.inicio.coluna),
                height: alturaEntre(t.area.inicio.linha, fl),
              }}
            >
              {t.erro ? "A tabela dinâmica não cabe aqui" : t.vazia ? "Tabela dinâmica: escolha os campos no painel" : null}
            </div>
          );
        })}
        {/* gráficos: flutuam sobre as células, ancorados na célula de posição */}
        {planilha.graficos().map((g, i) => {
          const p = deEndereco(g.posicao);
          const ativo = graficoAtivo === i;
          return (
            <div
              key={`g${i}`}
              data-testid={`grafico-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const s = store.getState();
                if (s.modo !== "pronto" && !s.confirmar()) return;
                store.setState({ graficoAtivo: i });
              }}
              className={`absolute z-[6] cursor-pointer overflow-hidden rounded-sm bg-white shadow-md ${ativo ? "ring-2 ring-success" : "ring-1 ring-zinc-300"}`}
              style={{ left: esquerda(Math.min(p.coluna, planilha.colunas - 1)), top: topo(Math.min(p.linha, planilha.linhas - 1)), width: larguraGrafico, height: ALTURA_GRAFICO }}
            >
              <GraficoSvg dados={planilha.dadosDoGrafico(i)} tipo={g.tipo} titulo={g.titulo} rotulos={g.rotulos} largura={larguraGrafico} altura={ALTURA_GRAFICO} />
              {/* Botão vazio por cima: focável, Enter/Espaço abre o Design do Gráfico (o nome não disputa com o texto do SVG). */}
              <button
                type="button"
                aria-label={`Editar o gráfico ${i + 1}${g.titulo.trim() ? `: ${g.titulo.trim()}` : ""}`}
                aria-pressed={ativo}
                data-testid={`editar-grafico-${i}`}
                onClick={() => {
                  const s = store.getState();
                  if (s.modo !== "pronto" && !s.confirmar()) return;
                  store.setState({ graficoAtivo: i });
                }}
                className="absolute inset-0 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-success"
              />
            </div>
          );
        })}
        {/* Circular Dados Inválidos: elipse vermelha em volta do que fura a validação */}
        {circularInvalidos &&
          planilha.celulasInvalidas().map((end) => {
            const p = deEndereco(end);
            if (planilha.linhaOculta(p.linha)) return null;
            return (
              <div
                key={`inv${end}`}
                data-circulo-invalido={end}
                className="pointer-events-none absolute z-[3] rounded-[50%] border-2 border-red-600"
                style={{ left: esquerda(p.coluna) - 3, top: topo(p.linha) - 2, width: colunas[p.coluna] + 6, height: ALTURA + 4 }}
              />
            );
          })}
        {/* área copiada (tracejado) */}
        {copiado && (
          <div
            className="pointer-events-none absolute z-[2] border-2 border-dashed border-success"
            style={{
              left: esquerda(copiado.inicio.coluna) - 1,
              top: topo(copiado.inicio.linha) - 1,
              width: esquerda(copiado.fim.coluna + 1) - esquerda(copiado.inicio.coluna) + 1,
              height: alturaEntre(copiado.inicio.linha, copiado.fim.linha) + 1,
            }}
          />
        )}
        {/* contorno da seleção */}
        <div
          className="pointer-events-none absolute z-[2] border-2 border-success"
          style={{
            left: esquerda(selecao.inicio.coluna) - 1,
            top: topo(selecao.inicio.linha) - 1,
            width: esquerda(selecao.fim.coluna + 1) - esquerda(selecao.inicio.coluna) + 1,
            height: alturaEntre(selecao.inicio.linha, selecao.fim.linha) + 1,
          }}
        />
        {/* destino da alça */}
        {alca && (
          <div
            className="pointer-events-none absolute z-[2] border border-dashed border-zinc-600 bg-zinc-500/10"
            style={{
              left: esquerda(alca.inicio.coluna),
              top: topo(alca.inicio.linha),
              width: esquerda(alca.fim.coluna + 1) - esquerda(alca.inicio.coluna),
              height: alturaEntre(alca.inicio.linha, alca.fim.linha),
            }}
          />
        )}
        {/* alça de preenchimento */}
        {!editando && !selecaoFixa && (
          <div
            data-testid="alca"
            title="Arraste para copiar a fórmula"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              store.getState().iniciarAlca();
            }}
            className="absolute z-10 h-[7px] w-[7px] cursor-crosshair border border-white bg-success"
            style={{
              left: esquerda(selecao.fim.coluna + 1) - 4,
              top: topo(selecao.fim.linha + 1) - 4,
            }}
          />
        )}
        {/* referências da fórmula em edição, cada uma na sua cor */}
        {refsCoradas.map((r, i) => {
          const fl = Math.min(r.intervalo.fim.linha, planilha.linhas - 1);
          const fc = Math.min(r.intervalo.fim.coluna, planilha.colunas - 1);
          if (r.intervalo.inicio.linha > fl || r.intervalo.inicio.coluna > fc) return null;
          const cor = CORES_REFERENCIA[r.cor];
          return (
            <div
              key={i}
              data-testid="referencia-colorida"
              data-intervalo={r.texto.replace(/\$/g, "")}
              className="pointer-events-none absolute z-[2] border-2"
              style={{
                left: esquerda(r.intervalo.inicio.coluna) - 1,
                top: topo(r.intervalo.inicio.linha) - 1,
                width: esquerda(fc + 1) - esquerda(r.intervalo.inicio.coluna) + 1,
                height: alturaEntre(r.intervalo.inicio.linha, fl) + 1,
                borderColor: cor,
                backgroundColor: `${cor}14`,
              }}
            />
          );
        })}
        {/* texto colorido por cima do editor (o input fica com o texto transparente) */}
        {refsTexto.length > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-30 flex items-center overflow-hidden border-2 border-transparent px-1 whitespace-pre text-zinc-900"
            style={{
              left: esquerda(ancora.coluna) - 1,
              top: topo(ancora.linha) - 1,
              width: larguraEditor + 2,
              height: ALTURA + 1,
            }}
          >
            <FormulaColorida texto={rascunho} refs={refsTexto} />
          </div>
        )}
        {/* input da célula ativa: invisível no modo pronto, editor nos outros */}
        <input
          ref={entradaRef}
          data-testid="editor-celula"
          aria-label={editando ? `Editando a célula ${paraEndereco(ancora)}` : `Célula ${descricaoAtiva}`}
          aria-describedby={idAjuda}
          autoComplete="off"
          spellCheck={false}
          // Celular: selecionar uma célula não abre o teclado; só o toque duplo (edição).
          inputMode={semTeclado && !editando ? "none" : "text"}
          value={editando ? rascunho : ""}
          onChange={(e) => {
            aoDigitar(e.target.value);
            if (store.getState().modo !== "pronto") store.setState({ cursor: e.target.selectionStart ?? 0 });
          }}
          {...rastrearCursor(store)}
          onPaste={aoColar}
          onKeyDown={aoTeclar}
          className={`absolute z-20 border-2 border-success px-1 font-[inherit] text-[13px] outline-none ${
            editando ? `bg-white opacity-100 shadow-md ${refsTexto.length ? "text-transparent" : "text-zinc-900"}` : "opacity-0"
          }`}
          style={{
            left: esquerda(ancora.coluna) - 1,
            top: topo(ancora.linha) - 1,
            width: editando ? larguraEditor + 2 : colunas[ancora.coluna] + 2,
            height: ALTURA + 1,
            caretColor: editando ? "#16181d" : "transparent",
            cursor: arrasto ? "crosshair" : undefined,
            pointerEvents: editando ? "auto" : "none",
          }}
        />
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true" data-testid="anuncio-celula">
        {anuncio}
      </span>
      <span className="sr-only" id={idAjuda}>
        Planilha. Setas navegam, Enter e Tab andam como no Excel. Para sair da planilha, Esc e depois Tab. Alt+seta para baixo abre o filtro ou a lista da célula.
      </span>
      </div>
      {filtro && menuFiltro !== null && menuFiltro >= filtro.intervalo.inicio.coluna && menuFiltro <= filtro.intervalo.fim.coluna && (
        <MenuFiltro
          key={menuFiltro}
          coluna={menuFiltro}
          // Limitado à largura VISÍVEL da grade (no celular a grade é mais larga que a tela).
          left={Math.max(0, Math.min(esquerda(menuFiltro + 1) - 19 - rolagem.x, Math.min(larguraTotal, larguraVisivel ?? larguraTotal) - LARGURA_MENU_FILTRO))}
          top={topo(filtro.intervalo.inicio.linha + 1) - rolagem.y}
          fechar={fecharMenuFiltro}
        />
      )}
      {/* Validação de dados na célula ativa: a setinha da lista e a mensagem de entrada (o "post-it" do Excel) */}
      {!editando && (() => {
        const itens = planilha.itensDaLista(ancora);
        const entrada = planilha.validacaoEm(ancora)?.entrada;
        return (
          <>
            {itens && itens.length > 0 && (
              <ListaSuspensa
                key={`${ancora.linha},${ancora.coluna}`}
                left={esquerda(ancora.coluna) - rolagem.x}
                top={topo(ancora.linha) - rolagem.y}
                largura={colunas[ancora.coluna]}
                itens={itens}
                atual={planilha.exibicao(ancora)}
                aberta={listaAbertaEm === paraEndereco(ancora)}
                setAberta={(a) => setListaAberta(a ? paraEndereco(ancora) : null)}
              />
            )}
            {entrada && (entrada.titulo.trim() || entrada.texto.trim()) && (
              <div
                data-testid="mensagem-entrada"
                role="note"
                className="pointer-events-none absolute z-[24] max-w-56 rounded-sm border border-zinc-400 bg-[#FFFFE1] px-2 py-1 text-xs text-zinc-800 shadow"
                style={{ left: esquerda(ancora.coluna) + 12 - rolagem.x, top: topo(ancora.linha + 1) + 4 - rolagem.y }}
              >
                {entrada.titulo.trim() && <p className="font-bold">{entrada.titulo}</p>}
                <p>{entrada.texto}</p>
              </div>
            )}
          </>
        );
      })()}
      {editando && (
        <AjudaFormula
          left={Math.max(0, esquerda(ancora.coluna) - rolagem.x)}
          top={topo(ancora.linha + 1) - rolagem.y + 2}
        />
      )}
    </div>
  );
}

/** O que uma célula mostra, calculado pela Grade a cada recálculo (props simples para o memo). */
type Vista = {
  texto: string;
  larguraVisivel: number;
  alinh: "esquerda" | "direita" | "centro";
  erro: boolean;
  circular: boolean;
  negrito: boolean;
  destaque?: EstiloDestaque;
  escala?: string;
  barra?: number;
};

type PropsCelula = Vista & {
  endereco: string;
  linha: number;
  coluna: number;
  left: number;
  top: number;
  largura: number;
  naSelecao: boolean;
  alvo: boolean;
  celebrando: boolean;
  onPressionar: (e: MouseEvent, p: Pos) => void;
  onEntrar: (p: Pos) => void;
  onDuploClique: () => void;
};

/**
 * Uma célula. Memorizada: digitar, mover a seleção ou recalcular só re-renderiza
 * as células cujo texto, cor ou seleção mudaram (as funções vêm estáveis da Grade).
 */
const Celula = memo(function Celula({
  endereco,
  linha,
  coluna,
  left,
  top,
  largura,
  texto,
  larguraVisivel,
  alinh,
  erro,
  circular,
  negrito,
  destaque: idDestaque,
  escala,
  barra,
  naSelecao,
  alvo,
  celebrando,
  onPressionar,
  onEntrar,
  onDuploClique,
}: PropsCelula) {
  const destaque = idDestaque ? CORES_DESTAQUE[idDestaque] : undefined;
  const pintada = !celebrando && !naSelecao && (destaque || escala);
  return (
    <div
      data-celula={endereco}
      onMouseDown={(e) => onPressionar(e, { linha, coluna })}
      onMouseEnter={() => onEntrar({ linha, coluna })}
      onDoubleClick={onDuploClique}
      className={`absolute whitespace-nowrap border-r border-b border-line px-1 leading-[25px] ${
        larguraVisivel > largura ? "z-[1] overflow-visible" : "overflow-hidden"
      } ${
        celebrando
          ? "bg-success-bg motion-safe:animate-acerto"
          : naSelecao
            ? "bg-success-bg"
            : alvo
              ? "bg-accent-soft"
              : "bg-white"
      } ${negrito ? "font-bold" : ""} ${erro ? "text-red-700" : circular ? "text-ink" : "text-zinc-900"}`}
      style={{
        left,
        top,
        width: largura,
        height: ALTURA,
        textAlign: alinh === "direita" ? "right" : alinh === "centro" ? "center" : "left",
        ...(pintada ? { backgroundColor: destaque?.fundo ?? escala } : {}),
        ...(destaque && !erro ? { color: destaque.texto } : {}),
      }}
      data-destaque={idDestaque}
      title={
        circular
          ? `${endereco}: referência circular`
          : alvo
            ? `${endereco}: célula do exercício`
            : undefined
      }
    >
      {barra !== undefined && (
        <span
          aria-hidden
          data-barra
          className="pointer-events-none absolute top-[3px] bottom-[3px] left-0.5 rounded-[1px]"
          style={{ width: `calc(${barra * 100}% - 4px)`, background: "linear-gradient(90deg, #638EC6, #c9d7ee)" }}
        />
      )}
      {barra !== undefined ? (
        <span className="relative">{texto}</span>
      ) : larguraVisivel > largura ? (
        // camada que passa por cima das vizinhas vazias (cobre as linhas de grade, como no Excel)
        <span
          className="pointer-events-none absolute top-0 left-0 overflow-hidden px-1"
          style={{ width: larguraVisivel - 1, height: ALTURA - 1, background: "inherit" }}
        >
          {texto}
        </span>
      ) : (
        texto
      )}
    </div>
  );
});
