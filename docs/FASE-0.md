# Fase 0: spike do motor de fórmulas

**Conclusão:** o HyperFormula 3.5 roda todas as funções do MVP em pt-BR, com `;` e `,`, depois de alguns ajustes no adapter (`src/engine`). Duas divergências menores ficam documentadas; nenhuma bloqueia o MVP.

A matriz executável está em `src/engine/matriz.test.ts` (`npm test`).

## Configuração pt-BR

- Base: o idioma `ptPT` do pacote, que já usa os nomes do Excel brasileiro (PROCV, CONT.SE, SOMASE…).
- Sobrescritas: `SE.S`→`SES`, `DATEDIF`→`DATADIF`, `FILTER`→`FILTRO`, `ORDENAR`→`CLASSIFICAR`, `EXCLUSIVOS`→`ÚNICO`, erro de spill `#DESPEJAR!`.
- Separadores: argumento `;`, decimal `,`, milhar `.`.
- Datas: `DD/MM/YYYY`, `leapYear1900: true`, `nullDate: 31/12/1899`. Assim os números de série batem com o Excel (`DATA(2026;1;15)` = 46037, `DATA(1900;3;1)` = 61).

## Resultado por módulo

| Módulo | Funções | Status |
| --- | --- | --- |
| 1 Fundamentos | SOMA, MÉDIA, MÍNIMO, MÁXIMO, operadores, variação %, `$` | ✅ |
| 2 Lógica | SE, SE aninhado, E, OU, SES, SEERRO | ✅ |
| 3 Contar/somar | CONT.VALORES, CONT.SE, CONT.SES, SOMASE, SOMASES, MÉDIASE | ✅ |
| 4 Busca | PROCV exato/aproximado, PROCH, ÍNDICE+CORRESP, PROCX | ✅ (com ajuste 1) |
| 5 Texto | &, CONCAT, CONCATENAR, ESQUERDA, DIREITA, EXT.TEXTO, ARRUMAR, PRI.MAIÚSCULA, LOCALIZAR, SUBSTITUIR | ✅ (com ajuste 2) |
| 6 Datas | HOJE, ANO, MÊS, DATA, DATADIF, DIATRABALHOTOTAL, FIMMÊS | ✅ / ⚠️ DATADIF minúsculo, HOJE congelado pendente |
| 7 Arrays dinâmicos | FILTRO, CLASSIFICAR, ÚNICO (derramam para baixo; bloqueio = `#DESPEJAR!`) | ✅ |
| 8 Casos reais | PGTO | ✅ |

## Ajustes feitos no adapter

1. **`FALSO`/`VERDADEIRO` sem parênteses:** o HyperFormula só entende `FALSO()`. O adapter converte na entrada e desconverte na barra de fórmulas. Sem isso, `PROCV(...;FALSO)` dava `#NOME?`.
2. **CONCAT não existe** no HyperFormula (só CONCATENATE). Implementado como plugin (`src/engine/plugins.ts`).
3. **Nomes em inglês eram aceitos em silêncio** (`=SUM(...)` funcionava). Agora são recusados com "Você quis dizer SOMA?". O mesmo vale para nome sem acento (`MEDIA`) e para vírgula como separador de argumentos.
4. **`R$ 20` com espaço** não era reconhecido como moeda. O adapter remove o espaço.
5. **Célula vazia precisa ser `null`**, não `""`. String vazia bloqueava o derramamento de FILTRO/ÚNICO.

## Divergências conhecidas (testes marcados como `[divergente]`)

| Caso | Excel | HyperFormula | Plano |
| --- | --- | --- | --- |
| `DATADIF(...;"m")` (unidade minúscula) | aceita | `#NÚM!` | Normalizar a unidade no adapter antes do Módulo 6 |
| `TEXTO(1,5;"0,00")` | `1,50` | `2,00` | Fora do MVP; plugin próprio se entrar no conteúdo |

## Pendências

- **HOJE congelado:** exercícios com HOJE precisam de data fixa (`hojeFixo`). Fazer via plugin antes do Módulo 6.
- **Constantes de array** (`{1;2|3;4}`): deram `#VALOR!` com os separadores pt-BR. Fora do MVP.
- **Conferir a matriz num Excel pt-BR real.** Os valores esperados foram calculados a partir do comportamento documentado do Excel.

## Licença

O motor cobre o MVP, então a opção A do plano (HyperFormula sob GPLv3, frontend público) é viável. Decidir antes de abrir o site ao público. O adapter isola o motor (`src/engine/engine.ts`) caso a decisão mude.
