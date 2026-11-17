import type { Dinamica, ExercicioDoTipo, FuncaoValor, Verificacao } from "@/content/schema";
import { NOMES_FUNCAO } from "@/engine/dinamica";
import { deIntervalo, intervaloParaTexto } from "@/engine/address";
import type { Planilha } from "@/engine/engine";
import { falhou, iguais, ok, TOLERANCIA_PADRAO, type Falha, type Resultado } from "../tipos";

/**
 * Exercícios de ferramenta (classificar, filtrar…). Confere o RESULTADO na
 * planilha, não o caminho: classificar pelo menu do filtro ou pela barra Dados
 * dá no mesmo. Precisa da Planilha inteira (linhas ocultas, filtro), não só do
 * retrato da tela.
 */
export function validarFerramenta(ex: ExercicioDoTipo<"ferramenta">, p: Planilha): Resultado {
  const falhas: Falha[] = [];
  for (const v of ex.verificacoes) {
    const f = conferir(v, p);
    if (f) falhas.push(v.mensagem ? { ...f, mensagem: v.mensagem } : f);
  }
  return falhas.length ? falhou(...falhas) : ok();
}

function conferir(v: Verificacao, p: Planilha): Falha | null {
  switch (v.tipo) {
    case "valores": {
      const int = deIntervalo(v.intervalo);
      const certo = v.esperado.every((linha, dl) =>
        linha.every((esp, dc) =>
          iguais(p.valor({ linha: int.inicio.linha + dl, coluna: int.inicio.coluna + dc }), esp, TOLERANCIA_PADRAO),
        ),
      );
      return certo
        ? null
        : { celula: v.intervalo.split(":")[0], motivo: "valor", mensagem: `Os dados em ${v.intervalo} ainda não estão na ordem pedida.` };
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
      const vistas = p.linhasVisiveis();
      const certo = vistas.length === v.esperado.length && v.esperado.every((l) => vistas.includes(l));
      if (certo) return null;
      const n = vistas.length;
      return {
        celula: intervaloParaTexto(f.intervalo).split(":")[0],
        motivo: "recurso",
        mensagem: `O filtro está mostrando ${n} ${n === 1 ? "linha" : "linhas"}, mas a resposta tem ${v.esperado.length}. Confira os critérios de cada coluna.`,
      };
    }
    case "dinamica":
      return conferirDinamica(v, p);
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
      return `Os valores estão como “${nomeFuncao(mesmoCampo.funcao)} de ${mesmoCampo.campo}”. Releia a pergunta: a conta é outra. Mude em Configurações do Campo de Valor.`;
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
      })
      .filter((f) => f.marcados !== null || porNome);
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
