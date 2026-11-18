import type { Dinamica, ExercicioDoTipo, FuncaoValor, Grafico, Verificacao } from "@/content/schema";
import type { DadosGrafico } from "@/engine/grafico";
import { NOMES_FUNCAO } from "@/engine/dinamica";
import { CORES_DESTAQUE } from "@/engine/condicional";
import { deIntervalo, intervaloParaTexto, posicoes } from "@/engine/address";
import { Planilha } from "@/engine/engine";
import { falhou, iguais, ok, TOLERANCIA_PADRAO, type Falha, type Resultado } from "../tipos";

/**
 * Exercícios de ferramenta (classificar, filtrar…). Confere o RESULTADO na
 * planilha, não o caminho: classificar pelo menu do filtro ou pela barra Dados
 * dá no mesmo. Precisa da Planilha inteira (linhas ocultas, filtro), não só do
 * retrato da tela.
 */
export function validarFerramenta(ex: ExercicioDoTipo<"ferramenta">, p: Planilha): Resultado {
  // Só a primeira falha: as verificações costumam depender umas das outras
  // ("regiões em ordem" e "valores em ordem dentro da região"), e duas
  // mensagens juntas se contradizem.
  let inicial: Planilha | null = null;
  const estadoInicial = () => (inicial ??= Planilha.deExercicio(ex));
  for (const v of ex.verificacoes) {
    const f = conferir(v, p, estadoInicial);
    if (f) return falhou(v.mensagem ? { ...f, mensagem: v.mensagem } : f);
  }
  return ok();
}

/** Assinatura de uma linha do filtro: o texto das células travadas (dados do exercício), "*" nas editáveis. */
function assinaturaDaLinha(p: Planilha, linha: number, c0: number, c1: number): string {
  const partes: string[] = [];
  for (let coluna = c0; coluna <= c1; coluna++) {
    const pos = { linha, coluna };
    partes.push(p.bloqueada(pos) ? p.exibicao(pos) : "*");
  }
  return JSON.stringify(partes);
}

const contagem = (xs: string[]) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const mesmoMulticonjunto = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const ca = contagem(a);
  const cb = contagem(b);
  return [...ca].every(([k, n]) => cb.get(k) === n);
};

function conferir(v: Verificacao, p: Planilha, inicial: () => Planilha): Falha | null {
  switch (v.tipo) {
    case "valores": {
      const int = deIntervalo(v.intervalo);
      const obtidos = v.esperado.map((linha, dl) => linha.map((_, dc) => p.valor({ linha: int.inicio.linha + dl, coluna: int.inicio.coluna + dc })));
      const certo = v.esperado.every((linha, dl) => linha.every((esp, dc) => iguais(obtidos[dl][dc], esp, TOLERANCIA_PADRAO)));
      if (certo) return null;
      // "Ordem" só quando os valores certos estão lá, fora de ordem; senão, uma mensagem neutra.
      const casa = (o: (typeof obtidos)[number], linha: (typeof v.esperado)[number]) => linha.every((esp, dc) => iguais(o[dc], esp, TOLERANCIA_PADRAO));
      const foraDeOrdem = v.esperado.every((linha) => obtidos.some((o) => casa(o, linha))) && obtidos.every((o) => v.esperado.some((linha) => casa(o, linha)));
      return {
        celula: v.intervalo.split(":")[0],
        motivo: "valor",
        mensagem: foraDeOrdem ? `Os dados em ${v.intervalo} ainda não estão na ordem pedida.` : `Os valores em ${v.intervalo} não são os esperados.`,
      };
    }
    case "filtroAtivo": {
      const f = p.filtroAtual();
      if (!f) return { celula: v.intervalo?.split(":")[0] ?? "A1", motivo: "recurso", mensagem: "O filtro ainda não está ligado. Use o botão Filtro (Ctrl+Shift+L)." };
      if (v.intervalo && intervaloParaTexto(f.intervalo) !== intervaloParaTexto(deIntervalo(v.intervalo)))
        return { celula: v.intervalo.split(":")[0], motivo: "recurso", mensagem: `O filtro está em ${intervaloParaTexto(f.intervalo)}, mas a tabela é ${v.intervalo}.` };
      return null;
    }
    case "linhasVisiveis": {
      const f = p.filtroAtual();
      if (!f) return { celula: "A1", motivo: "recurso", mensagem: "Ligue o filtro primeiro (botão Filtro ou Ctrl+Shift+L)." };
      // Pelo CONTEÚDO das linhas, não pelo número: classificar antes de filtrar move as linhas.
      // `esperado` são as linhas no estado inicial do exercício.
      const { inicio, fim } = f.intervalo;
      const vistas = p.linhasVisiveis().map((l) => assinaturaDaLinha(p, l - 1, inicio.coluna, fim.coluna));
      const pedidas = v.esperado.map((l) => assinaturaDaLinha(inicial(), l - 1, inicio.coluna, fim.coluna));
      if (mesmoMulticonjunto(vistas, pedidas)) return null;
      const n = vistas.length;
      return {
        celula: intervaloParaTexto(f.intervalo).split(":")[0],
        motivo: "recurso",
        mensagem:
          n === pedidas.length
            ? `O filtro mostra ${n} ${n === 1 ? "linha" : "linhas"}, o número certo, mas não ${n === 1 ? "é a pedida" : "são as pedidas"}. Confira os critérios de cada coluna.`
            : `O filtro está mostrando ${n} ${n === 1 ? "linha" : "linhas"}, mas a resposta tem ${pedidas.length}. Confira os critérios de cada coluna.`,
      };
    }
    case "dinamica":
      return conferirDinamica(v, p);
    case "destacadas":
      return conferirDestacadas(v, p);
    case "grafico":
      return conferirGrafico(v, p);
    case "validacao":
      return conferirValidacao(v, p);
    case "semInvalidos": {
      const ruins = p.celulasInvalidas(deIntervalo(v.intervalo));
      if (ruins.length === 0) return null;
      return {
        celula: v.intervalo.split(":")[0],
        motivo: "valor",
        mensagem: `Ainda há ${ruins.length} ${ruins.length === 1 ? "valor que fura" : "valores que furam"} a validação em ${v.intervalo}. Use Circular Dados Inválidos para encontrá-${ruins.length === 1 ? "lo" : "los"}.`,
      };
    }
    case "formatoVisual": {
      const alvo = intervaloParaTexto(deIntervalo(v.intervalo));
      const tem = p.regrasCondicionais().some((r) => r.tipo === v.visual && intervaloParaTexto(deIntervalo(r.intervalo)) === alvo);
      if (tem) return null;
      const nome = v.visual === "barras" ? "Barras de Dados" : "Escala de Cor";
      const outro = p.regrasCondicionais().find((r) => r.tipo === v.visual);
      return {
        celula: v.intervalo.split(":")[0],
        motivo: "recurso",
        mensagem: outro
          ? `Há ${nome} em ${outro.intervalo}, mas a pergunta pede em ${v.intervalo}. Selecione só os números antes de aplicar.`
          : `Ainda não há ${nome} em ${v.intervalo}. Selecione os valores e use Formatação Condicional → ${nome}.`,
      };
    }
    case "celula": {
      const c = v.celula;
      const valor = p.valor(c);
      if (valor === null || valor === "") return { celula: c, motivo: "vazia", mensagem: `A célula ${c} ainda está vazia.` };
      if (typeof valor === "object") return { celula: c, motivo: "erro", mensagem: `A fórmula em ${c} retornou o erro ${valor.erro}.` };
      if (!p.temFormula(c)) return { celula: c, motivo: "sem-formula", mensagem: `Em ${c}, use uma fórmula (começando com =) em vez de digitar o valor.` };
      if (v.funcao && !p.funcoesUsadas(c).includes(v.funcao))
        return { celula: c, motivo: "funcao-faltando", mensagem: `Este exercício pede que você use a função ${v.funcao} em ${c}.` };
      if (!iguais(valor, v.esperado, v.tolerancia ?? TOLERANCIA_PADRAO))
        return { celula: c, motivo: "valor", mensagem: `O resultado em ${c} não está certo.` };
      return null;
    }
  }
}

type VerificacaoDinamica = Extract<Verificacao, { tipo: "dinamica" }>;

const lista = (xs: string[]) => (xs.length === 0 ? "nada" : xs.join(" e "));
const nomeFuncao = (f: FuncaoValor) => NOMES_FUNCAO[f].replace(".", "");

/**
 * Compara a configuração da tabela dinâmica com a pedida, por NOME de campo.
 * Configuração e resultado andam juntos (a saída é função dela), e assim a
 * mensagem diz o que mudar: "Região deveria estar em Linhas".
 */
function conferirDinamica(v: VerificacaoDinamica, p: Planilha): Falha | null {
  const tabelas = p.tabelasDinamicas();
  if (tabelas.length === 0)
    return { celula: "A1", motivo: "recurso", mensagem: "Ainda não há tabela dinâmica. Use o botão Tabela dinâmica com uma célula da tabela selecionada." };
  const falhas = tabelas.map((t, i) => diferenca(v, t.config, p, i, t.erro));
  const certa = falhas.findIndex((f) => f === null);
  if (certa >= 0) return null;
  const destino = tabelas[0].config.destino;
  return { celula: destino, motivo: "recurso", mensagem: falhas[0]! };
}

function diferenca(v: VerificacaoDinamica, d: Dinamica, p: Planilha, i: number, erro: string | null): string | null {
  if (erro) return erro;
  if (normalizar(d.origem) !== normalizar(v.origem))
    return `A tabela dinâmica usa ${d.origem} como origem, mas os dados estão em ${v.origem}. Remova e insira de novo com a tabela inteira selecionada.`;
  const nome = Object.fromEntries(p.camposDaDinamica(i).map((c) => [c.letra, c.nome]));
  const nomes = (letras: string[]) => letras.map((l) => nome[l] ?? l);

  for (const [area, pedido, tem] of [
    ["Linhas", v.linhas, nomes(d.linhas)],
    ["Colunas", v.colunas, nomes(d.colunas)],
  ] as const) {
    if (pedido.join("|") === tem.join("|")) continue;
    if (pedido.length === 0) return `Tire ${lista(tem)} de ${area}: a pergunta não pede essa divisão.`;
    if (tem.length === 0) return `Falta um campo em ${area}: o que deve aparecer ${area === "Linhas" ? "nas linhas" : "nas colunas"} da tabela?`;
    return `Em ${area} está ${lista(tem)}, mas não é esse o campo que a pergunta pede ${area === "Linhas" ? "nas linhas" : "nas colunas"}.`;
  }

  const tem = d.valores.map((x) => ({ campo: nome[x.campo] ?? x.campo, funcao: x.funcao }));
  if (tem.length === 0 && v.valores.length) return "Falta um campo em Valores: é ele que a tabela soma (ou conta).";
  const sobra = [...tem];
  for (const pedido of v.valores) {
    const j = sobra.findIndex((x) => x.funcao === pedido.funcao && (!pedido.campo || x.campo === pedido.campo));
    if (j >= 0) {
      sobra.splice(j, 1);
      continue;
    }
    const mesmoCampo = sobra.find((x) => pedido.campo && x.campo === pedido.campo);
    if (mesmoCampo)
      return `Os valores estão como “${nomeFuncao(mesmoCampo.funcao)} de ${mesmoCampo.campo}”. Releia a pergunta: a conta é outra. Troque no seletor ao lado do campo, em Valores (Soma, Contagem, Média…).`;
    return "Os campos em Valores não respondem à pergunta. Confira qual campo e qual conta (Soma, Contagem, Média…) ela pede.";
  }
  if (sobra.length) return `Sobrou ${sobra.map((x) => `“${nomeFuncao(x.funcao)} de ${x.campo}”`).join(" e ")} em Valores: a pergunta não pede isso.`;

  // Filtros: (Tudo) e "todos os itens marcados" são a mesma coisa.
  const filtros = (fs: { campo: string; valores: string[] | null }[], porNome: boolean) =>
    fs
      .map((f) => {
        const letra = porNome ? Object.keys(nome).find((l) => nome[l] === f.campo) : f.campo;
        const todos = letra ? p.itensDoCampo(i, letra) : [];
        const marcados = f.valores === null || todos.every((t) => f.valores!.includes(t)) ? null : [...f.valores].sort();
        return { campo: porNome ? f.campo : (nome[f.campo] ?? f.campo), marcados };
      });
  // Um filtro "(Tudo)" pedido também precisa do campo em Filtros; um "(Tudo)" a mais não esconde nada.
  const pedidos = filtros(v.filtros, true);
  const aplicados = filtros(d.filtros, false);
  for (const f of pedidos) {
    const a = aplicados.find((x) => x.campo === f.campo);
    if (!a) return `Coloque ${f.campo} em Filtros e escolha os itens pedidos.`;
    if (JSON.stringify(a.marcados) !== JSON.stringify(f.marcados)) return `O filtro de ${f.campo} não está com os itens que a pergunta pede.`;
  }
  const extra = aplicados.find((a) => a.marcados !== null && !pedidos.some((f) => f.campo === a.campo));
  if (extra) return `O filtro de ${extra.campo} está escondendo dados que a pergunta quer ver.`;
  return null;
}

const normalizar = (t: string) => intervaloParaTexto(deIntervalo(t));

/**
 * Formatação condicional pelo resultado: quais células ficaram destacadas.
 * "Maior do que 999,99", "Entre 1000 e 9999" e a fórmula `>=1000` dão o
 * mesmo conjunto, e todas acertam. A mensagem conta, sem entregar quais são.
 */
function conferirDestacadas(v: Extract<Verificacao, { tipo: "destacadas" }>, p: Planilha): Falha | null {
  const int = deIntervalo(v.intervalo);
  const celula = v.intervalo.split(":")[0];
  const todas = new Set(p.destacadas(int));
  const certas = new Set(v.esperado);
  const iguais = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
  if (iguais(todas, certas)) {
    if (!v.estilo) return null;
    const naCor = new Set(p.destacadas(int, v.estilo));
    if (iguais(naCor, certas)) return null;
    return { celula, motivo: "formato", mensagem: `As células certas estão destacadas, mas com outra cor. A pergunta pede ${CORES_DESTAQUE[v.estilo].nome.toLowerCase()}.` };
  }
  if (todas.size === 0)
    return { celula, motivo: "formato", mensagem: `Nenhuma célula de ${v.intervalo} está destacada ainda. Selecione o intervalo e use Formatação Condicional.` };
  const sobram = [...todas].filter((x) => !certas.has(x)).length;
  const faltam = [...certas].filter((x) => !todas.has(x)).length;
  const partes = [
    sobram ? `${sobram} ${sobram === 1 ? "célula destacada que não deveria" : "células destacadas que não deveriam"}` : "",
    faltam ? `${faltam} ${faltam === 1 ? "célula que deveria estar destacada e não está" : "células que deveriam estar destacadas e não estão"}` : "",
  ].filter(Boolean);
  return { celula, motivo: "formato", mensagem: `Quase: há ${partes.join(" e ")}. Confira a regra (o valor, o tipo de comparação e o intervalo).` };
}

const NOME_GRAFICO = { colunas: "colunas", barras: "barras", linhas: "linhas", pizza: "pizza" } as const;

/**
 * Gráfico pelo resultado: as categorias e as séries que ele desenha. Quem
 * selecionou o intervalo de outro jeito, mas chegou no mesmo gráfico, acerta.
 */
function conferirGrafico(v: Extract<Verificacao, { tipo: "grafico" }>, p: Planilha): Falha | null {
  const lista = p.graficos();
  if (lista.length === 0)
    return { celula: "A1", motivo: "recurso", mensagem: "Ainda não há gráfico. Selecione os dados e use Inserir Gráfico." };
  const diffs = lista.map((g, i) => diferencaGrafico(v, g, p.dadosDoGrafico(i)));
  if (diffs.some((d) => d === null)) return null;
  return { celula: lista[0].posicao, motivo: "recurso", mensagem: diffs[0]! };
}

function diferencaGrafico(v: Extract<Verificacao, { tipo: "grafico" }>, g: Grafico, d: DadosGrafico): string | null {
  const norm = (t: string) => t.trim().toUpperCase();
  const mesmas = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => norm(x) === norm(b[i]));
  const numeros = (a: (number | null)[], b: (number | null)[]) =>
    a.length === b.length && a.every((x, i) => (x === null ? b[i] === null : b[i] !== null && Math.abs(x - b[i]!) < 1e-9));
  const series = v.grafico === "pizza" ? v.series.slice(0, 1) : v.series;
  const delas = v.grafico === "pizza" ? d.series.slice(0, 1) : d.series;
  const dadosCertos =
    mesmas(d.categorias, v.categorias) &&
    delas.length === series.length &&
    series.every((s, i) => numeros(delas[i].valores, s.valores) && (v.grafico === "pizza" || norm(delas[i].nome) === norm(s.nome)));
  if (!dadosCertos) {
    if (mesmas(d.categorias, series.map((s) => s.nome)) && v.categorias.length > 0)
      return "As séries e as categorias estão trocadas. Use Alternar Linha/Coluna no Design do Gráfico.";
    if (d.categorias.length === v.categorias.length + 1)
      return "O gráfico tem uma categoria a mais. Confira o intervalo de dados: tem alguma linha que não deveria entrar?";
    // Categorias viraram 1, 2, 3… e apareceu uma série a mais: a coluna de rótulos (anos) foi lida como números.
    const numeradas = d.categorias.length > 0 && d.categorias.every((c, i) => c === String(i + 1));
    if (numeradas && d.series.length > series.length)
      return "Uma coluna de rótulos virou série no gráfico. Confira como o Excel lê a primeira coluna.";
    return "O gráfico não está mostrando os dados pedidos. Confira o intervalo de dados (com o cabeçalho e os rótulos).";
  }
  if (g.tipo !== v.grafico)
    return `Os dados estão certos, mas um gráfico de ${NOME_GRAFICO[g.tipo]} não é o melhor para esta pergunta. Pense no que ela quer mostrar: comparação, evolução no tempo ou partes de um todo.`;
  if (v.titulo !== undefined && norm(g.titulo) !== norm(v.titulo))
    return g.titulo.trim() ? `O título do gráfico está diferente do pedido.` : "Falta o título do gráfico (no Design do Gráfico).";
  if (v.rotulos !== undefined && g.rotulos !== v.rotulos)
    return v.rotulos ? "Falta mostrar os rótulos de dados (os valores em cima de cada barra ou fatia)." : "Tire os rótulos de dados: a pergunta não pede.";
  return null;
}

/**
 * Validação de dados pelo comportamento, em cada célula do intervalo: aceita
 * o que deve aceitar e recusa o que deve recusar. "Inteiro entre 1 e 100" e
 * "Inteiro maior ou igual a 1 e menor ou igual a 100" dão o mesmo resultado.
 */
function conferirValidacao(v: Extract<Verificacao, { tipo: "validacao" }>, p: Planilha): Falha | null {
  const celulas = [...posicoes(deIntervalo(v.intervalo))];
  const celula = v.intervalo.split(":")[0];
  const falha = (mensagem: string): Falha => ({ celula, motivo: "recurso", mensagem });
  const sem = celulas.filter((c) => !p.validacaoEm(c));
  if (sem.length === celulas.length) return falha(`Ainda não há validação em ${v.intervalo}. Selecione o intervalo e use Validação de Dados.`);
  if (sem.length) return falha(`A validação não cobre todo o intervalo ${v.intervalo}: ${sem.length} ${sem.length === 1 ? "célula ficou" : "células ficaram"} de fora.`);

  if (v.lista) {
    const norm = (xs: string[]) => xs.map((x) => x.trim().toUpperCase());
    for (const c of celulas) {
      const itens = p.itensDaLista(c);
      if (!itens) return falha("A pergunta pede uma lista suspensa: em Permitir, escolha Lista.");
      if (norm(itens).join("|") !== norm(v.lista).join("|")) {
        if (itens.length === 1 && /[,]/.test(itens[0]))
          return falha(`A lista ficou com um item só: “${itens[0]}”. No Excel em português, os itens são separados por ponto e vírgula.`);
        return falha(`A lista mostra ${itens.length} ${itens.length === 1 ? "item" : "itens"}, mas não são os pedidos. Confira a Fonte.`);
      }
    }
  }
  for (const c of celulas) {
    const recusou = v.aceita.find((x) => !p.aceitariaNaCelula(c, x));
    if (recusou !== undefined) return falha(`A regra recusa “${recusou}”, que deveria ser aceito. Confira o tipo (inteiro ou decimal) e se os limites incluem as pontas.`);
    const aceitou = v.recusa.find((x) => p.aceitariaNaCelula(c, x));
    if (aceitou !== undefined) return falha(`A regra aceita “${aceitou}”, que deveria ser recusado. Confira o tipo e os limites.`);
  }
  // Mensagens em todas as células: quem aplicou só numa parte do intervalo não passa.
  const igual = (a: string | undefined, b: string) => (a ?? "").trim().toUpperCase() === b.trim().toUpperCase();
  const parte = (n: number) => (n < celulas.length ? ` (em ${celulas.length - n} de ${celulas.length} células)` : "");
  const conta = (ok: (r: NonNullable<ReturnType<Planilha["validacaoEm"]>>) => boolean) => celulas.filter((c) => ok(p.validacaoEm(c)!)).length;
  if (v.mensagemEntrada !== undefined) {
    const n = conta((r) => igual(r.entrada?.texto, v.mensagemEntrada!));
    if (n < celulas.length) return falha(`Falta a mensagem de entrada pedida (aba Mensagem de entrada)${n ? parte(n) : ""}.`);
  }
  if (v.alertaTitulo !== undefined) {
    const n = conta((r) => igual(r.erro?.titulo, v.alertaTitulo!));
    if (n < celulas.length) return falha(`O título do alerta de erro não é o pedido (aba Alerta de erro)${n ? parte(n) : ""}.`);
  }
  if (v.alertaTexto !== undefined) {
    const n = conta((r) => igual(r.erro?.texto, v.alertaTexto!));
    if (n < celulas.length) return falha(`O texto do alerta de erro não é o pedido (aba Alerta de erro)${n ? parte(n) : ""}.`);
  }
  return null;
}
