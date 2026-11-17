"use client";

import { useSemTeclado } from "@/lib/toque";
import {
  useEffect,
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
const LARGURA_CABECALHO = 44;

/** Caracteres depois dos quais um clique insere uma referência na fórmula. */
const ACEITA_REFERENCIA = /[=(;+\-*/^&<>:]\s*$/;

export function Grade({ larguras }: { larguras?: Record<string, number> }) {
  const { planilha, store, entradaRef, alvos, formatacao, selecaoFixa, dados } = useSimulador();
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
  const ajustes = useMemo(
    () =>
      Array.from({ length: planilha.linhas }, (_, l) =>
        ajustarLinha(
          colunas.map((w, c) => {
            const p = { linha: l, coluna: c };
            const v = planilha.valor(p);
            return {
              texto: planilha.exibicao(p),
              tipo: typeof v === "number" ? ("numero" as const) : typeof v === "string" ? ("texto" as const) : ("outro" as const),
              vazia: v === null || v === "",
              negrito: planilha.negrito(paraEndereco(p)),
              largura: w,
            };
          }),
          medirTexto,
        ),
      ),
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
  useEffect(() => {
    // Não rouba o foco de campos que têm o próprio foco (barra de fórmulas, campo de resposta).
    if (document.activeElement?.closest("[data-foco-proprio]")) return;
    const el = entradaRef.current;
    // Celular, fora da edição: refoca para o teclado virtual fechar (inputMode "none").
    if (semTeclado && modo === "pronto" && el && document.activeElement === el) el.blur();
    el?.focus({ preventScroll: true });
  }, [ancora, modo, entradaRef, semTeclado]);

  useEffect(() => {
    const soltar = () => store.getState().terminarArrasto();
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
    const s = store.getState();
    // Modo "apontar": clicar (ou arrastar) numa célula enquanto digita uma fórmula insere a referência.
    if ((apontandoReferencia() || apontadorAtivo()) && !(p.linha === s.ancora.linha && p.coluna === s.ancora.coluna)) {
      apontar(p, p);
      store.setState({ arrasto: "apontar" });
      return;
    }
    if (s.modo !== "pronto" && !s.confirmar()) return;
    // "Selecionar intervalo" (barra de toque): 1º toque marca o começo, 2º toque o fim.
    const fimDoIntervalo = s.intervaloNoToque === "fim";
    s.selecionarPeloMouse(p, e.shiftKey || fimDoIntervalo);
    store.setState({
      arrasto: "selecao",
      intervaloNoToque: s.intervaloNoToque === "inicio" ? "fim" : null,
    });
  };

  const aoEntrarCelula = (p: Pos) => {
    const s = store.getState();
    if (s.arrasto === "selecao") s.selecionarPeloMouse(p, true);
    if (s.arrasto === "alca") s.moverAlca(p);
    if (s.arrasto === "apontar" && apontador.current) apontar(apontador.current.ancora, p);
  };

  const aoPressionarCabecalho = (e: MouseEvent, tipo: "coluna" | "linha", indice: number) => {
    e.preventDefault();
    const s = store.getState();
    if (s.modo !== "pronto" && !s.confirmar()) return;
    s.selecionarCabecalho(tipo, indice, e.shiftKey);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (teclaDeFormula(e, store)) return; // autocompletar e F4
    const s = store.getState();
    const ctrl = e.ctrlKey || e.metaKey;
    const tecla = e.key;

    if (s.modo === "pronto") {
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

  const iniciarEdicaoNaAtiva = () => {
    if (!store.getState().iniciarEdicao("editar")) return;
    // Celular: o teclado virtual só abre aqui (toque duplo). O foco precisa acontecer
    // dentro do próprio toque, senão o celular não mostra o teclado.
    const el = entradaRef.current;
    if (semTeclado && el) {
      el.inputMode = "text";
      el.blur();
      el.focus({ preventScroll: true });
    }
  };

  const editando = modo !== "pronto";
  const larguraEditor = Math.max(colunas[ancora.coluna], (rascunho.length + 2) * 8);
  const refsCoradas = editando ? referenciasDaFormula(rascunho) : [];

  return (
    <div className="relative">
      <div
        onScroll={(e) => setRolagem({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop })}
        className="overflow-auto rounded-md border border-zinc-300 bg-white shadow-sm"
        data-testid="grade"
      >
      <div
        className="relative select-none font-[Calibri,Carlito,Arial,sans-serif] text-[13px]"
        style={{ width: larguraTotal, height: topo(planilha.linhas) }}
        onMouseLeave={() => {
          if (store.getState().arrasto === "alca") store.setState({ alca: null });
        }}
      >
        {/* canto */}
        <div
          className="absolute border-r border-b border-zinc-300 bg-header"
          style={{ left: 0, top: 0, width: LARGURA_CABECALHO, height: ALTURA }}
        />
        {/* cabeçalhos de coluna */}
        {colunas.map((w, c) => {
          const ativa = c >= selecao.inicio.coluna && c <= selecao.fim.coluna;
          return (
            <div
              key={`c${c}`}
              className={`absolute flex items-center justify-center border-r border-b border-zinc-300 ${
                ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-500"
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
                ativa ? "bg-header-ativo font-semibold text-ink" : "bg-header text-zinc-500"
              } ${azul ? "!text-blue-600" : ""}`}
              style={{ left: 0, top: topo(l), width: LARGURA_CABECALHO, height: ALTURA }}
              onMouseDown={(e) => aoPressionarCabecalho(e, "linha", l)}
              data-cabecalho={l + 1}
            >
              {l + 1}
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
                pos={p}
                left={esquerda(c)}
                top={topo(l)}
                largura={w}
                texto={ajustes[l][c].texto}
                larguraVisivel={ajustes[l][c].larguraVisivel}
                naSelecao={contem(selecao, p) && !(l === ancora.linha && c === ancora.coluna)}
                alvo={alvos.has(end)}
                celebrando={celebrando && alvos.has(end)}
                versao={versao}
                onPressionar={aoPressionarCelula}
                onEntrar={aoEntrarCelula}
                onDuploClique={iniciarEdicaoNaAtiva}
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
                aria-label={`Filtrar a coluna ${letra}`}
                title={ativo ? "Filtro aplicado nesta coluna" : "Filtrar ou classificar"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (store.getState().modo !== "pronto" && !store.getState().confirmar()) return;
                  setMenuFiltro((m) => (m === c ? null : c));
                }}
                className={`absolute z-[4] flex items-center justify-center rounded-sm border text-[9px] leading-none shadow-sm ${
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
              {t.erro ? "A tabela dinâmica não cabe aqui" : t.vazia ? "Tabela dinâmica: escolha os campos no painel abaixo" : null}
            </div>
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
        {refsCoradas.length > 0 && (
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
            <FormulaColorida texto={rascunho} refs={refsCoradas} />
          </div>
        )}
        {/* input da célula ativa: invisível no modo pronto, editor nos outros */}
        <input
          ref={entradaRef}
          data-testid="editor-celula"
          aria-label={`Célula ${paraEndereco(ancora)}`}
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
            editando ? `bg-white opacity-100 shadow-md ${refsCoradas.length ? "text-transparent" : "text-zinc-900"}` : "opacity-0"
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
      <span className="sr-only" aria-live="polite">
        {intervaloParaTexto(selecao)}
      </span>
      </div>
      {filtro && menuFiltro !== null && menuFiltro >= filtro.intervalo.inicio.coluna && menuFiltro <= filtro.intervalo.fim.coluna && (
        <MenuFiltro
          key={menuFiltro}
          coluna={menuFiltro}
          left={Math.max(0, Math.min(esquerda(menuFiltro + 1) - 19 - rolagem.x, larguraTotal - 240))}
          top={topo(filtro.intervalo.inicio.linha + 1) - rolagem.y}
          fechar={() => {
            setMenuFiltro(null);
            entradaRef.current?.focus({ preventScroll: true });
          }}
        />
      )}
      {editando && (
        <AjudaFormula
          left={Math.max(0, esquerda(ancora.coluna) - rolagem.x)}
          top={topo(ancora.linha + 1) - rolagem.y + 2}
        />
      )}
    </div>
  );
}

type PropsCelula = {
  endereco: string;
  pos: Pos;
  left: number;
  top: number;
  largura: number;
  /** Texto a mostrar (pode ser #### quando o número não cabe). */
  texto: string;
  /** Maior que `largura` quando o texto invade as células vazias à direita. */
  larguraVisivel: number;
  naSelecao: boolean;
  alvo: boolean;
  celebrando: boolean;
  /** Muda a cada recálculo; força a célula a ler o valor novo do motor. */
  versao: number;
  onPressionar: (e: MouseEvent, p: Pos) => void;
  onEntrar: (p: Pos) => void;
  onDuploClique: () => void;
};

function Celula({ endereco, pos, left, top, largura, texto, larguraVisivel, naSelecao, alvo, celebrando, onPressionar, onEntrar, onDuploClique }: PropsCelula) {
  const { planilha } = useSimulador();
  const valor = planilha.valor(pos);
  const circular = planilha.circular(pos);
  const alinh = circular ? "direita" : alinhamento(valor);
  const erro = typeof valor === "object" && valor !== null && !circular;
  // Formatação condicional: destaque (fundo e texto), escala de cor e barra de dados.
  const cond = planilha.estiloCondicional(endereco);
  const destaque = cond?.destaque ? CORES_DESTAQUE[cond.destaque] : undefined;
  const pintada = !celebrando && !naSelecao && (destaque || cond?.escala);
  return (
    <div
      data-celula={endereco}
      onMouseDown={(e) => onPressionar(e, pos)}
      onMouseEnter={() => onEntrar(pos)}
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
      } ${planilha.negrito(endereco) ? "font-bold" : ""} ${erro ? "text-red-700" : circular ? "text-ink" : "text-zinc-900"}`}
      style={{
        left,
        top,
        width: largura,
        height: ALTURA,
        textAlign: alinh === "direita" ? "right" : alinh === "centro" ? "center" : "left",
        ...(pintada ? { backgroundColor: destaque?.fundo ?? cond?.escala } : {}),
        ...(destaque && !erro ? { color: destaque.texto } : {}),
      }}
      data-destaque={cond?.destaque}
      title={
        circular
          ? `${endereco}: referência circular`
          : alvo
            ? `${endereco}: célula do exercício`
            : undefined
      }
    >
      {cond?.barra !== undefined && (
        <span
          aria-hidden
          data-barra
          className="pointer-events-none absolute top-[3px] bottom-[3px] left-0.5 rounded-[1px]"
          style={{ width: `calc(${cond.barra * 100}% - 4px)`, background: "linear-gradient(90deg, #638EC6, #c9d7ee)" }}
        />
      )}
      {cond?.barra !== undefined ? (
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
}
