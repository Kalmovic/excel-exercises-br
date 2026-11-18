"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ValidacaoDados } from "@/content/schema";
import { deIntervalo, intervaloParaTexto } from "@/engine/address";
import { ERRO_PADRAO, NOMES_OPERADOR, NOMES_PERMITIR } from "@/engine/validacao";
import { useEstado, useSimulador, useVersaoPlanilha } from "./contexto";
import { navegarItens, useEscape, useFocoDentro, useFocoPreso } from "./teclado";

type Permitir = ValidacaoDados["permitir"] | "qualquer";
type Operador = NonNullable<ValidacaoDados["operador"]>;
type Aba = "config" | "entrada" | "erro";

function IconeValidacao() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="2" width="12" height="10" rx="1" />
      <path d="M4 7.2l2 2 4-4.2" strokeWidth="1.6" />
    </svg>
  );
}

/** Botões "Validação de Dados" e "Circular Dados Inválidos". */
export function BotoesValidacao({ classeBotao }: { classeBotao: string }) {
  const { store, planilha } = useSimulador();
  useVersaoPlanilha();
  const [aberta, setAberta] = useState(false);
  const circular = useEstado((e) => e.circularInvalidos);
  const n = circular ? planilha.celulasInvalidas().length : 0;
  const botaoRef = useRef<HTMLButtonElement>(null);
  // mousedown + preventDefault: o clique não tira o foco (nem a seleção) da grade;
  // a ação fica no click, que também vem do Enter e do Espaço.
  const acao = (fn: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      const s = store.getState();
      if (s.modo !== "pronto" && !s.confirmar()) return;
      fn();
    },
  });
  return (
    <div className="relative flex flex-wrap items-center gap-1">
      <button
        ref={botaoRef}
        type="button"
        data-testid="botao-validacao"
        aria-expanded={aberta}
        aria-haspopup="dialog"
        {...acao(() => setAberta((a) => !a))}
        className={`${classeBotao} ${aberta ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
      >
        <IconeValidacao /> Validação de Dados
      </button>
      <button
        type="button"
        data-testid="botao-circular"
        aria-pressed={circular}
        title={circular ? "Limpar Círculos de Validação" : "Circular Dados Inválidos"}
        {...acao(() => store.setState({ circularInvalidos: !circular }))}
        className={`${classeBotao} ${circular ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
      >
        <span aria-hidden className="inline-block h-3 w-4 rounded-[50%] border-2 border-red-600" />
        {circular ? "Limpar Círculos" : "Circular Dados Inválidos"}
      </button>
      {circular && (
        <span className="px-1 text-xs text-zinc-500" data-testid="total-invalidos" aria-live="polite">
          {n === 0 ? "nenhum valor inválido" : `${n} ${n === 1 ? "valor inválido" : "valores inválidos"}`}
        </span>
      )}
      {aberta && (
        <JanelaValidacao
          fechar={(paraGrade) => {
            setAberta(false);
            // OK volta para a grade; Esc e Cancelar, para o botão que abriu.
            if (!paraGrade) requestAnimationFrame(() => botaoRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}

/**
 * A janela "Validação de Dados" com as três abas do Excel. Abre com a regra
 * que já vale na célula ativa (como o Excel), aplicada à seleção.
 */
function JanelaValidacao({ fechar: fecharJanela }: { fechar: (paraGrade?: boolean) => void }) {
  const { planilha, store, entradaRef } = useSimulador();
  const [inicial] = useState(() => {
    const s = store.getState();
    return { intervalo: intervaloParaTexto(s.selecao()), regra: planilha.validacaoEm(s.ancora) };
  });
  const r = inicial.regra;
  const [aba, setAba] = useState<Aba>("config");
  const [permitir, setPermitir] = useState<Permitir>(r?.permitir ?? "qualquer");
  const [operador, setOperador] = useState<Operador>(r?.operador ?? "entre");
  const [valor1, setValor1] = useState(r?.valor1 ?? "");
  const [valor2, setValor2] = useState(r?.valor2 ?? "");
  const [fonte, setFonte] = useState(r?.fonte ?? "");
  const [entradaTitulo, setEntradaTitulo] = useState(r?.entrada?.titulo ?? "");
  const [entradaTexto, setEntradaTexto] = useState(r?.entrada?.texto ?? "");
  const [erroTitulo, setErroTitulo] = useState(r?.erro?.titulo ?? "");
  const [erroTexto, setErroTexto] = useState(r?.erro?.texto ?? "");
  const [intervalo, setIntervalo] = useState(inicial.intervalo);
  const [aviso, setAviso] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  const fechar = () => fecharJanela(false);
  useEscape(ref, fechar);
  useFocoDentro(ref, "[data-testid=validacao-permitir]", false);
  useFocoPreso(ref);

  const paraGrade = () => {
    fecharJanela(true);
    entradaRef.current?.focus({ preventScroll: true });
  };

  const intervaloOk = () => {
    try {
      return deIntervalo(intervalo.replace(/\$/g, ""));
    } catch {
      setAviso("Escreva o intervalo como B2:B10.");
      return null;
    }
  };

  const ok = (e: React.FormEvent) => {
    e.preventDefault();
    const int = intervaloOk();
    if (!int) return;
    if (permitir === "qualquer") {
      planilha.limparValidacoes(int);
      paraGrade();
      return;
    }
    const v: ValidacaoDados = { intervalo: intervaloParaTexto(int), permitir };
    if (permitir === "lista") v.fonte = fonte;
    else {
      v.operador = operador;
      v.valor1 = valor1;
      if (operador === "entre" || operador === "fora") v.valor2 = valor2;
    }
    if (entradaTitulo.trim() || entradaTexto.trim()) v.entrada = { titulo: entradaTitulo.slice(0, 50), texto: entradaTexto.slice(0, 255) };
    if (erroTitulo.trim() || erroTexto.trim()) v.erro = { titulo: erroTitulo.slice(0, 50), texto: erroTexto.slice(0, 255) };
    const res = planilha.adicionarValidacao(v);
    if (!res.ok) {
      setAba("config");
      return setAviso(res.mensagem);
    }
    paraGrade();
  };

  const campo = "rounded border border-zinc-300 px-2 py-1 text-[13px] outline-none focus:border-success focus:ring-2 focus:ring-success/40";
  const dois = operador === "entre" || operador === "fora";
  const abas: [Aba, string][] = [
    ["config", "Configurações"],
    ["entrada", "Mensagem de entrada"],
    ["erro", "Alerta de erro"],
  ];
  const painel = { role: "tabpanel", id: `${id}-painel`, "aria-labelledby": `${id}-aba-${aba}` } as const;

  return (
    <form
      ref={ref}
      onSubmit={ok}
      data-foco-proprio
      data-testid="janela-validacao"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-titulo`}
      className="absolute top-full left-0 z-50 mt-1 w-[min(28rem,88vw)] space-y-3 rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-lg"
    >
      <p className="font-semibold" id={`${id}-titulo`}>
        Validação de Dados
      </p>
      <div
        role="tablist"
        aria-label="Partes da validação"
        className="flex gap-1 border-b border-zinc-200 text-[13px]"
        onKeyDown={(e) => {
          const alvo = navegarItens(e, '[role="tab"]', "horizontal");
          if (alvo) setAba(alvo.dataset.abaValidacao as Aba);
        }}
      >
        {abas.map(([idAba, rotulo]) => (
          <button
            key={idAba}
            type="button"
            role="tab"
            id={`${id}-aba-${idAba}`}
            aria-selected={aba === idAba}
            aria-controls={`${id}-painel`}
            tabIndex={aba === idAba ? 0 : -1}
            data-aba-validacao={idAba}
            onClick={() => setAba(idAba)}
            className={`-mb-px min-h-6 rounded-t border px-2 py-1 ${aba === idAba ? "border-zinc-200 border-b-white bg-white font-medium" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "config" && (
        <div className="space-y-3" {...painel}>
          <label className="block space-y-1">
            <span className="block text-xs text-zinc-500">Permitir</span>
            <select value={permitir} onChange={(e) => setPermitir(e.target.value as Permitir)} className={campo} data-testid="validacao-permitir">
              <option value="qualquer">Qualquer valor</option>
              {(Object.keys(NOMES_PERMITIR) as ValidacaoDados["permitir"][]).map((k) => (
                <option key={k} value={k}>
                  {NOMES_PERMITIR[k]}
                </option>
              ))}
            </select>
          </label>
          {permitir === "lista" && (
            <label className="block space-y-1">
              <span className="block text-xs text-zinc-500">Fonte (itens separados por ponto e vírgula, ou um intervalo como =$F$2:$F$5)</span>
              <input value={fonte} onChange={(e) => setFonte(e.target.value)} className={`${campo} w-full`} data-testid="validacao-fonte" autoFocus spellCheck={false} />
            </label>
          )}
          {permitir !== "lista" && permitir !== "qualquer" && (
            <>
              <label className="block space-y-1">
                <span className="block text-xs text-zinc-500">Dados</span>
                <select value={operador} onChange={(e) => setOperador(e.target.value as Operador)} className={campo} data-testid="validacao-operador">
                  {(Object.keys(NOMES_OPERADOR) as Operador[]).map((k) => (
                    <option key={k} value={k}>
                      {NOMES_OPERADOR[k]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="space-y-1">
                  <span className="block text-xs text-zinc-500">{dois ? "Mínimo" : permitir === "comprimento" ? "Comprimento" : "Valor"}</span>
                  <input value={valor1} onChange={(e) => setValor1(e.target.value)} className={`${campo} w-32`} data-testid="validacao-valor1" />
                </label>
                {dois && (
                  <label className="space-y-1">
                    <span className="block text-xs text-zinc-500">Máximo</span>
                    <input value={valor2} onChange={(e) => setValor2(e.target.value)} className={`${campo} w-32`} data-testid="validacao-valor2" />
                  </label>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {aba === "entrada" && (
        <div className="space-y-2" {...painel}>
          <p className="text-xs text-zinc-500">Mostrar esta mensagem quando a célula for selecionada:</p>
          <input value={entradaTitulo} onChange={(e) => setEntradaTitulo(e.target.value)} placeholder="Título" aria-label="Título da mensagem de entrada" className={`${campo} w-full`} data-testid="validacao-entrada-titulo" />
          <textarea value={entradaTexto} onChange={(e) => setEntradaTexto(e.target.value)} placeholder="Mensagem de entrada" aria-label="Mensagem de entrada" rows={3} className={`${campo} w-full`} data-testid="validacao-entrada-texto" />
        </div>
      )}
      {aba === "erro" && (
        <div className="space-y-2" {...painel}>
          <p className="text-xs text-zinc-500">Estilo: Parar (não deixa gravar). Sem texto, aparece a mensagem padrão.</p>
          <input value={erroTitulo} onChange={(e) => setErroTitulo(e.target.value)} placeholder={ERRO_PADRAO.titulo} aria-label="Título do alerta de erro" className={`${campo} w-full`} data-testid="validacao-erro-titulo" />
          <textarea value={erroTexto} onChange={(e) => setErroTexto(e.target.value)} placeholder={ERRO_PADRAO.texto} aria-label="Mensagem de erro" rows={3} className={`${campo} w-full`} data-testid="validacao-erro-texto" />
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-zinc-600">
        Aplicar em
        <input value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className={`${campo} w-28 font-mono uppercase`} data-testid="validacao-intervalo" />
      </label>
      {aviso && (
        <p role="alert" className="text-sm text-red-700">
          {aviso}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            const int = intervaloOk();
            if (!int) return;
            planilha.limparValidacoes(int);
            paraGrade();
          }}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-header"
        >
          Limpar Tudo
        </button>
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-success px-3 py-1 font-medium text-white" data-testid="validacao-ok">
            OK
          </button>
          <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * A setinha da lista suspensa na célula ativa e a lista dos itens. Abre pela
 * setinha ou pelo Alt+↓ na grade; ↑ ↓ Home End escolhem, Enter grava, Esc fecha.
 */
export function ListaSuspensa({
  left,
  top,
  largura,
  itens,
  atual,
  aberta,
  setAberta,
}: {
  left: number;
  top: number;
  largura: number;
  itens: string[];
  /** O que a célula mostra agora (o item marcado ao abrir). */
  atual: string;
  aberta: boolean;
  setAberta: (a: boolean) => void;
}) {
  const { planilha, store, entradaRef } = useSimulador();
  const ref = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const [indice, setIndice] = useState(() => Math.max(0, itens.indexOf(atual)));
  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberta(false);
    };
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [aberta, setAberta]);
  useEffect(() => {
    if (aberta) listaRef.current?.focus({ preventScroll: true });
  }, [aberta]);
  const fechar = () => {
    setAberta(false);
    entradaRef.current?.focus({ preventScroll: true });
  };
  const escolher = (item: string) => {
    const s = store.getState();
    const r = planilha.definir(s.ancora, item);
    store.setState({ mensagem: r.ok ? null : r.mensagem });
    fechar();
  };
  const i = Math.min(indice, itens.length - 1);
  return (
    <div ref={ref} className="absolute z-[25]" style={{ left: left + largura + 1, top }}>
      <button
        type="button"
        aria-label="Abrir a lista"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        data-testid="seta-lista"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={() => {
          if (aberta) fechar();
          else setAberta(true);
        }}
        // before: área de toque de 24 px de largura sem mudar o desenho
        className="relative flex h-[25px] w-[18px] items-center justify-center border border-zinc-400 bg-white text-[9px] text-zinc-600 before:absolute before:inset-y-0 before:-inset-x-[3px] before:content-[''] hover:bg-zinc-100"
      >
        ▼
      </button>
      {aberta && (
        <ul
          ref={listaRef}
          role="listbox"
          aria-label="Itens da lista"
          aria-activedescendant={`${id}-${i}`}
          tabIndex={-1}
          data-testid="itens-lista"
          data-foco-proprio
          onKeyDown={(e) => {
            const k = e.key;
            if (k === "Escape" || k === "Tab") {
              e.preventDefault();
              fechar();
              return;
            }
            if (k === "Enter" || k === " ") {
              e.preventDefault();
              escolher(itens[i]);
              return;
            }
            const n = itens.length;
            const novo = k === "ArrowDown" ? i + 1 : k === "ArrowUp" ? i - 1 : k === "Home" ? 0 : k === "End" ? n - 1 : null;
            if (novo === null) return;
            e.preventDefault();
            setIndice(Math.max(0, Math.min(n - 1, novo)));
          }}
          className="absolute top-full right-0 mt-0.5 max-h-48 min-w-28 overflow-auto rounded border border-zinc-300 bg-white py-0.5 text-[13px] shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-success/40"
        >
          {itens.map((item, k) => (
            <li
              key={item}
              id={`${id}-${k}`}
              role="option"
              aria-selected={k === i}
              data-item-lista={item}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(item)}
              onMouseEnter={() => setIndice(k)}
              className={`block min-h-6 w-full cursor-pointer px-2 py-0.5 text-left whitespace-nowrap ${k === i ? "bg-blue-600 text-white" : ""}`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
