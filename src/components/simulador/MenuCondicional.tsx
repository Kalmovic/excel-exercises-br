"use client";

import { useEffect, useRef, useState } from "react";
import type { EstiloDestaque, RegraCondicional } from "@/content/schema";
import { deIntervalo, intervaloParaTexto } from "@/engine/address";
import { CORES_DESTAQUE } from "@/engine/condicional";
import { useSimulador, useVersaoPlanilha } from "./contexto";

type TipoForm = Exclude<RegraCondicional["tipo"], "barras" | "escala">;

/** Os itens do menu, agrupados como no Excel. */
const GRUPOS: { titulo: string; itens: { tipo: TipoForm | "barras" | "escala"; rotulo: string }[] }[] = [
  {
    titulo: "Realçar Regras das Células",
    itens: [
      { tipo: "maior", rotulo: "É Maior do que…" },
      { tipo: "menor", rotulo: "É Menor do que…" },
      { tipo: "entre", rotulo: "Está Entre…" },
      { tipo: "igual", rotulo: "É Igual a…" },
      { tipo: "texto", rotulo: "Texto que Contém…" },
      { tipo: "duplicados", rotulo: "Valores Duplicados…" },
    ],
  },
  {
    titulo: "Regras de Primeiros/Últimos",
    itens: [
      { tipo: "maiores", rotulo: "10 Primeiros Itens…" },
      { tipo: "menores", rotulo: "10 Últimos Itens…" },
      { tipo: "acimaMedia", rotulo: "Acima da Média…" },
      { tipo: "abaixoMedia", rotulo: "Abaixo da Média…" },
    ],
  },
  {
    titulo: "Visual",
    itens: [
      { tipo: "barras", rotulo: "Barras de Dados" },
      { tipo: "escala", rotulo: "Escalas de Cor" },
    ],
  },
  { titulo: "Avançado", itens: [{ tipo: "formula", rotulo: "Nova Regra: usar uma fórmula…" }] },
];

/** Frase do topo de cada janela, como o Excel escreve. */
const ENUNCIADO: Record<TipoForm, string> = {
  maior: "Formatar células que são MAIORES DO QUE:",
  menor: "Formatar células que são MENORES DO QUE:",
  entre: "Formatar células que estão ENTRE:",
  igual: "Formatar células que são IGUAIS A:",
  texto: "Formatar células que contêm o texto:",
  duplicados: "Formatar células que contêm:",
  unicos: "Formatar células que contêm:",
  maiores: "Formatar células que se classificam entre os PRIMEIROS:",
  menores: "Formatar células que se classificam entre os ÚLTIMOS:",
  acimaMedia: "Formatar células que estão ACIMA DA MÉDIA",
  abaixoMedia: "Formatar células que estão ABAIXO DA MÉDIA",
  formula: "Formatar valores em que esta fórmula é verdadeira (escrita para a primeira célula do intervalo):",
};

const ESTILOS = Object.entries(CORES_DESTAQUE) as [EstiloDestaque, (typeof CORES_DESTAQUE)[EstiloDestaque]][];

/** Botão "Formatação Condicional" e o que ele abre (menu, janela da regra ou o gerenciador). */
export function FormatacaoCondicional({ classeBotao }: { classeBotao: string }) {
  const { store } = useSimulador();
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState<{ tipo: TipoForm; intervalo: string } | null>(null);
  const [gerenciar, setGerenciar] = useState(false);
  const { planilha } = useSimulador();
  const [aviso, setAviso] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [menu]);

  const selecao = () => intervaloParaTexto(store.getState().selecao());
  const escolher = (tipo: TipoForm | "barras" | "escala") => {
    setMenu(false);
    setGerenciar(false);
    if (tipo === "barras" || tipo === "escala") {
      // Como no Excel: barras e escala se aplicam direto na seleção.
      const r = planilha.adicionarRegra({ tipo, intervalo: selecao() });
      setAviso(r.ok ? null : r.mensagem);
      return;
    }
    setForm({ tipo, intervalo: selecao() });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={menu}
        aria-haspopup="menu"
        data-testid="botao-condicional"
        onMouseDown={(e) => {
          e.preventDefault();
          const s = store.getState();
          if (s.modo !== "pronto" && !s.confirmar()) return;
          setMenu((m) => !m);
        }}
        className={`${classeBotao} ${menu ? "bg-accent text-ink ring-1 ring-ink/10" : ""}`}
      >
        <IconeCondicional /> Formatação Condicional ▾
      </button>
      {menu && (
        <div role="menu" data-testid="menu-condicional" className="absolute top-full left-0 z-50 mt-1 w-72 rounded-md border border-zinc-300 bg-white p-1 text-[13px] shadow-lg">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="border-b border-zinc-100 py-1 last:border-0">
              <p className="px-2 pb-0.5 text-[11px] font-semibold text-zinc-500">{g.titulo}</p>
              {g.itens.map((it) => (
                <button
                  key={it.tipo}
                  type="button"
                  role="menuitem"
                  data-regra={it.tipo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    escolher(it.tipo);
                  }}
                  className="block w-full rounded px-3 py-1 text-left hover:bg-header"
                >
                  {it.rotulo}
                </button>
              ))}
            </div>
          ))}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              className="block w-full rounded px-3 py-1 text-left hover:bg-header"
              onMouseDown={(e) => {
                e.preventDefault();
                planilha.limparRegras(store.getState().selecao());
                setMenu(false);
              }}
            >
              Limpar Regras das Células Selecionadas
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="gerenciar-regras"
              className="block w-full rounded px-3 py-1 text-left hover:bg-header"
              onMouseDown={(e) => {
                e.preventDefault();
                setMenu(false);
                setForm(null);
                setGerenciar(true);
              }}
            >
              Gerenciar Regras…
            </button>
          </div>
        </div>
      )}
      {aviso && (
        <p role="alert" className="absolute top-full left-0 z-40 mt-1 w-72 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
          {aviso}
        </p>
      )}
      {form && <JanelaRegra {...form} fechar={() => setForm(null)} />}
      {gerenciar && <GerenciarRegras fechar={() => setGerenciar(false)} />}
    </div>
  );
}

function IconeCondicional() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden>
      <rect x="1" y="1" width="12" height="3.5" rx="0.6" fill="#FFC7CE" stroke="#9C0006" strokeWidth="0.8" />
      <rect x="1" y="5.3" width="12" height="3.5" rx="0.6" fill="#FFEB9C" stroke="#9C5700" strokeWidth="0.8" />
      <rect x="1" y="9.6" width="12" height="3.5" rx="0.6" fill="#C6EFCE" stroke="#006100" strokeWidth="0.8" />
    </svg>
  );
}

/** A janela de uma regra: o valor (ou fórmula), o estilo e o intervalo "Aplica-se a". */
function JanelaRegra({ tipo: tipoInicial, intervalo: intervaloInicial, fechar }: { tipo: TipoForm; intervalo: string; fechar: () => void }) {
  const { planilha, entradaRef } = useSimulador();
  const [tipo, setTipo] = useState<TipoForm>(tipoInicial);
  const [valor, setValor] = useState(tipo === "formula" ? "=" : "");
  const [valor2, setValor2] = useState("");
  const [n, setN] = useState("10");
  const [estilo, setEstilo] = useState<EstiloDestaque>("vermelho");
  const [intervalo, setIntervalo] = useState(intervaloInicial);
  const [erro, setErro] = useState<string | null>(null);

  const ok = (e: React.FormEvent) => {
    e.preventDefault();
    let int: string;
    try {
      int = intervaloParaTexto(deIntervalo(intervalo.replace(/\$/g, "")));
    } catch {
      return setErro("Escreva o intervalo como C2:C10.");
    }
    let regra: RegraCondicional;
    switch (tipo) {
      case "maior":
      case "menor":
      case "igual":
      case "texto":
        if (!valor.trim()) return setErro("Preencha o valor da regra.");
        regra = { tipo, intervalo: int, valor, estilo };
        break;
      case "entre":
        if (!valor.trim() || !valor2.trim()) return setErro("Preencha os dois valores.");
        regra = { tipo, intervalo: int, valor, valor2, estilo };
        break;
      case "maiores":
      case "menores": {
        const k = Number(n);
        if (!Number.isInteger(k) || k < 1) return setErro("Escreva quantos itens (um número inteiro).");
        regra = { tipo, intervalo: int, n: k, estilo };
        break;
      }
      case "formula":
        if (valor.trim().length < 2) return setErro("Escreva a fórmula, começando com =.");
        regra = { tipo, intervalo: int, formula: valor.trim().startsWith("=") ? valor.trim() : `=${valor.trim()}`, estilo };
        break;
      default:
        regra = { tipo, intervalo: int, estilo };
    }
    const r = planilha.adicionarRegra(regra);
    if (!r.ok) return setErro(r.mensagem);
    fechar();
    entradaRef.current?.focus({ preventScroll: true });
  };

  const campo = "rounded border border-zinc-300 px-2 py-1 text-[13px] outline-none focus:border-success";
  const titulo = GRUPOS.flatMap((g) => g.itens).find((i) => i.tipo === tipo)?.rotulo.replace("…", "") ?? (tipo === "unicos" ? "Valores Duplicados" : "");

  return (
    <form
      onSubmit={ok}
      data-foco-proprio
      data-testid="janela-regra"
      className="absolute top-full left-0 z-50 mt-1 w-[min(26rem,85vw)] space-y-3 rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-lg"
    >
      <p className="font-semibold">{titulo}</p>
      <p className="text-xs text-zinc-600">{ENUNCIADO[tipo]}</p>
      <div className="flex flex-wrap items-center gap-2">
        {(tipo === "maior" || tipo === "menor" || tipo === "igual" || tipo === "texto" || tipo === "entre") && (
          <input value={valor} onChange={(e) => setValor(e.target.value)} className={`${campo} w-28`} aria-label="Valor" data-testid="regra-valor" autoFocus />
        )}
        {tipo === "entre" && (
          <>
            <span>e</span>
            <input value={valor2} onChange={(e) => setValor2(e.target.value)} className={`${campo} w-28`} aria-label="Segundo valor" data-testid="regra-valor2" />
          </>
        )}
        {(tipo === "duplicados" || tipo === "unicos") && (
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoForm)} className={campo} aria-label="Duplicados ou exclusivos" data-testid="regra-duplicados">
            <option value="duplicados">Duplicados</option>
            <option value="unicos">Exclusivos</option>
          </select>
        )}
        {(tipo === "maiores" || tipo === "menores") && (
          <input value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" className={`${campo} w-16`} aria-label="Quantidade" data-testid="regra-n" autoFocus />
        )}
        {tipo === "formula" && (
          <input value={valor} onChange={(e) => setValor(e.target.value)} className={`${campo} w-full font-mono`} aria-label="Fórmula" data-testid="regra-formula" autoFocus spellCheck={false} />
        )}
        <span className="text-xs text-zinc-600">{tipo === "formula" ? "Formatar com" : "com"}</span>
        <select value={estilo} onChange={(e) => setEstilo(e.target.value as EstiloDestaque)} className={`${campo} min-w-0 max-w-full`} aria-label="Estilo" data-testid="regra-estilo">
          {ESTILOS.map(([id, c]) => (
            <option key={id} value={id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        Aplica-se a
        <input value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className={`${campo} w-28 font-mono uppercase`} aria-label="Aplica-se a" data-testid="regra-intervalo" />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="submit" className="rounded bg-success px-3 py-1 font-medium text-white" data-testid="regra-ok">
          OK
        </button>
        <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
          Cancelar
        </button>
      </div>
    </form>
  );
}

const DESCRICAO: Record<RegraCondicional["tipo"], (r: RegraCondicional) => string> = {
  maior: (r) => `Valor da célula > ${"valor" in r ? r.valor : ""}`,
  menor: (r) => `Valor da célula < ${"valor" in r ? r.valor : ""}`,
  igual: (r) => `Valor da célula = ${"valor" in r ? r.valor : ""}`,
  texto: (r) => `Contém “${"valor" in r ? r.valor : ""}”`,
  entre: (r) => (r.tipo === "entre" ? `Entre ${r.valor} e ${r.valor2}` : ""),
  duplicados: () => "Valores duplicados",
  unicos: () => "Valores exclusivos",
  maiores: (r) => (r.tipo === "maiores" ? `${r.n} primeiros` : ""),
  menores: (r) => (r.tipo === "menores" ? `${r.n} últimos` : ""),
  acimaMedia: () => "Acima da média",
  abaixoMedia: () => "Abaixo da média",
  formula: (r) => (r.tipo === "formula" ? `Fórmula: ${r.formula}` : ""),
  barras: () => "Barras de dados",
  escala: () => "Escala de cor",
};

/** "Gerenciador de Regras": a lista (a mais nova primeiro, como no Excel), com Excluir. */
function GerenciarRegras({ fechar }: { fechar: () => void }) {
  const { planilha } = useSimulador();
  useVersaoPlanilha();
  const regras = planilha.regrasCondicionais();
  return (
    <div
      data-foco-proprio
      data-testid="gerenciador-regras"
      className="absolute top-full left-0 z-50 mt-1 w-[min(28rem,85vw)] rounded-md border border-zinc-300 bg-white p-3 text-sm shadow-lg"
    >
      <p className="mb-2 font-semibold">Gerenciador de Regras de Formatação Condicional</p>
      {regras.length === 0 ? (
        <p className="text-zinc-500">Nenhuma regra ainda.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded border border-zinc-200">
          {[...regras.entries()].reverse().map(([i, r]) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1.5">
              <span
                className="h-4 w-8 shrink-0 rounded-sm border border-zinc-300"
                style={
                  "estilo" in r
                    ? { background: CORES_DESTAQUE[r.estilo].fundo }
                    : { background: r.tipo === "barras" ? "linear-gradient(90deg,#638EC6 60%,#fff 60%)" : "linear-gradient(90deg,#F8696B,#FFEB84,#63BE7B)" }
                }
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{DESCRICAO[r.tipo](r)}</span>
              <span className="font-mono text-xs text-zinc-500">{r.intervalo}</span>
              <button type="button" onClick={() => planilha.removerRegra(i)} className="rounded px-1.5 text-xs text-zinc-500 hover:bg-header hover:text-red-700">
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={fechar} className="rounded border border-zinc-300 px-3 py-1 hover:bg-header">
          Fechar
        </button>
      </div>
    </div>
  );
}
