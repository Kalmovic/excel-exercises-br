"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconeConquista } from "@/components/simulador/Trofeu";
import { escolherInicio, type ItemTrilha } from "@/lib/inicio";
import * as progresso from "@/lib/progresso";
import { BALAO_ESPACO, LARGURA, TAMANHO_CASA, TAMANHO_TROFEU, calcularLayout, chaveCasa, chaveTrofeu } from "./layout";

export type RegiaoMapa = {
  slug: string;
  numero: number;
  titulo: string;
  descricao: string;
  icone: "medalha" | "taca";
  /** Falso para módulos que ainda não existem: casas travadas. */
  disponivel: boolean;
  itens: { slug: string; titulo: string; nivel: number; versao: number }[];
  /** Quantas casas travadas mostrar numa região indisponível. */
  travadas?: number;
};

type Estado = "feito" | "pulado" | "pendente" | "travado";

const MINUTOS = { 1: 2, 2: 3, 3: 5 } as Record<number, number>;
const CHAVE_PINO = "excel-br:mapa:ultima-casa";

const ler = () =>
  JSON.stringify([progresso.lerTudo(), progresso.lerTrofeus(), progresso.lerPreferencias()]);
const noServidor = () => "";

function Cadeado() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** Marcador "você está aqui". Quando existir mascote, ele entra no lugar deste pino. */
function Pino() {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink font-mono text-lg font-bold text-accent shadow-lg">
        =
      </span>
      <span className="-mt-1 h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-ink" />
    </div>
  );
}

export function MapaTrilha({ regioes, trilha }: { regioes: RegiaoMapa[]; trilha: ItemTrilha[] }) {
  const bruto = useSyncExternalStore(progresso.assinar, ler, noServidor);
  const carregado = bruto !== "";
  const [tudo, trofeus, prefs] = carregado
    ? (JSON.parse(bruto) as [Record<string, progresso.ProgressoExercicio>, progresso.Trofeus, progresso.Preferencias])
    : [{}, {}, {}];

  const estadoDe = (item: RegiaoMapa["itens"][number]): Estado => {
    const p = tudo[item.slug];
    if (!p || p.versao !== item.versao) return "pendente";
    return p.status === "concluido" ? "feito" : p.status === "pulado" ? "pulado" : "pendente";
  };

  // Casa atual: a mesma regra do botão "Continuar" (nunca volta ao Intro de quem já seguiu adiante).
  const inicio = carregado ? escolherInicio(trilha, tudo, prefs) : null;
  const atual =
    inicio?.tipo === "continuar"
      ? inicio.alvo.slug
      : inicio?.tipo === "novo"
        ? inicio.intro.slug
        : inicio?.tipo === "novo-sem-intro"
          ? inicio.fundamentos.slug
          : null;

  const concluida = (r: RegiaoMapa) => r.disponivel && r.itens.length > 0 && r.itens.every((i) => estadoDe(i) === "feito");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const recolhida = (r: RegiaoMapa) => concluida(r) && !abertas.has(r.slug);

  const layout = calcularLayout(
    regioes.map((r) => ({ slug: r.slug, casas: r.disponivel ? r.itens.length : (r.travadas ?? 4), recolhida: recolhida(r) })),
  );

  const percorrido = (chave: string) => {
    const [slug, resto] = chave.split("#");
    const r = regioes.find((x) => x.slug === slug)!;
    if (resto === "trofeu") return Boolean(trofeus[slug]);
    const item = r.itens[Number(resto)];
    return item ? estadoDe(item) === "feito" : false;
  };

  // Balão aberto (uma casa ou troféu por vez).
  const [aberto, setAberto] = useState<string | null>(null);
  // O Next mantém a página montada e escondida ao navegar; ao esconder, os
  // efeitos são desfeitos. Fechar o balão aqui evita ele reaparecer na volta.
  useEffect(() => () => setAberto(null), []);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-mapa-casa], [data-mapa-balao]")) setAberto(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  // Posição do pino: anima da última casa vista até a atual.
  let posicaoAtual: { x: number; y: number } | null = null;
  for (const r of regioes) {
    const i = atual ? r.itens.findIndex((x) => x.slug === atual) : -1;
    const c = i >= 0 ? layout.casas.find((k) => k.regiao === r.slug && k.indice === i) : undefined;
    if (c) posicaoAtual = { x: c.x, y: c.y };
  }
  const atualX = posicaoAtual?.x;
  const atualY = posicaoAtual?.y;

  const [pino, setPino] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (atualX === undefined || atualY === undefined) return;
    let anterior: { x: number; y: number } | null = null;
    try {
      anterior = JSON.parse(sessionStorage.getItem(CHAVE_PINO) ?? "null");
    } catch {}
    const destino = { x: atualX, y: atualY };
    const id = requestAnimationFrame(() => {
      setPino(anterior ?? destino);
      requestAnimationFrame(() => setPino(destino));
    });
    try {
      sessionStorage.setItem(CHAVE_PINO, JSON.stringify(destino));
    } catch {}
    return () => cancelAnimationFrame(id);
  }, [atualX, atualY]);

  // Abre a página já na casa atual.
  const rolou = useRef(false);
  useEffect(() => {
    if (atualY === undefined || rolou.current) return;
    rolou.current = true;
    raiz.current
      ?.querySelector(`[data-mapa-atual="true"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [atualY]);

  return (
    <div ref={raiz} className="relative" style={{ width: LARGURA, height: layout.altura }} data-testid="mapa">
      <svg className="absolute inset-0" width={LARGURA} height={layout.altura} aria-hidden>
        {layout.trechos.map((t, i) => {
          const feito = percorrido(t.de) && percorrido(t.ate);
          return (
            <path
              key={i}
              d={t.d}
              fill="none"
              stroke={feito ? "var(--color-success)" : "var(--color-line)"}
              strokeWidth={feito ? 7 : 6}
              strokeLinecap="round"
              strokeDasharray={feito ? undefined : "2 12"}
            />
          );
        })}
      </svg>

      {/* Regiões (módulos) */}
      {layout.banners.map((b) => {
        const r = regioes.find((x) => x.slug === b.regiao)!;
        const feitos = r.itens.filter((i) => estadoDe(i) === "feito").length;
        const completa = concluida(r);
        return (
          <section
            key={b.regiao}
            className={`absolute left-0 z-10 w-full rounded-xl border px-4 py-3 ${
              r.disponivel ? "border-line bg-surface" : "border-dashed border-line bg-bg"
            }`}
            style={{ top: b.y, height: b.altura }}
            data-testid={`regiao-${r.slug}`}
            aria-label={`Módulo ${r.numero}: ${r.titulo}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">Módulo {r.numero}</span>
              {!r.disponivel ? (
                <span className="rounded-full bg-header px-2 py-0.5 text-[11px] font-semibold text-muted">Em breve</span>
              ) : completa ? (
                <button
                  type="button"
                  onClick={() =>
                    setAbertas((s) => {
                      const n = new Set(s);
                      if (n.has(r.slug)) n.delete(r.slug);
                      else n.add(r.slug);
                      return n;
                    })
                  }
                  className="text-xs font-semibold text-success underline-offset-2 hover:underline"
                >
                  {recolhida(r) ? "Ver casas" : "Recolher"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-muted">
                  {feitos}/{r.itens.length}
                </span>
              )}
            </div>
            <p className={`font-display text-lg font-bold ${r.disponivel ? "text-ink" : "text-muted"}`}>
              {r.titulo}
              {completa && <span className="ml-2 text-sm font-semibold text-success">Concluído ✓</span>}
            </p>
            <p className="truncate text-xs text-muted">{r.descricao}</p>
          </section>
        );
      })}

      {/* Casas (exercícios): por baixo do desenho, uma lista ordenada de verdade */}
      <ol aria-label="Mapa da trilha" className="pointer-events-none absolute inset-0 z-20 [&>li]:pointer-events-auto">
        {layout.casas.map((c) => {
          const r = regioes.find((x) => x.slug === c.regiao)!;
          const item = r.disponivel ? r.itens[c.indice] : undefined;
          const estado: Estado = item ? estadoDe(item) : "travado";
          const ehAtual = Boolean(item && item.slug === atual);
          const chave = chaveCasa(c.regiao, c.indice);
          const rotuloEstado = { feito: "feito", pulado: "pulado", pendente: ehAtual ? "atual" : "pendente", travado: "em breve" }[estado];
          const estilo = ehAtual
            ? "bg-accent text-ink ring-4 ring-accent/40 border-ink"
            : {
                feito: "bg-success text-white border-success",
                pulado: "bg-surface text-ink border-accent border-[3px]",
                pendente: "bg-surface text-ink border-line",
                travado: "bg-header text-zinc-400 border-line",
              }[estado];
          return (
            <li
              key={chave}
              className={`absolute ${aberto === chave ? "z-40" : "z-20"}`}
              style={{ left: c.x - TAMANHO_CASA / 2, top: c.y - TAMANHO_CASA / 2 }}
            >
              <button
                type="button"
                data-mapa-casa
                data-mapa-atual={ehAtual || undefined}
                data-testid={item ? `casa-${item.slug}` : undefined}
                aria-label={item ? `Exercício ${c.indice + 1}: ${item.titulo} (${rotuloEstado})` : `Módulo ${r.numero}: em breve`}
                aria-expanded={aberto === chave}
                onClick={() => setAberto(aberto === chave ? null : chave)}
                className={`grid place-items-center rounded-full border-2 font-display text-lg font-bold shadow-sm transition hover:scale-105 ${estilo} ${
                  aberto === chave ? "outline-4 outline-offset-2 outline-ink/25" : ""
                }`}
                style={{ width: TAMANHO_CASA, height: TAMANHO_CASA }}
              >
                {estado === "feito" && !ehAtual ? "✓" : estado === "travado" ? <Cadeado /> : c.indice + 1}
              </button>
              {aberto === chave && (
                <div
                  data-mapa-balao
                  role="dialog"
                  className="absolute top-1/2 z-40 w-60 -translate-y-1/2 rounded-xl border border-line bg-surface p-4 shadow-xl motion-safe:animate-pop"
                  style={{ left: LARGURA + BALAO_ESPACO - (c.x - TAMANHO_CASA / 2) }}
                >
                  {item ? (
                    <>
                      <p className="text-xs text-muted">
                        Exercício {c.indice + 1} · Nível {item.nivel} · ~{MINUTOS[item.nivel] ?? 3} min
                      </p>
                      <p className="my-1 font-semibold">{item.titulo}</p>
                      <p className="mb-3 text-xs text-muted">
                        {estado === "feito" ? "Feito ✓" : estado === "pulado" ? "Você pulou este" : ehAtual ? "É aqui que você está" : "Ainda não feito"}
                      </p>
                      <Link
                        href={`/exercicios/${item.slug}`}
                        onClick={() => setAberto(null)}
                        className="block rounded-lg bg-ink px-3 py-2 text-center text-sm font-semibold text-white hover:bg-ink-soft"
                      >
                        {estado === "feito" ? "Refazer" : ehAtual || estado === "pulado" ? "Continuar" : "Começar"}
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{r.titulo}</p>
                      <p className="mt-1 text-sm text-muted">Este módulo está a caminho. {r.descricao}</p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Troféus no fim de cada região */}
      {layout.trofeus.map((t) => {
        const r = regioes.find((x) => x.slug === t.regiao)!;
        const conquistado = trofeus[r.slug];
        const chave = chaveTrofeu(r.slug);
        return (
          <div
            key={chave}
            className={`absolute ${aberto === chave ? "z-40" : "z-20"}`}
            style={{ left: t.x - TAMANHO_TROFEU / 2, top: t.y - TAMANHO_TROFEU / 2 }}
          >
            <button
              type="button"
              data-mapa-casa
              data-testid={conquistado ? `trofeu-home-${r.slug}` : `trofeu-pendente-${r.slug}`}
              aria-label={`Troféu do módulo ${r.titulo}${conquistado ? " (conquistado)" : ""}`}
              onClick={() => setAberto(aberto === chave ? null : chave)}
              className={`grid place-items-center rounded-full border-2 bg-surface shadow-sm transition hover:scale-105 ${
                conquistado ? "border-accent" : "border-line"
              }`}
              style={{ width: TAMANHO_TROFEU, height: TAMANHO_TROFEU }}
            >
              <IconeConquista icone={r.icone} className={`h-12 w-12 ${conquistado ? "" : "opacity-35 grayscale"}`} />
            </button>
            {aberto === chave && (
              <div
                data-mapa-balao
                role="dialog"
                className="absolute top-1/2 z-40 w-56 -translate-y-1/2 rounded-xl border border-line bg-surface p-4 shadow-xl motion-safe:animate-pop"
                style={{ left: LARGURA + BALAO_ESPACO - (t.x - TAMANHO_TROFEU / 2) }}
              >
                <p className="font-semibold">Troféu: {r.titulo}</p>
                <p className="mt-1 text-sm text-muted">
                  {conquistado
                    ? `Conquistado em ${new Date(conquistado).toLocaleDateString("pt-BR")}.`
                    : r.disponivel
                      ? `Complete os ${r.itens.length} exercícios do módulo para ganhar.`
                      : "Disponível quando o módulo for lançado."}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Pino "você está aqui" */}
      {pino && (
        <div
          className="pointer-events-none absolute z-30 transition-[left,top] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: pino.x - 18, top: pino.y - TAMANHO_CASA / 2 - 46 }}
          data-testid="pino"
        >
          <Pino />
        </div>
      )}
    </div>
  );
}
