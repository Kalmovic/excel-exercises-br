# Spike: trocar o HyperFormula (11/11/2026)

Motivo: o HyperFormula é GPLv3 ou licença comercial. Como o motor roda no navegador, usar de graça exige publicar o frontend sob GPLv3.

## Régua

`corpus.json`: 354 planilhas e 1.378 células conferidas, exportadas do próprio conteúdo
(soluções de referência de todos os exercícios, lições, testes, prática extra e desafios, mais a
matriz de funções pt-BR). Gerado por `src/spike-exportar.test.ts`.

Para os motores em inglês, `comum.ts` traduz a fórmula (`PROCV(A2;…;FALSO)` → `VLOOKUP(A2,…,FALSE)`)
e lê as entradas brasileiras (`R$ 1.234,50`, `5%`, `15/03/2026`).

## Resultado

| Motor | Acertos | Download (gzip) | Licença | Observações |
|---|---|---|---|---|
| HyperFormula 3.5 (atual) | referência | ~204 KB | GPLv3 / comercial | |
| IronCalc 0.9 | 1372/1378 (99,6%) | ~700 KB | MIT/Apache-2.0 | falha: PROCX com colunas concatenadas (`B2:B10&C2:C10`); erros em inglês (#N/A). Tem desfazer, colar, ciclos (#CIRC!), datas. |
| Formualizer 0.14 | 1370/1378 (99,4%) | ~3,7 MB | MIT/Apache-2.0 | falha: ARRUMAR não percorre intervalo; pesado demais para celular. |
| Motor próprio (protótipo) | 1378/1378 (100%) | ~5,7 KB | nosso | 408 linhas (`proprio/`): parser pt-BR direto, dependências, ciclos, matrizes, derramamento, critérios, datas 1900, 63 funções. |

Rodar: `npx tsx proprio.ts`, `npx tsx ironcalc.ts`, `node --experimental-wasm-modules --import tsx formualizer.mts`.

## O que o protótipo ainda não tem (é o adaptador)

- tipo do resultado para exibição (data vs número) — o HyperFormula informava "NUMBER_DATE";
- diagnóstico de sintaxe (reaproveitar `diagnosticarSintaxe`);
- colar/preencher ajustando referências (reaproveitar `referenciasDaFormula`);
- desafazer (o histórico próprio da `Planilha` vira o único);
- testes além das soluções: fórmulas erradas de aluno, comparação diferencial com o HyperFormula.
