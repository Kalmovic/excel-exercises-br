# Testes da revisão adversarial

Os testes que falhavam na revisão (`../relatorios/adversarial.md`) viraram testes do repositório, já passando:

- `src/engine/restauracao.test.ts`: restauração (R1 a R6, D1, D2, F1, F2, A1), classificação como permutação (S1)
- `src/engine/propriedades.test.ts`: propriedades com gerador semeado (desfazer/refazer, salvar e restaurar)
- `src/engine/limites.test.ts`: limites da Planilha (S2 e a carga maliciosa do relatório de segurança)
- `src/grader/regressao.test.ts`: correção (G1, G2, M1, A1, errosComuns com bloqueia, certificado)
- `src/engine/motor/correcoes.test.ts`: motor (LET com intervalo no SUBTOTAL, TAXA = 0)

As cópias originais, que dependiam do `fast-check` instalado de forma temporária, foram retiradas daqui.
