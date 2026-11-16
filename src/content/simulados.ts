/**
 * Simulados de teste de vaga (Pro): uma "planilha da empresa" com 8 tarefas,
 * tempo marcado e correção só no fim, como nos testes práticos de processo seletivo.
 *
 * As questões ficam fora de `exercicios` de propósito: não entram na trilha,
 * no sitemap nem viram páginas soltas.
 */
import basico from "./simulados/basico.json";
import intermediario from "./simulados/intermediario.json";
import avancado from "./simulados/avancado.json";
import { exercicioSchema, type Exercicio } from "./schema";

export type NivelSimulado = "basico" | "intermediario" | "avancado";

export type Simulado = {
  slug: NivelSimulado;
  titulo: string;
  cenario: string;
  descricao: string;
  temas: string[];
  minutos: number;
  /** Acertos mínimos para passar (70% de 8 = 6). */
  aprovacao: number;
  questoes: Exercicio[];
};

const ler = (lista: unknown[]) => lista.map((b) => exercicioSchema.parse(b)).sort((a, b) => a.ordem - b.ordem);

export const SIMULADOS: Simulado[] = [
  {
    slug: "basico",
    titulo: "Básico",
    cenario: "Planilha de vendas de uma loja",
    descricao: "O que cai em vagas de assistente e auxiliar administrativo.",
    temas: ["Operações e referências", "SOMA, MÉDIA, MÁXIMO, MÍNIMO", "$ (referência absoluta)", "SE", "Porcentagem", "Formatação", "Juntar textos"],
    minutos: 20,
    aprovacao: 6,
    questoes: ler(basico),
  },
  {
    slug: "intermediario",
    titulo: "Intermediário",
    cenario: "Cadastro de funcionários do RH",
    descricao: "O nível pedido para analistas, financeiro e RH.",
    temas: ["SOMASE, CONT.SE, MÉDIASE", "PROCV", "Reajuste com $", "SE com E", "SOMASES e CONT.SES"],
    minutos: 25,
    aprovacao: 6,
    questoes: ler(intermediario),
  },
  {
    slug: "avancado",
    titulo: "Avançado",
    cenario: "Controle de estoque e pedidos",
    descricao: "Para vagas que pedem \"Excel avançado\" no anúncio.",
    temas: ["PROCX", "ÍNDICE + CORRESP", "SEERRO", "SES", "SOMARPRODUTO", "CONT.SES", "Dias úteis", "ARRED"],
    minutos: 30,
    aprovacao: 6,
    questoes: ler(avancado),
  },
];

export const simuladoPorSlug = (slug: string) => SIMULADOS.find((s) => s.slug === slug);
