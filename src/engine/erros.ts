/**
 * Explicações curtas, para iniciantes, dos erros do Excel em pt-BR.
 * Usadas no feedback da correção e no aviso abaixo da barra de fórmulas.
 */
export const EXPLICACAO_ERRO: Record<string, string> = {
  "#DIV/0!": "divisão por zero: o divisor está vazio ou é 0",
  "#N/D": "o valor procurado não foi encontrado",
  "#NOME?": "o Excel não reconheceu um nome. Confira o nome da função e se os textos estão entre aspas",
  "#VALOR!": "um argumento tem o tipo errado, como um texto numa conta",
  "#REF!": "a fórmula aponta para uma célula que não existe",
  "#NÚM!": "um número não é válido para esta função",
  "#CALC!": "o cálculo não encontrou nenhum resultado, como um FILTRO sem nenhuma linha. Use o 3º argumento do FILTRO para mostrar uma mensagem",
  "#DESPEJAR!": "o resultado precisa de várias células, mas há algo preenchido no caminho. Libere as células abaixo ou à direita",
};

export function explicarErro(erro: string): string | undefined {
  return EXPLICACAO_ERRO[erro];
}

export function mensagemCircular(celulas: string[]): string {
  const lista = celulas.slice(0, 3).join(", ") + (celulas.length > 3 ? "…" : "");
  const primeira = celulas[0];
  return (
    `Referência circular em ${lista}: a fórmula usa o próprio resultado no cálculo ` +
    `(por exemplo, um intervalo que inclui ${primeira}). O Excel mostra 0 e um aviso. ` +
    `Ajuste a fórmula para não incluir ${primeira}.`
  );
}
