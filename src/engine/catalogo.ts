/**
 * Funções que o simulador sugere ao digitar, com a assinatura como o Excel
 * em português mostra. Argumentos entre colchetes são opcionais; `...` no
 * último indica que ele se repete. Um teste garante que todas existem no motor.
 */
export type FuncaoCatalogo = { nome: string; args: string[]; desc: string };

const f = (nome: string, args: string, desc: string): FuncaoCatalogo => ({
  nome,
  args: args ? args.split("; ") : [],
  desc,
});

export const CATALOGO: FuncaoCatalogo[] = [
  // fundamentos
  f("SOMA", "núm1; [núm2]; ...", "Soma os números de um ou mais intervalos."),
  f("MÉDIA", "núm1; [núm2]; ...", "Média aritmética dos números."),
  f("MÍNIMO", "núm1; [núm2]; ...", "Menor valor."),
  f("MÁXIMO", "núm1; [núm2]; ...", "Maior valor."),
  f("CONT.NÚM", "valor1; [valor2]; ...", "Conta as células com números."),
  f("CONT.VALORES", "valor1; [valor2]; ...", "Conta as células que não estão vazias."),
  f("CONTAR.VAZIO", "intervalo", "Conta as células vazias."),
  f("ARRED", "núm; núm_dígitos", "Arredonda para o número de casas indicado."),
  f("ARREDONDAR.PARA.CIMA", "núm; núm_dígitos", "Arredonda sempre para cima."),
  f("ARREDONDAR.PARA.BAIXO", "núm; núm_dígitos", "Arredonda sempre para baixo."),
  f("TRUNCAR", "núm; [núm_dígitos]", "Corta as casas decimais sem arredondar."),
  f("INT", "núm", "Arredonda para baixo até o inteiro."),
  f("ABS", "núm", "Valor absoluto (sem sinal)."),
  f("MOD", "núm; divisor", "Resto da divisão."),
  f("POTÊNCIA", "núm; potência", "Eleva um número a uma potência."),
  f("RAIZ", "núm", "Raiz quadrada."),
  f("MAIOR", "matriz; k", "O k-ésimo maior valor."),
  f("MENOR", "matriz; k", "O k-ésimo menor valor."),
  f("MED", "núm1; [núm2]; ...", "Mediana: o valor do meio."),
  // lógica
  f("SE", "teste_lógico; [valor_se_verdadeiro]; [valor_se_falso]", "Devolve um valor se o teste for verdadeiro e outro se for falso."),
  f("SES", "teste_lógico1; valor_se_verdadeiro1; ...", "Testa várias condições em ordem e devolve o valor da primeira verdadeira."),
  f("E", "lógico1; [lógico2]; ...", "VERDADEIRO se todas as condições forem verdadeiras."),
  f("OU", "lógico1; [lógico2]; ...", "VERDADEIRO se pelo menos uma condição for verdadeira."),
  f("NÃO", "lógico", "Inverte VERDADEIRO e FALSO."),
  f("SEERRO", "valor; valor_se_erro", "Troca um erro (#N/D, #DIV/0!…) por outro valor."),
  f("SENÃODISP", "valor; valor_se_nd", "Troca só o erro #N/D por outro valor."),
  f("ÉERROS", "valor", "VERDADEIRO se o valor for um erro."),
  f("ÉCÉL.VAZIA", "valor", "VERDADEIRO se a célula estiver vazia."),
  f("ÉNÚM", "valor", "VERDADEIRO se o valor for um número."),
  f("ÉTEXTO", "valor", "VERDADEIRO se o valor for texto."),
  // condicionais
  f("CONT.SE", "intervalo; critério", "Conta as células que atendem a um critério."),
  f("CONT.SES", "intervalo_critérios1; critério1; ...", "Conta as linhas que atendem a todos os critérios."),
  f("SOMASE", "intervalo; critério; [intervalo_soma]", "Soma os valores das linhas que atendem a um critério."),
  f("SOMASES", "intervalo_soma; intervalo_critérios1; critério1; ...", "Soma os valores das linhas que atendem a todos os critérios."),
  f("MÉDIASE", "intervalo; critério; [intervalo_média]", "Média dos valores das linhas que atendem a um critério."),
  f("MÁXIMOSES", "intervalo_máximo; intervalo_critérios1; critério1; ...", "Maior valor entre as linhas que atendem aos critérios."),
  f("MÍNIMOSES", "intervalo_mínimo; intervalo_critérios1; critério1; ...", "Menor valor entre as linhas que atendem aos critérios."),
  f("SOMARPRODUTO", "matriz1; [matriz2]; ...", "Multiplica as matrizes item a item e soma os resultados."),
  // busca
  f("PROCV", "valor_procurado; matriz_tabela; núm_índice_coluna; [procurar_intervalo]", "Procura um valor na primeira coluna e devolve o de outra coluna da mesma linha."),
  f("PROCH", "valor_procurado; matriz_tabela; núm_índice_lin; [procurar_intervalo]", "Procura um valor na primeira linha e devolve o de outra linha da mesma coluna."),
  f("PROCX", "pesquisa_valor; pesquisa_matriz; matriz_retorno; [se_não_encontrada]; [modo_correspondência]; [modo_pesquisa]", "Procura um valor numa coluna e devolve o da mesma posição em outra."),
  f("ÍNDICE", "matriz; núm_linha; [núm_coluna]", "Valor na posição indicada de um intervalo."),
  f("CORRESP", "valor_procurado; matriz_procurada; [tipo_correspondência]", "Posição de um valor numa lista."),
  f("ESCOLHER", "núm_índice; valor1; [valor2]; ...", "Escolhe um valor da lista pela posição."),
  f("DESLOC", "ref; lins; cols; [altura]; [largura]", "Referência deslocada a partir de uma célula."),
  // texto
  f("CONCAT", "texto1; [texto2]; ...", "Junta textos."),
  f("CONCATENAR", "texto1; [texto2]; ...", "Junta textos (versão antiga do CONCAT)."),
  f("ESQUERDA", "texto; [núm_caract]", "Primeiros caracteres de um texto."),
  f("DIREITA", "texto; [núm_caract]", "Últimos caracteres de um texto."),
  f("EXT.TEXTO", "texto; núm_inicial; núm_caract", "Pedaço do meio de um texto."),
  f("NÚM.CARACT", "texto", "Quantidade de caracteres."),
  f("ARRUMAR", "texto", "Remove espaços sobrando."),
  f("MAIÚSCULA", "texto", "Converte para maiúsculas."),
  f("MINÚSCULA", "texto", "Converte para minúsculas."),
  f("PRI.MAIÚSCULA", "texto", "Primeira letra de cada palavra em maiúscula."),
  f("LOCALIZAR", "texto_procurado; no_texto; [núm_inicial]", "Posição de um texto dentro de outro (sem diferenciar maiúsculas)."),
  f("PROCURAR", "texto_procurado; no_texto; [núm_inicial]", "Posição de um texto dentro de outro (diferencia maiúsculas)."),
  f("SUBSTITUIR", "texto; texto_antigo; novo_texto; [núm_da_ocorrência]", "Troca um trecho do texto por outro."),
  f("TEXTO", "valor; formato_texto", "Formata um número como texto."),
  f("VALOR", "texto", "Converte texto em número."),
  f("REPT", "texto; número_vezes", "Repete um texto."),
  // datas
  f("HOJE", "", "Data de hoje."),
  f("AGORA", "", "Data e hora atuais."),
  f("DATA", "ano; mês; dia", "Monta uma data."),
  f("ANO", "núm_série", "Ano de uma data."),
  f("MÊS", "núm_série", "Mês de uma data (1 a 12)."),
  f("DIA", "núm_série", "Dia de uma data."),
  f("DIA.DA.SEMANA", "núm_série; [retornar_tipo]", "Dia da semana em número. Com tipo 2, segunda = 1."),
  f("DATADIF", "data_inicial; data_final; unidade", "Diferença entre datas em anos (\"Y\"), meses (\"M\") ou dias (\"D\")."),
  f("DIATRABALHOTOTAL", "data_inicial; data_final; [feriados]", "Dias úteis entre duas datas."),
  f("DIATRABALHO", "data_inicial; dias; [feriados]", "Data depois de um número de dias úteis."),
  f("FIMMÊS", "data_inicial; meses", "Último dia do mês, andando o número de meses indicado."),
  f("DATAM", "data_inicial; meses", "Mesma data, andando o número de meses indicado."),
  // arrays dinâmicos
  f("FILTRO", "matriz; incluir; [se_vazia]", "Linhas que atendem a uma condição."),
  f("CLASSIFICAR", "matriz; [índice_classificação]; [ordem_classificação]; [por_col]", "Ordena um intervalo."),
  f("ÚNICO", "matriz; [por_col]; [exatamente_uma_vez]", "Lista sem repetições."),
  f("SEQUÊNCIA", "linhas; [colunas]; [início]; [etapa]", "Lista de números em sequência."),
  // finanças
  f("PGTO", "taxa; nper; vp; [vf]; [tipo]", "Valor da parcela de um financiamento."),
];

const porNome = new Map(CATALOGO.map((x) => [x.nome, x]));
export const funcaoDoCatalogo = (nome: string) => porNome.get(nome.toUpperCase());
