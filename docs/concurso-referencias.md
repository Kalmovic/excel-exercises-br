# Referências de concurso — documento interno de pesquisa

## Situação desta versão

Esta é uma versão de trabalho, não uma lista de 95 referências confirmadas. Mantém o documento recebido, acrescenta fontes localizadas e oferece termos de busca para os campos ainda vazios. **Busca sugerida não é questão encontrada nem referência de prova.** A pesquisa individual das 86 lacunas não está concluída.

No site, usar somente `Banca · Órgão · Cargo · Ano`, quando houver correspondência confirmada. Aqui, guardar URL, identificador, trecho localizável e observações. Não alterar o site automaticamente com base neste documento.

Nenhuma correspondência com o enunciado completo do exercício do site foi certificada nesta versão; os títulos e temas do documento não bastam para essa certificação. As fontes abaixo são bancos de questões de terceiros, não cadernos oficiais da banca.

## Fontes abertas e observações (25/11/2026)

| Exercício | Identificação encontrada | Fonte e maneira de encontrar | Situação |
|---|---|---|---|
| Três contagens na mesma fórmula | FCC · ARTESP · Agente de Fiscalização à Regulação de Transportes · 2017 | [Magna Concursos](https://www.magnaconcursos.com/questoes/concursos/artesp-fcc-2017/agente-fiscalizacao-regulacao-transportes). Buscar na página `CONT.NÚM(C2:C5)`; registro 611251. | Fonte localizada; cobra CONT.NÚM e CONT.VALORES. Não comprova três contagens combinadas na mesma fórmula. Não marcar como conferida. |
| Contar notas | Cesgranrio · Banco do Brasil · Escriturário (Agente Comercial) · 2023 · questão 41 | [Enunciado](https://www.questoes.indagacao.com/2023/05/sejam-os-seguintes-dados-de-uma.html). Buscar `CONT.SE(B2:B6` e `<=R$ 10,00`. | Cobra resultado de CONT.SE sobre valores monetários. Candidata para comparação com o exercício, não certificada. |
| Segundo maior valor | Vunesp · Câmara de Serrana · Técnico Legislativo · 2019 | [Gran, registro 1040147](https://questoes.grancursosonline.com.br/questoes-de-concursos/informatica-405030/1040147). Buscar `MAIOR(A1:A6;3)`. | A real pede o terceiro maior. Mesma função e tipo geral de cálculo, com posição diferente; avaliar se o selo aceita essa diferença. |
| SEERRO na divisão | Vunesp · Câmara de Campinas · Analista Legislativo — Assessoramento Jurídico · 2024 | [OpenGabarito, Q5315589](https://opengabarito.com.br/questoes/5315589). Buscar `SEERRO(A1/B1;1)`. | Fonte aberta: divisão, tratamento do erro e cópia C1:C5. Cargo detalhado localizado; falta comparar com o enunciado completo do site. |
| DIA.DA.SEMANA com o tipo 2 | Vunesp · TJ-SP · Oficial de Justiça · 2024 | [QConcursos Q3253626](https://www.qconcursos.com/questoes-de-concursos/questoes/e7a72cf6-05). Buscar `DIATRABALHOTOTAL(B1;B7;B5:B6)`. | Não usar esta questão como prova de cobrança do tipo 2. DIA.DA.SEMANA aparece sem segundo argumento; a pergunta final cobra DIATRABALHOTOTAL. |
| Buscar na tabela dinâmica | FGV · PC-RN · Agente e Escrivão de Polícia Civil Substituto · 2021 · questão 32 | [Enunciado](https://www.quizinho.com.br/questao/fgv-pc-rn-2021-agente-e-escrivao-de-policia-civil-substituto-2021-q32). Buscar `PROCV(A11;F6:G8;2;0)`. | Cobra busca exata numa lista comum, sem tabela dinâmica. Não confirma particularidades de tabela dinâmica. Também é candidata para PROCV exato (concurso-20), dependendo do enunciado. |
| Atualizar e a origem | Cebraspe · ANP · Regulador de Novas Atribuições III — Cargo 6 · 2022 | [QConcursos Q1988258](https://www.qconcursos.com/questoes-de-concursos/questoes/f3ed4dc2-6c). Buscar `fontes externas não precisam ser atualizadas`. | Fonte aberta confirma item sobre necessidade de atualização de tabelas dinâmicas de fontes externas. Falta comparar o alcance da afirmação com o exercício do site. |
| ÍNDICE com CORRESP (nova candidata) | FGV · PMESP · Soldado PM 2ª Classe · 2024 · questão 50, segundo o catálogo consultado | [Semper Concursos, registro 7473](https://semperconcursos.com.br/questao/7473-informatica-pmesp-2024). Buscar `ÍNDICE(A2:A4;CORRESP(MÁXIMO(D2:D4);D2:D4;0))`. | Combina ÍNDICE, CORRESP e MÁXIMO para retornar nome do produto. Identificação ainda precisa de confirmação em caderno oficial; não publicar como confirmada. |

### Referências antigas ainda sem confirmação independente

- Ordem das operações: conservar a pista original FCC/TRT 21ª Região/2003, mas não certificá-la. Busca: `FCC TRT 21 2003 Analista Judiciário Excel ordem operações 578608`.
- Referência absoluta na cópia: conservar a pista Cesgranrio/Petrobras Distribuidora/2015, mas não certificá-la. Busca: `Cesgranrio Petrobras Distribuidora 2015 Técnico Administração Controle Júnior Excel referência absoluta 601011`.
- Os links originais abaixo foram preservados para rastreabilidade, não tratados como páginas verificadas. Quando uma fonte alternativa foi aberta, ela está identificada na tabela acima.

## Documento original com rotas de pesquisa nas lacunas

# Referências de prova real das questões de concurso

Cada questão de concurso do site é **inédita, no estilo da banca**. Quando uma prova real cobrou a mesma coisa do mesmo jeito,
a questão ganha o selo **"Caiu muito parecido em …"** (campo `referencia` no conteúdo).

## Como usar este arquivo

1. **A conferir:** as referências que já estão no site vieram só dos resultados de busca (ningém abriu a página). Abra o link,
   confira banca, órgão, cargo, ano e se a questão cobra a mesma coisa. Marque `[x]` em "Conferida" ou escreva o problema.
2. **Sem referência:** se achar uma questão real parecida, preencha a coluna "Referência" no formato
   `Banca · Órgão · Cargo · Ano · link`.
3. Depois é só pedir: "atualize as referências pelo docs/concurso-referencias.md". Eu passo para o conteúdo, tiro o que
   não foi confirmado e rodo os testes.

Regra: só entra o que for **da mesma banca** e cobrar **a mesma coisa** (mesma função e mesmo tipo de pergunta).

**Total:** 95 questões (FCC 19, Cesgranrio 19, Vunesp 19, FGV 19, Cebraspe 19). Com referência: 9. Sem: 86.

## A conferir (já aparecem no site)

| Conferida | Questão no site | Banca | Tema | Referência atual | Link |
|---|---|---|---|---|---|
| [ ] | [Ordem das operações](https://planilhes.com.br/concurso/concurso-01-ordem-das-operacoes) | FCC | Operadores | FCC · TRT 21ª Região · Analista Judiciário · 2003 | [abrir](https://www.tecconcursos.com.br/questoes/578608) |
| [ ] | [Três contagens na mesma fórmula](https://planilhes.com.br/concurso/concurso-02-tres-contagens-na-mesma-formula) | FCC | Funções de contagem | FCC · ARTESP · 2017 | [abrir](https://www.qconcursos.com/questoes-de-concursos/questoes/cb35b221-b0) |
| [ ] | [Referência absoluta na cópia](https://planilhes.com.br/concurso/concurso-07-referencia-absoluta-na-copia) | Cesgranrio | Referências | Cesgranrio · Petrobras Distribuidora · Técnico de Administração e Controle Júnior · 2015 | [abrir](https://www.tecconcursos.com.br/questoes/601011) |
| [ ] | [Contar notas](https://planilhes.com.br/concurso/concurso-09-contar-notas) | Cesgranrio | CONT.SE | Cesgranrio · Banco do Brasil · Escriturário (Agente Comercial) · 2023 | [abrir](https://www.qconcursos.com/questoes-de-concursos/questoes/8264e086-e2) |
| [ ] | [Segundo maior valor](https://planilhes.com.br/concurso/concurso-17-segundo-maior-valor) | Vunesp | MAIOR | Vunesp · Câmara Municipal de Serrana (SP) · Técnico Legislativo · 2019 | [abrir](https://olhonavaga.com.br/questoes/questoes?id=897109&tc=1) |
| [ ] | [SEERRO na divisão](https://planilhes.com.br/concurso/concurso-18-seerro-na-divisao) | Vunesp | SEERRO | Vunesp · Câmara Municipal de Campinas · Analista Legislativo · 2024 | [abrir](https://www.tecconcursos.com.br/questoes/2894525) |
| [ ] | [Concurso: DIA.DA.SEMANA com o tipo 2](https://planilhes.com.br/concurso/dia-da-semana-fim-de-semana-conceito) | Vunesp | Datas | Vunesp · TJ-SP · Oficial de Justiça · 2024 | [abrir](https://www.qconcursos.com/questoes-de-concursos/provas/vunesp-2024-tj-sp-oficial-de-justica) |
| [ ] | [Concurso: buscar na tabela dinâmica](https://planilhes.com.br/concurso/dinamica-procv-na-dinamica-conceito) | FGV | PROCV | FGV · Polícia Civil (RN) · Agente de Polícia Civil · 2021 | [abrir](https://www.tecconcursos.com.br/questoes/1656032) |
| [ ] | [Concurso: Atualizar e a origem](https://planilhes.com.br/concurso/dinamica-caso-horas-conceito) | Cebraspe | Tabela dinâmica | Cebraspe · ANP · Regulador de Novas Atribuições III · 2022 | [abrir](https://qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2022-anp-regulador-de-novas-atribuicoes-iii-cargo-6/questoes?page=6) |

## Sem referência


### Questões avulsas

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [PROCV por faixa](https://planilhes.com.br/concurso/concurso-03-procv-por-faixa) | FCC | PROCV | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso PROCV PROCV por faixa`. | **Explicação:** Usa `=PROCV(valor; matriz; col; VERDADEIRO)` (ou `1`, ou argumento omitido) para buscar faixas de valores (ex.: alíquotas por renda). Retorna o maior valor menor ou igual ao procurado. **Pegadinha:** Omitir o 4º argumento ativa o modo aproximado (`VERDADEIRO`), e não a busca exata (`FALSO`). Além disso, a 1ª coluna da matriz deve estar em ordem crescente, senão o cálculo falha. **Questões achadas:** 1) [QConcursos Q37fea2ea-98](https://www.qconcursos.com/questoes-de-concursos/questoes/37fea2ea-98) (cobra sintaxe do 4º argumento `0`/`FALSO` vs `1`/`VERDADEIRO`). 2) [FCC TRT-24ª 2017 - Aprender Excel](https://www.aprenderexcel.com.br/2017/excel-para-concursos/10-questoes-resolvidas-e-comentadas-da-fcc-de-excel) (questões comentadas da FCC cobrando estrutura e argumentos de busca). |
| [Pedaço de um código](https://planilhes.com.br/concurso/concurso-04-pedaco-de-um-codigo) | FCC | Texto | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Texto Pedaço de um código`. | **Explicação:** Usa `=EXT.TEXTO(texto; núm_inicial; núm_caract)` para extrair trechos internos, `=ESQUERDA(texto; n)` para o início e `=DIREITA(texto; n)` para o fim. **Pegadinha:** Hífens, barras e espaços contam como caracteres na posição inicial; o retorno é sempre tratado como texto. **Questões achadas:** 1) FCC (Prova ARTESP, Portal Concursos) cobrando `EXT.TEXTO`, `NÚM.CARACT`, `CONCAT`, `DIREITA` e `ESQUERDA`. 2) Vunesp (Prefeitura SBC, QConcursos) comparando `=EXT.TEXTO(A1;1;20)` com `=ESQUERDA(A1;20)`. 3) CEPS-UFPA (QConcursos) cobrando `=DIREITA("Universidade Federal";5)` e `=EXT.TEXTO("Universidade Federal";14;3)`. |
| [Cópia para a direita](https://planilhes.com.br/concurso/concurso-05-copia-para-a-direita) | FCC | Referências | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Referências Cópia para a direita`. | **Explicação:** Calcula o deslocamento de colunas (letras) e linhas (números) entre a célula original e a de destino. **Pegadinha:** O cifrão (`$`) trava apenas o elemento imediatamente à sua direita (`$A` trava coluna ao arrastar para os lados; `$1` trava linha ao arrastar para cima/baixo). **Questões achadas:** 1) Instituto Ágata 2026 ([QConcursos Q4297667](https://www.qconcursos.com/questoes-de-concursos/questoes/58ea223d-ae)): `=$A1+B$1` copiada de `B2` para `C3` → `=$A2+C$1`. 2) Avança SP 2025 ([QConcursos Q3552424](https://www.qconcursos.com/questoes-de-concursos/questoes/506a6a1e-7d)): `A$1` copiada de `A2` para `B3` → `B$1`. 3) Vunesp PC-SP ([Estratégia](https://concursos.estrategia.com/portal/gabarito-informatica-pc-sp-papi-comentarios-as-questoes-vunesp-com-recurso/)): `=$F2-G$2` copiada de `H2` para `H6` → `=$F6-G$2`. |
| [Formato de porcentagem](https://planilhes.com.br/concurso/concurso-06-formato-de-porcentagem) | FCC | Formatação | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Formatação Formato de porcentagem`. | **Explicação:** O formato Porcentagem multiplica o valor armazenado por 100 apenas para exibição visual com `%`, mantendo o decimal na memória. **Pegadinha:** Digitar `10` e depois formatar como `%` exibe `1000%`; se a célula já tem formato `%`, a fórmula não deve ter `*100`. **Questões achadas:** 1) UPENET SEFAZ-PE 2022 ([QConcursos Q2051142](https://www.qconcursos.com/questoes-de-concursos/questoes/7b235a57-9b)): célula formatada como Porcentagem exige fórmula sem `*100`. 2) Padrão FGV/Vunesp/FCC ([QConcursos Q439430cf-28](https://www.qconcursos.com/questoes-de-concursos/questoes/439430cf-28)): categorias válidas da guia Número (`Ctrl+1`). 3) UFES ([QConcursos Q822029](https://www.qconcursos.com/questoes-de-concursos/questoes/200f6df6-4f)): cálculo direto com célula formatada em `5%`. |
| [SE dentro de SE](https://planilhes.com.br/concurso/concurso-08-se-dentro-de-se) | Cesgranrio | SE | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso SE SE dentro de SE`. | **Explicação:** Leitura sequencial da esquerda para a direita: ao encontrar a primeira condição VERDADEIRA, executa seu resultado e encerra a avaliação. **Pegadinha:** O segundo `SE` pode estar tanto no argumento *falso* quanto no *verdadeiro*; atenção aos parênteses de fechamento. **Questões achadas:** 1) Vunesp TJ-SP 2024 ([QConcursos Q3062856](https://www.qconcursos.com/questoes-de-concursos/questoes/3062856)): `=SE(A1>B1; C1; SE(B1<C1; A1+B1; B1+C1))` → `30`. 2) FGV ([QConcursos Q32c20a7b](https://www.qconcursos.com/questoes-de-concursos/questoes/f516834e-77)): faixa de notas com `SE` encadeado. 3) FCC ([QConcursos Q32c20a7b-0a](https://www.qconcursos.com/questoes-de-concursos/questoes/32c20a7b-0a)): `=SE(A1+B1=C1; SE(C1>20; "Alto"; "Médio"); "Baixo")` → `"Médio"`. |
| [Diferença entre datas](https://planilhes.com.br/concurso/concurso-10-diferenca-entre-datas) | Cesgranrio | Datas | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Datas Diferença entre datas`. | **Explicação:** No Excel, datas são números seriais (dias desde 01/01/1900). A diferença em dias é feita por subtração simples (`=DataFinal-DataInicial`) ou via `=DIAS(data_final; data_inicial)` e `=DATADIF(inicial; final; "D")`. **Pegadinha:** Na função `DIAS`, a ordem dos argumentos é invertida (`data_final` vem antes da `data_inicial`); já em `DATADIF` (e `DIAS360`), a `data_inicial` vem primeiro. **Questões achadas:** 1) [QConcursos Q45db67ef-fd](https://www.qconcursos.com/questoes-de-concursos/questoes/45db67ef-fd) (cobra sintaxe exata de `=DIAS(A2;B2)` vs `DATADIF`). 2) [QConcursos Q845df4d0-d7](https://www.qconcursos.com/questoes-de-concursos/questoes/845df4d0-d7) (cobra `=DIAS360(inicial; final)` baseado em ano comercial de 360 dias). 3) Cebraspe FUB 2022 ([Gran Q2373572](https://questoes.grancursosonline.com.br/questoes-de-concursos/informatica-405030/2373572)) (valida o uso da função `DIAS` para diferença entre duas datas). |
| [Contar com duas condições](https://planilhes.com.br/concurso/concurso-11-contar-com-duas-condicoes) | Cesgranrio | CONT.SES | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso CONT.SES Contar com duas condições`. | **Explicação:** Usa `=CONT.SES(intervalo_crit1; critério1; intervalo_crit2; critério2)` para contar linhas que atendem simultaneamente a múltiplas condições. **Pegadinha:** Os critérios em `CONT.SES` operam sempre com lógica **E** (nunca OU), e operadores relacionais (`>50`, `<>`) devem estar entre aspas duplas. **Questões achadas:** 1) [QConcursos Qd4dced0f-a0](https://www.qconcursos.com/questoes-de-concursos/questoes/d4dced0f-a0) (cobra resultado de `=CONT.SES(C2:C11;">50";E2:E11;"=aprovado")`). 2) [Portal Concursos - CONT.SE e CONT.SES](https://cursosdoportal.com.br/noticias/funcao-cont-se-no-excel-para-concurso) (detalha pegadinhas de aspas nos operadores e lógica E). |
| [Soma por vendedor](https://planilhes.com.br/concurso/concurso-12-soma-por-vendedor) | Cesgranrio | SOMASE | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso SOMASE Soma por vendedor`. | **Explicação:** Usa `=SOMASE(intervalo_critério; critério; [intervalo_soma])` para somar valores associados a um vendedor ou categoria específica. **Pegadinha:** A ordem dos argumentos é inversa à de `SOMASES`: em `SOMASE`, o `intervalo_soma` é o **último** argumento (e os intervalos devem ter o mesmo tamanho). **Questões achadas:** 1) [QConcursos Q32aaf1a9-a8](https://www.qconcursos.com/questoes-de-concursos/questoes/32aaf1a9-a8) (cobra `=SOMASE(B1:B10;"VENDAS";A1:A10)`). 2) Fundacentro ([Aprender Excel](https://www.aprenderexcel.com.br/2014/excel-para-concursos/questoes-resolvidas-e-comentadas-parte-5)) (cobra `=SOMASE(B2:B5;"<=20";C2:C5)` filtrando por condição numérica). |
| [SOMA com intervalo e célula](https://planilhes.com.br/concurso/concurso-13-soma-com-intervalo-e-celula) | Vunesp | SOMA | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso SOMA SOMA com intervalo e célula`. | **Explicação:** Combina dois pontos (`:`) para intervalo contínuo e ponto e vírgula (`;`) para células avulsas na mesma função (ex.: `=SOMA(A1:A5; C3)`). **Pegadinha:** A banca troca `;` por `:` para induzir o candidato a somar todo o bloco retangular (`A1:C5`) em vez de apenas o intervalo + a célula isolada. **Questões achadas:** 1) Vunesp 2014 - CBTU ([Aprender Excel - Parte 5](https://www.aprenderexcel.com.br/2014/excel-para-concursos/questoes-resolvidas-e-comentadas-parte-5)) (cobra distinção entre `:` e `;` em funções de agregação como `SOMA` e `MÁXIMO(B5;D5;C6;D6)`). 2) Vunesp 2022 ([YouTube - Vunesp Excel 2016](https://www.youtube.com/watch?v=C-h87_Fp34w)) (resolução de questão prática com `=SOMA` e operadores de referência). |
| [SE com OU](https://planilhes.com.br/concurso/concurso-14-se-com-ou) | Vunesp | SE com OU | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso SE com OU SE com OU`. | **Explicação:** Usa `=SE(OU(teste1; teste2); valor_verdadeiro; valor_falso)`. Basta que **apenas um** dos testes seja verdadeiro para retornar o `valor_verdadeiro`. **Pegadinha:** A banca testa valores nos limites exatos (`>` vs `>=`) onde todos os testes dão FALSO, forçando a execução do `valor_falso`. **Questões achadas:** 1) Vunesp 2014 - Prodest-ES ([Aprender Excel - Parte 5](https://www.aprenderexcel.com.br/2014/excel-para-concursos/questoes-resolvidas-e-comentadas-parte-5)): `=SE(OU(B3>1;C3<50); ...)` com `B3=1` e `C3=50` (ambos falsos, cai no argumento falso). 2) Vunesp 2014 - Desenvolvesp ([Aprender Excel - Parte 5](https://www.aprenderexcel.com.br/2014/excel-para-concursos/questoes-resolvidas-e-comentadas-parte-5)): `=SE(OU(MÉDIA(A1;B1;B2)>24;0);1;CONT.NÚM(B1;B2))`. |
| [Divisão por zero](https://planilhes.com.br/concurso/concurso-15-divisao-por-zero) | Vunesp | Erros | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Erros Divisão por zero`. |
| [Juntar sobrenome e nome](https://planilhes.com.br/concurso/concurso-16-juntar-sobrenome-e-nome) | Vunesp | Texto | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Texto Juntar sobrenome e nome`. |
| [Referência mista](https://planilhes.com.br/concurso/concurso-19-referencia-mista) | FGV | Referências | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Referências Referência mista`. |
| [PROCV exato](https://planilhes.com.br/concurso/concurso-20-procv-exato) | FGV | PROCV | Candidata: FGV · PC-RN · Agente e Escrivão de Polícia Civil Substituto · 2021 · questão 32 · [fonte](https://www.quizinho.com.br/questao/fgv-pc-rn-2021-agente-e-escrivao-de-policia-civil-substituto-2021-q32). Comparação com o site pendente. | |
| [ARRED e TRUNCAR](https://planilhes.com.br/concurso/concurso-21-arred-e-truncar) | FGV | Arredondamento | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Arredondamento ARRED e TRUNCAR`. |
| [Idade com DATADIF](https://planilhes.com.br/concurso/concurso-22-idade-com-datadif) | FGV | Datas | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Datas Idade com DATADIF`. |
| [SOMARPRODUTO](https://planilhes.com.br/concurso/concurso-23-somarproduto) | FGV | SOMARPRODUTO | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso SOMARPRODUTO SOMARPRODUTO`. |
| [ÍNDICE com CORRESP](https://planilhes.com.br/concurso/concurso-24-indice-com-corresp) | FGV | ÍNDICE e CORRESP | Candidata: FGV · PMESP · Soldado PM 2ª Classe · 2024 · [fonte](https://semperconcursos.com.br/questao/7473-informatica-pmesp-2024). Ver ressalvas na tabela inicial. | |
| [MÉDIA com texto e vazia](https://planilhes.com.br/concurso/concurso-25-media-com-texto-e-vazia) | Cebraspe | MÉDIA | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso MÉDIA MÉDIA com texto e vazia`. |
| [O erro #N/D](https://planilhes.com.br/concurso/concurso-26-o-erro-n-d) | Cebraspe | PROCV | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso PROCV O erro #N/D`. |
| [Aumento de 10%](https://planilhes.com.br/concurso/concurso-27-aumento-de-10) | Cebraspe | Porcentagem | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Porcentagem Aumento de 10%`. |
| [ARRED com duas casas](https://planilhes.com.br/concurso/concurso-28-arred-com-duas-casas) | Cebraspe | Arredondamento | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Arredondamento ARRED com duas casas`. |
| [A função E](https://planilhes.com.br/concurso/concurso-29-a-funcao-e) | Cebraspe | Funções lógicas | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Funções lógicas A função E`. |
| [MÍNIMO com zero e vazia](https://planilhes.com.br/concurso/concurso-30-minimo-com-zero-e-vazia) | Cebraspe | MÍNIMO | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso MÍNIMO MÍNIMO com zero e vazia`. |

### Módulo: fundamentos

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: a última parcela que fecha o total](https://planilhes.com.br/concurso/arred-parcelas-que-fecham-conceito) | FCC | Arredondamento | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Arredondamento a última parcela que fecha o total`. | |
| [Concurso: o total das tarifas do mês](https://planilhes.com.br/concurso/somarproduto-total-do-pedido-conceito) | Cesgranrio | SOMARPRODUTO | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso SOMARPRODUTO o total das tarifas do mês`. | |
| [Concurso: referência mista copiada](https://planilhes.com.br/concurso/orcamento-do-departamento-conceito) | Vunesp | Referências | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Referências referência mista copiada`. | |

### Módulo: logica

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: boletos vencidos](https://planilhes.com.br/concurso/se-prazo-vencido-conceito) | Cesgranrio | SE | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso SE boletos vencidos`. | |
| [Concurso: NÃO com E na análise de despesa](https://planilhes.com.br/concurso/nao-despesa-reembolsavel-conceito) | Vunesp | Funções lógicas | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Funções lógicas NÃO com E na análise de despesa`. | |
| [Concurso: a célula que parece vazia](https://planilhes.com.br/concurso/ecel-vazia-horas-extras-conceito) | FGV | Funções lógicas | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Funções lógicas a célula que parece vazia`. | |
| [Concurso: SES sem o caso que sobra](https://planilhes.com.br/concurso/honorarios-de-exito-conceito) | Cebraspe | SE | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso SE SES sem o caso que sobra`. | |
| [Concurso: a ordem das condições no SES](https://planilhes.com.br/concurso/caso-classificacao-clientes-conceito) | FCC | SE | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso SE a ordem das condições no SES`. | |

### Módulo: condicionais

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: CONT.SE com curinga no começo](https://planilhes.com.br/concurso/cont-se-curinga-ltda-conceito) | Cesgranrio | CONT.SE | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso CONT.SE CONT.SE com curinga no começo`. | |
| [Concurso: SOMASES com o período sem as pontas](https://planilhes.com.br/concurso/somases-periodo-datas-conceito) | Vunesp | SOMASE | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso SOMASE SOMASES com o período sem as pontas`. | |
| [Concurso: CONT.SES com vazio e diferente de](https://planilhes.com.br/concurso/criterios-diferente-vazio-conceito) | FGV | CONT.SES | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso CONT.SES CONT.SES com vazio e diferente de`. | |
| [Concurso: SOMASE copiado no relatório](https://planilhes.com.br/concurso/caso-relatorio-por-responsavel-conceito) | Cebraspe | SOMASE | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso SOMASE SOMASE copiado no relatório`. | |

### Módulo: busca

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: PROCV com CORRESP fora do lugar](https://planilhes.com.br/concurso/procv-coluna-variavel-corresp-conceito) | Cesgranrio | PROCV | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso PROCV PROCV com CORRESP fora do lugar`. | |
| [Concurso: PROCX com o próximo item maior](https://planilhes.com.br/concurso/procx-faixa-modo-correspondencia-conceito) | Vunesp | PROCX | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso PROCX PROCX com o próximo item maior`. | |
| [Concurso: PROCX com dois critérios](https://planilhes.com.br/concurso/procx-duas-condicoes-conceito) | FGV | PROCX | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso PROCX PROCX com dois critérios`. | |
| [Concurso: PROCX de baixo para cima](https://planilhes.com.br/concurso/procx-ultima-ocorrencia-conceito) | Cebraspe | PROCX | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso PROCX PROCX de baixo para cima`. | |
| [Concurso: o erro que o SEERRO escondeu](https://planilhes.com.br/concurso/caso-conferencia-de-cadastro-conceito) | FCC | SEERRO | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso SEERRO o erro que o SEERRO escondeu`. | |

### Módulo: texto

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: valor e data dentro da frase](https://planilhes.com.br/concurso/texto-data-e-valor-na-frase-conceito) | FGV | Texto | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Texto valor e data dentro da frase`. | |
| [Concurso: LOCALIZAR a partir de uma posição](https://planilhes.com.br/concurso/localizar-entre-dois-hifens-conceito) | Cebraspe | Texto | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Texto LOCALIZAR a partir de uma posição`. | |
| [Concurso: quantos caracteres depois do ARRUMAR](https://planilhes.com.br/concurso/caso-lista-de-clientes-conceito) | FCC | Texto | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Texto quantos caracteres depois do ARRUMAR`. | |

### Módulo: datas

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: DATAM no fim do mês](https://planilhes.com.br/concurso/datam-vencimento-das-parcelas-conceito) | Cesgranrio | Datas | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Datas DATAM no fim do mês`. | |
| [Concurso: prazo em dias úteis com feriado](https://planilhes.com.br/concurso/diatrabalho-prazo-processual-conceito) | FGV | Datas | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Datas prazo em dias úteis com feriado`. | |
| [Concurso: diferença de horas em número](https://planilhes.com.br/concurso/horas-trabalhadas-banco-de-horas-conceito) | Cebraspe | Datas | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Datas diferença de horas em número`. | |
| [Concurso: o último dia de vigência](https://planilhes.com.br/concurso/caso-agenda-de-vencimentos-conceito) | FCC | Datas | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Datas o último dia de vigência`. | |

### Módulo: arrays

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: o primeiro da lista ordenada](https://planilhes.com.br/concurso/classificarpor-salario-conceito) | FCC | CLASSIFICARPOR | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso CLASSIFICARPOR o primeiro da lista ordenada`. | |
| [Concurso: quantos nomes contêm o texto](https://planilhes.com.br/concurso/filtro-texto-parcial-conceito) | Cesgranrio | FILTRO | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso FILTRO quantos nomes contêm o texto`. | |
| [Concurso: a soma da sequência](https://planilhes.com.br/concurso/sequencia-cronograma-conceito) | Vunesp | SEQUÊNCIA | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso SEQUÊNCIA a soma da sequência`. | |
| [Concurso: clientes diferentes em atraso](https://planilhes.com.br/concurso/filtro-dentro-de-funcoes-conceito) | FGV | ÚNICO e FILTRO | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso ÚNICO e FILTRO clientes diferentes em atraso`. | |
| [Concurso: o aviso do FILTRO vazio](https://planilhes.com.br/concurso/caso-relatorio-pendencias-conceito) | Cebraspe | FILTRO e CLASSIFICAR | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso FILTRO e CLASSIFICAR o aviso do FILTRO vazio`. | |

### Módulo: dados

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: dois níveis de classificação](https://planilhes.com.br/concurso/dados-classificar-niveis-conceito) | FCC | Classificar | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Classificar dois níveis de classificação`. | |
| [Concurso: duas contagens do SUBTOTAL](https://planilhes.com.br/concurso/dados-subtotal-outras-contas-conceito) | Cesgranrio | SUBTOTAL | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso SUBTOTAL duas contagens do SUBTOTAL`. | |
| [Concurso: filtrar, classificar e totalizar](https://planilhes.com.br/concurso/dados-relatorio-contas-conceito) | Vunesp | Filtro e SUBTOTAL | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Filtro e SUBTOTAL filtrar, classificar e totalizar`. | |
| [Concurso: a coluna de ocorrência](https://planilhes.com.br/concurso/dados-achar-duplicados-conceito) | FGV | CONT.SE | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso CONT.SE a coluna de ocorrência`. | |
| [Concurso: a fase digitada sem acento](https://planilhes.com.br/concurso/dados-caso-base-processos-conceito) | Cebraspe | Filtro | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Filtro a fase digitada sem acento`. | |

### Módulo: dinamica

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: a contagem de um campo com vazios](https://planilhes.com.br/concurso/dinamica-contagem-status-conceito) | FCC | Tabela dinâmica | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Tabela dinâmica a contagem de um campo com vazios`. | |
| [Concurso: o Total Geral da Média](https://planilhes.com.br/concurso/dinamica-varios-resumos-conceito) | Cesgranrio | Tabela dinâmica | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Tabela dinâmica o Total Geral da Média`. | |
| [Concurso: % do Total Geral com filtro](https://planilhes.com.br/concurso/dinamica-percentual-total-conceito) | Vunesp | Tabela dinâmica | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Tabela dinâmica % do Total Geral com filtro`. | |

### Módulo: destaque

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: a escala de cor é relativa](https://planilhes.com.br/concurso/destaque-escala-de-cor-conceito) | Cebraspe | Formatação condicional | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Formatação condicional a escala de cor é relativa`. | |
| [Concurso: a fórmula da regra com E](https://planilhes.com.br/concurso/destaque-formula-e-conceito) | FCC | Formatação condicional | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Formatação condicional a fórmula da regra com E`. | |
| [Concurso: quem vence no Gerenciador](https://planilhes.com.br/concurso/destaque-ordem-das-regras-conceito) | Cesgranrio | Formatação condicional | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Formatação condicional quem vence no Gerenciador`. | |
| [Concurso: tolerância em porcentagem](https://planilhes.com.br/concurso/destaque-orcado-realizado-conceito) | Vunesp | Formatação condicional | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Formatação condicional tolerância em porcentagem`. | |
| [Concurso: o painel com três regras](https://planilhes.com.br/concurso/destaque-caso-painel-prazos-conceito) | FGV | Formatação condicional | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Formatação condicional o painel com três regras`. | |

### Módulo: graficos

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: o gráfico para comparar taxas](https://planilhes.com.br/concurso/grafico-escolher-tipo-conceito) | FCC | Gráficos | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Gráficos o gráfico para comparar taxas`. | |
| [Concurso: o total e as partes](https://planilhes.com.br/concurso/grafico-empilhadas-conceito) | Cesgranrio | Gráficos | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Gráficos o total e as partes`. | |
| [Concurso: a meta numa célula só](https://planilhes.com.br/concurso/grafico-realizado-meta-conceito) | Vunesp | Gráficos | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Gráficos a meta numa célula só`. | |
| [Concurso: o resumo antes do gráfico](https://planilhes.com.br/concurso/grafico-resumo-formulas-conceito) | FGV | SOMASE | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso SOMASE o resumo antes do gráfico`. | |
| [Concurso: duas escalas no mesmo gráfico](https://planilhes.com.br/concurso/grafico-painel-trimestre-conceito) | Cebraspe | Gráficos | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Gráficos duas escalas no mesmo gráfico`. | |

### Módulo: validacao

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: a Fonte em outra planilha](https://planilhes.com.br/concurso/validacao-lista-outra-aba-conceito) | FCC | Validação de dados | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Validação de dados a Fonte em outra planilha`. | |
| [Concurso: o estilo que pergunta](https://planilhes.com.br/concurso/validacao-alerta-aviso-conceito) | Cesgranrio | Validação de dados | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Validação de dados o estilo que pergunta`. | |
| [Concurso: o $ na regra personalizada](https://planilhes.com.br/concurso/validacao-personalizada-conceito) | Vunesp | Validação de dados | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Validação de dados o $ na regra personalizada`. | |
| [Concurso: protocolo sem repetição](https://planilhes.com.br/concurso/validacao-sem-repetir-conceito) | FGV | CONT.SE | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso CONT.SE protocolo sem repetição`. | |
| [Concurso: duas regras na mesma célula](https://planilhes.com.br/concurso/validacao-cadastro-clientes-conceito) | Cebraspe | Validação de dados | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Validação de dados duas regras na mesma célula`. | |

### Módulo: abas

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: cópia com referência a outra aba](https://planilhes.com.br/concurso/abas-parametros-config-conceito) | FCC | Referências entre abas | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Referências entre abas cópia com referência a outra aba`. | |
| [Concurso: soma 3D e as abas do meio](https://planilhes.com.br/concurso/abas-referencia-3d-conceito) | Cesgranrio | Referência 3D | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Referência 3D soma 3D e as abas do meio`. | |
| [Concurso: CONT.SES e CONT.SE juntos](https://planilhes.com.br/concurso/abas-painel-processos-conceito) | Vunesp | Funções de contagem | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Funções de contagem CONT.SES e CONT.SE juntos`. | |
| [Concurso: INDIRETO e o nome da aba](https://planilhes.com.br/concurso/abas-indireto-mes-conceito) | FGV | INDIRETO | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso INDIRETO INDIRETO e o nome da aba`. | |
| [Concurso: julgue o item (cópia entre abas)](https://planilhes.com.br/concurso/abas-fechamento-mensal-conceito) | Cebraspe | Referências entre abas | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Referências entre abas julgue o item (cópia entre abas)`. | |

### Módulo: casos

| Questão no site | Banca | Tema | Referência (Banca · Órgão · Cargo · Ano · link) | Explicação, pegadinha e questões encontradas |
|---|---|---|---|---|
| [Concurso: horas extras lançadas como horário](https://planilhes.com.br/concurso/folha-horas-extras-conceito) | FGV | Datas e horas | Não confirmada. Busca sugerida (não é fonte): `FGV Excel questão concurso Datas e horas horas extras lançadas como horário`. | |
| [Concurso: julgue o item (saldo acumulado)](https://planilhes.com.br/concurso/fluxo-de-caixa-conceito) | Cebraspe | Referências relativas | Não confirmada. Busca sugerida (não é fonte): `Cebraspe Excel questão concurso Referências relativas julgue o item (saldo acumulado)`. | |
| [Concurso: índice acumulado](https://planilhes.com.br/concurso/reajuste-ipca-conceito) | FCC | Porcentagem | Não confirmada. Busca sugerida (não é fonte): `FCC Excel questão concurso Porcentagem índice acumulado`. | |
| [Concurso: CONT.SES com janela de datas](https://planilhes.com.br/concurso/conciliacao-bancaria-conceito) | Cesgranrio | Funções de contagem | Não confirmada. Busca sugerida (não é fonte): `Cesgranrio Excel questão concurso Funções de contagem CONT.SES com janela de datas`. | |
| [Concurso: o imposto por dentro](https://planilhes.com.br/concurso/proposta-de-honorarios-conceito) | Vunesp | Porcentagem | Não confirmada. Busca sugerida (não é fonte): `Vunesp Excel questão concurso Porcentagem o imposto por dentro`. | |

## Pistas para conferir (achadas na busca, mas não entraram)

| Questão no site | Pista | Por que ficou de fora |
|---|---|---|
| [Concurso: NÃO e OU no reembolso](https://planilhes.com.br/concurso/nao-despesa-reembolsavel-conceito) | Vunesp · TJ-SP · Escrevente Técnico Judiciário · 2023 · [abrir](https://www.tecconcursos.com.br/questoes/2472312) | A real usa SE(E()); a nossa, NÃO(E()). Parecida, mas no limite |
| [Concurso: PROCX por faixa](https://planilhes.com.br/concurso/procx-faixa-modo-correspondencia-conceito) | Vunesp · Prefeitura de Jundiaí (SP) · Diretor de Escola · 2026 (QConcursos Q4403377) | Sem link conferido |
| Questão de CONT.SES (concurso-11) | Cesgranrio · Petrobras · 2018 | A real é de SOMASES |
| Questões de SUBTOTAL | Cesgranrio · Transpetro · 2018 | A real pergunta o que é o 1º argumento, não o resultado |
| Questões de SOMASE com curinga | Cebraspe · INSS · 2022 | A real não é sobre copiar a fórmula |
| Questões de validação (estilo Aviso) | Cesgranrio · Banco do Brasil · 2021 | A real mistura validação e formatação condicional |
| Questões de validação (duas regras) | Cebraspe · STJ · 2015 ("doze caracteres") | A real não fala de duas regras na mesma célula |
| Questões de SE aninhado | Cesgranrio · Petrobras · 2018 | A real é SE com SOMA e MÁXIMO, sem aninhar |

Assuntos com questão parecida só em **outras bancas** (não servem pela regra, mas ajudam a achar): PROCV com VERDADEIRO,
EXT.TEXTO, ARRUMAR, ARRED/TRUNCAR, DATADIF, ÍNDICE+CORRESP, referência mista copiada, CONT.SE com curinga, DIATRABALHO,
ordem das regras de formatação condicional, referência 3D, DATAM.
