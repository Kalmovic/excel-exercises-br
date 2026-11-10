"use client";

import { intervaloParaTexto, normalizar, paraEndereco } from "@/engine/address";
import { explicarErro, mensagemCircular } from "@/engine/erros";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";

export function BarraFormulas() {
  const { planilha, store, entradaRef, caixaDeNome, selecaoFixa } = useSimulador();
  useVersaoPlanilha();
  const ancora = useEstado((e) => e.ancora);
  const foco = useEstado((e) => e.foco);
  const modo = useEstado((e) => e.modo);
  const rascunho = useEstado((e) => e.rascunho);
  const mensagem = useEstado((e) => e.mensagem);

  const editando = modo !== "pronto";
  // Célula de dados ou seleção travada: a barra serve só para ler, sem aviso de erro ao clicar.
  const somenteLeitura = !editando && (selecaoFixa || planilha.bloqueada(ancora));

  // Prioridade: recusa da fórmula > referência circular > explicação do erro da célula ativa.
  const circulares = planilha.celulasCirculares();
  const valorAtivo = planilha.valor(ancora);
  const erroAtivo =
    !editando && valorAtivo !== null && typeof valorAtivo === "object" && !planilha.circular(ancora)
      ? explicarErro(valorAtivo.erro)
      : undefined;
  const aviso = mensagem
    ? { texto: mensagem, cor: "text-red-700" }
    : circulares.length > 0
      ? { texto: `⚠ ${mensagemCircular(circulares)}`, cor: "text-ink" }
      : erroAtivo && typeof valorAtivo === "object" && valorAtivo !== null
        ? { texto: `${valorAtivo.erro}: ${erroAtivo}.`, cor: "text-zinc-600" }
        : null;
  const nome = editando ? paraEndereco(ancora) : intervaloParaTexto(normalizar(ancora, foco));
  const voltarParaGrade = () => entradaRef.current?.focus();

  return (
    <div className="space-y-1">
      <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white text-sm shadow-sm">
        <div
          className="flex w-20 shrink-0 items-center justify-center border-r border-zinc-300 bg-bg font-mono text-zinc-700"
          data-testid="caixa-nome"
        >
          {caixaDeNome ? nome : <span title="Escondida neste exercício">?</span>}
        </div>
        <button
          type="button"
          aria-label="Cancelar"
          disabled={!editando}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            store.getState().cancelar();
            voltarParaGrade();
          }}
          className="w-8 border-r border-line text-zinc-500 enabled:hover:text-red-600 disabled:opacity-30"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Confirmar"
          disabled={!editando}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (store.getState().confirmar()) voltarParaGrade();
          }}
          className="w-8 border-r border-line text-zinc-500 enabled:hover:text-success disabled:opacity-30"
        >
          ✓
        </button>
        <span className="flex w-8 items-center justify-center border-r border-line font-serif italic text-zinc-500">
          fx
        </span>
        <input
          data-foco-proprio
          data-testid="barra-formulas"
          aria-label="Barra de fórmulas"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 px-2 py-1.5 font-mono text-[13px] outline-none"
          value={editando ? rascunho : planilha.bruto(ancora)}
          readOnly={somenteLeitura}
          onFocus={() => {
            if (!somenteLeitura && store.getState().modo === "pronto") store.getState().iniciarEdicao("editar");
          }}
          onChange={(e) => store.getState().setRascunho(e.target.value)}
          onKeyDown={(e) => {
            const s = store.getState();
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              if (s.confirmar()) {
                if (e.key === "Enter") s.mover(e.shiftKey ? -1 : 1, 0);
                else s.mover(0, e.shiftKey ? -1 : 1);
                voltarParaGrade();
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              s.cancelar();
              voltarParaGrade();
            }
          }}
        />
      </div>
      <p
        role="alert"
        data-testid="mensagem-formula"
        className={`min-h-5 text-sm ${aviso ? aviso.cor : "text-transparent"}`}
      >
        {aviso?.texto ?? "."}
      </p>
    </div>
  );
}
