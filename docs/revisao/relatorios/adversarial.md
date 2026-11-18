# Adversarial correctness review: filter, sort, pivot and multi-sheet branch

Branch: `claude/zen-cerf-vch314` compared with `main`. Every bug listed as confirmed has a test that fails. The tests are copied, ready to reproduce, into
`/tmp/claude-0/-home-user-excel-exercises-br/4fb5383a-9cc7-5eb2-9dd1-c4d53f82e443/scratchpad/revisao/adversarial/`. The files use the `@/` aliases; put them under `src/` to run them.

- `motor.adversarial.test.ts`: R1–R6, F1/F1b/F2/F3, G1/G2, D1/D2, M1/M1b
- `abas-certificado.adversarial.test.ts`: A1, S1, S2
- `taxa.adversarial.test.ts`: TAXA
- `propriedades.adversarial.test.ts`: fast-check harness. P1 undo/redo round-trip. P2 save→restore replay gives the same screen. Both fail today, through R2 and the pre-existing R$ round-trip. Both passed 400 runs once the R$ value and the prefilled editable cell were removed (sorting only by locked columns, plus filter, rules, pivot, validation, formats, clear). In other words, undo/redo of "estado" snapshots mixed with "celulas" actions is consistent, and so is restore when sorting by locked columns. Install with `npm i --no-save fast-check`.

The repo is unchanged. All temporary `*.adversarial.tmp.test.ts` files were deleted.

---

## Confirmed bugs

### G1 — P1 — Correct filter rejected after any sort (`linhasVisiveis` compares row numbers)
- **Where:** `src/grader/validadores/ferramenta.ts:44-57` (`case "linhasVisiveis"`). Content affected: `dados-filtrar-regiao*`, `teste-dados-2` (certificate), `dados-subtotal-visiveis-variacao-a`.
- **Repro:** `G1` in `motor.adversarial.test.ts`.
  1. In `dados-filtrar-regiao`, sort A1:D10 by Região. The filter arrow menu offers "Classificar" on the same screen.
  2. Filter Região = Sul.
  3. Exactly the 4 Sul sales are visible, but the grade fails.
  4. The message is "O filtro está mostrando 4 linhas, mas a resposta tem 4", which is self-contradictory.
- **Root cause:** `esperado` is a list of fixed sheet row numbers (`[2,4,6,9]`). Sorting legitimately moves the rows, and `ordenar` also moves locked data.
- **Fix:** Compare *which records* are visible, not where they sit. Either:
  - store the expected key values (for example the first column, or the full row text) and compare multisets of the visible rows; or
  - map each expected row number to its initial record and track sort permutations.
  Also change the message when the counts are equal: "the right number of rows, but different rows".

### S1 — P1 (certificate) — More than 30 sorts invalidates the whole `recursos`, and the certificate request is refused
- **Where:** `src/content/schema.ts:168` (`ordenacoes ... .max(30)`). `Planilha.classificar` (`engine.ts` ~764) pushes onto `ordenacoes` with no limit or compaction. The schema is used in `src/app/api/certificado/route.ts:17` (inside the request schema) and in `src/grader/conferir-teste.ts`.
- **Repro:** `S1` in `abas-certificado.adversarial.test.ts`. Sort 31 times. The client grade passes, but `recursosSchema.safeParse(p.recursos()).success === false`.
- **Impact:**
  - In the route, the whole `pedido.safeParse` fails, so the response is 400 "Dados inválidos" for the whole module certificate.
  - In `conferirQuestao`, all recursos (filter, pivots, rules) are silently dropped, which means a wrong grade.
- **Fix:** Bound what is stored, not what is accepted. Collapse consecutive sorts of the same range: a sort over the same `intervalo` with the same `cabecalho` makes earlier sorts of that range irrelevant only if keys fully determine the order. Simplest safe options:
  - keep `ordenacoes` and cap it client-side by refusing (with a message) beyond 30; or
  - store the resulting row permutation instead of the history.
  Also never let `recursos` failure reject the whole request: validate per question.

### R1 — P2 — Restore re-sorts before the student's cells exist; sorting by a student-typed column is not reproduced
- **Where:**
  - `Simulador.tsx:40-43` (aplicarRecursos then definirVarias)
  - `conferir-teste.ts` (same order)
  - `engine.ts:632` `aplicarRecursos` → `ordenar` (`engine.ts:780`)
- **Repro:** `R1`. The student types B2:B4 = 3,1,2 next to locked names, then sorts by B. After a reload, the locked names are back in their original order, but B holds the sorted values. Rows become mismatched, and the certificate server regrades the same wrong state.
- **Root cause:** The sort key values at replay time differ from those at sort time, because editable cells are restored after the sorts. The same happens for "sort, then type, then sort again" whenever a key column is editable.
- **Fix:** Persist the effect, not the history. Persist the final row permutation per range, or snapshot the locked/initial cells' positions. Alternatively, interleave: record the cell contents at each sort (heavy). Recommended: save `ordem: number[]` (source row for each destination row) in each `Ordenacao`, and replay it by permutation instead of re-sorting.

### R2 — P2 — Prefilled editable cell the student cleared comes back after sort + reload
- **Where:** `engine.ts:138` (`preenchidasEditaveis` is keyed by address) and `engine.ts:380` `conteudosDoAluno`. `ordenar` never updates the set.
- **Repro:** `R2`, and also the `propriedades` P2 counterexample `[sort A asc, limpar D2]`. B2="x" is prefilled and editable. The student deletes it, then sorts. The row moves to row 4. `conteudosDoAluno` writes `B2:""` but nothing for B4. On restore the sort moves "x" to B4, and it reappears.
- **Fix:** Move `preenchidasEditaveis` membership along with the row in `ordenar`, as is done for `bloqueadas`. Or emit `""` for every editable cell in sorted ranges that is empty.

### R3 — P2 (data loss) — Restore order lets a pivot table overwrite student cells
- **Where:** `engine.ts:486` (`definirVarias` skips `this.bloqueada(endereco)`, which includes `daDinamica`) and `engine.ts:1002` (the collision check only sees cells that already exist).
- **Repro:** `R3`.
  1. The student types E3.
  2. The student inserts and configures a pivot at E1 that would cover E3, and gets the error "não cabe: E3 já tem dados".
  3. After a reload, the pivot renders first, because E3 is not restored yet.
  4. `definirVarias` then skips E3 as pivot output. The student's text is lost and the pivot now shows instead of the error.
- **Fix:** On restore, write cells before computing derived state. Either:
  - make `definirVarias` not consult `daDinamica` when restoring (only `bloqueadas`); or
  - apply sorts, then contents, then the other recursos (filter, pivots, rules) followed by a single `atualizarDerivados`.
  The certificate path needs the same fix.

### F1 — P2 — `deslocarFormula` and `referenciasDaFormula` treat cell-like tokens inside quoted sheet names as references
- **Where:** `src/engine/referencias.ts:28-36`. The quote scan only tracks `"`, not `'...'`. `deslocarFormula` is at `engine.ts:1352`.
- **Repro:** `F1` and `F1b`.
  - `deslocarFormula("='VENDAS T1'!B2", 1, 0)` returns `='VENDAS T2'!B3`.
  - In a Pasta with sheet "Vendas T1", fill-down of `='Vendas T1'!B2` gives `#REF!`.
- **Also affects:**
  - sorting rows that contain such formulas (`ordenar` uses `deslocarFormula`)
  - conditional-format formula rules (`avaliarFormulaEm`)
  - reference colouring in the editor
- **Fix:** In `referenciasDaFormula`, mark characters inside `'...'` (with `''` escapes) as quoted, the same way as `"`, and skip matches inside them.

### R4 / G2 — P2 — Re-writing cells through `textos` drops the typed number type: currency `R$` becomes a plain number, time with seconds loses the seconds
- **Where:**
  - `engine.ts:780` `ordenar` (re-`gravar`s `textos`)
  - `engine.ts:1193` `aceitariaNaCelula` (restores with `gravar(p, antes)`)
  - Root: `textoDe` (`engine.ts` ~421) emits `pt(v)` for NUMBER_CURRENCY and `hh:mm` for times.
- **Repro:**
  - `R4`: "R$ 10,00" typed, then any sort, then the cell shows "10".
  - `G2`: Conferir on a validation exercise turns a typed `R$ 3,00` cell into NUMBER_RAW, so the screen changes as a side effect of grading.
  - The undo/redo and persistence round-trip has the same issue on `main` (pre-existing). `propriedades` P1/P2 fail on it.
- **Fix:**
  - `aceitariaNaCelula` should save and restore the `Conteudo` from the calculo (or go through the calculo directly) instead of re-parsing text.
  - `ordenar` should move `Conteudo` objects, not text.
  - Long term, make `textoDe` round-trip: `R$ 1.234,50`, and `hh:mm:ss` when seconds are not zero.

### M1 — P2 — Misleading feedback: every failing `valores` check says "ainda não estão na ordem pedida"
- **Where:** `src/grader/validadores/ferramenta.ts:35`
- **Repro:** `M1` and `M1b`. In `validacao-lista-status-variacao-b`, a wrong status gives "Os dados em C2:C3 ainda não estão na ordem pedida." The same happens in `validacao-dados-antigos*` and `teste-validacao-4`, where nothing is sorted. None of these verifications set `mensagem`.
- **Fix:** Use a neutral default ("Os valores em X não são os esperados") or require `mensagem` in the schema for `valores`. Keep "ordem" only for sort exercises.

### R5 — P3 — `limparHistorico` only clears the first sheet; Ctrl+Z on another sheet undoes restored content
- **Where:** `engine.ts:361`, used in `Simulador.tsx:45`. `definirVarias` (`engine.ts` ~475) registers a history entry on each other sheet.
- **Repro:** `R5`
- **Fix:** In `limparHistorico`, when `this.pasta` is set, clear every sheet's history.

### R6 — P3 (latent) — Progress, certificate and grader only see sheet 0's recursos and formats
- **Where:** `engine.ts:611` `recursos()`, `formatosDoAluno()`, `Simulador.tsx:151,221`, `validarFerramenta(ex, p)`
- **Repro:** `R6`. A filter on sheet "Jan" does not appear in `recursos()`.
- **Today:** No multi-sheet exercise enables tools, so this is latent. Any future "ferramenta" exercise with `abas` will lose state on reload and cannot be graded on other sheets.
- **Fix:** Prefix per sheet (`{ abas: { Jan: Recursos } }`), the same way `conteudosDoAluno` does.

### F2 — P3 — `grafarAbas` rewrites error literals when a sheet is named like an error (`Ref`, `Valor`, `Calc`, `Nulo`, `Núm`, `Despejar`)
- **Where:** `engine.ts:190`. The regex `([A-Z…_][A-Z…0-9_.]*)!` matches `REF!` inside `#REF!`.
- **Repro:** `F2`. With a sheet "Ref", `=SEERRO(1/0;#REF!)` is stored as `=SEERRO(1/0;#Ref!)`. That text no longer tokenizes, so it becomes `#NOME?` after reload or copy.
- **Fix:** Require that the identifier is not preceded by `#`. Add a negative lookbehind `(?<![#\w])`, or tokenize instead of using a regex.

### F3 — P3 — LET names bound to a range do not work where a reference node is required
- **Where:** `nucleo.ts:285` (`SUBTOTAL` only accepts `ref`/`int` nodes). AGREGAR and DESLOC have the same pattern.
- **Repro:** `F3`. `=LET(r;A1:A3;SUBTOTAL(9;r))` gives `#VALOR!`; Excel gives 6. CONT.SE and SOMASE work.
- **Fix:** Have LET keep the AST node for reference-valued bindings (`nomes` maps to `{no}`), and let reference-consuming functions resolve `nome` nodes to the bound `ref`/`int`.

### D1 — P3 — Derived-state order: pivots are computed before hidden rows, so they show a stale SUBTOTAL
- **Where:** `engine.ts:882` `atualizarDerivados` (dinâmicas, then ocultas, then condicionais)
- **Repro:** `D1`. The pivot source has `=SUBTOTAL(9;B2:B4)`. After filtering, the cell shows 40 but the pivot still shows 60.
- **Fix:** Call `atualizarOcultas()` first. When it changes, or always, recompute pivots after it. Run it again if the pivot output changes the filter's values, bounded to 2 passes.

### D2 — P3 — `aceitariaNaCelula` erases a pivot output value until the next notification
- **Where:** `engine.ts:1193`. `gravar(p, "")` calls `calculo.definir(null)` on a pivot cell, which has no text.
- **Repro:** `D2`
- **Fix:** Return early when `daDinamica(p)` or `bloqueada(p)`. Better, snapshot and restore the calculo `Conteudo` (see R4).

### A1 — P3 — Certificate drops student cells on sheets whose name contains `'`
- **Where:** `src/grader/conferir-teste.ts:29`. `ENDERECO_COM_ABA` excludes `'` (and `!`). Excel allows both in sheet names, and `conteudosDoAluno` emits `D'Ávila!A1`.
- **Repro:** `A1`
- **Fix:** Allow `'` (and `!`), and let `daAba` split on the last `!`, which it already does.

### S2 — P3 — UI produces recursos the schema rejects, so the certificate fails
- **Where:**
  - conditional-rule `valor` max 100 / `formula` max 300 (`schema.ts:113,116,119`)
  - validation `valor1/valor2` max 200 and `fonte` max 500 (`schema.ts:148-150`)
  - None of these are capped in `MenuCondicional.tsx` / `ValidacaoDados.tsx` or in `adicionarRegra` / `adicionarValidacao`. Only the titles and messages are sliced.
- **Repro:** `S2`. A 101-char "Texto que contém" rule is accepted by `adicionarRegra`, and `recursosSchema` then fails.
- **Fix:** Enforce the schema limits in the engine methods: return `{ok:false}` or slice. Ideally run `recursosSchema.safeParse(this.recursos())` in a dev assertion after each `mudarEstado`.

### TAXA — P3 — `TAXA` returns `#NÚM!` when the answer is 0
- **Where:** `nucleo.ts:551`
- **Repro:** `taxa.adversarial.test.ts`. `=TAXA(10;-100;1000)` gives `#NÚM!`; Excel gives 0.
- **Root cause:** The finite-difference derivative suffers cancellation next to x=0, and there is no `|y|<eps` exit.
- **Fix:** Return `i` when `Math.abs(y) < 1e-10`. Use the analytic derivative, or a series expansion for |x| < 1e-6.

---

## Checked and holding (no bug found)

- Undo/redo across interleaved `estado` snapshots and `celulas` actions: 400 fast-check runs, with no R$ input.
- Pasta notifications: a cross-sheet conditional-format rule updates, the listener fires exactly once, and there is no recursion. `refrescar` does not call `aoMudar`.
- Parser:
  - `Q1!A1` and quoted `'Vendas 2025'!B2` work, including lowercase forms.
  - LET shadowing (`LET(x;2;LET(x;x+1;x)*10+x)` = 32) works.
  - LET names that collide with functions (`LET(SOMA;5;SOMA+SOMA(1;2))`) work.
  - Lowercase `let` works.
- Multi-sheet grading of the `abas` module: solution and lowercase variants pass and hard-coded values fail, on both client and `conferirQuestao`.
- New functions checked against Excel values: VP, VF, NPER, TAXA (non-zero), NÚMSEMANA (types 1, 2, 21, including ISO week 53 edges), MARRED, CORRESPX (−1/1/2/reverse), AGREGAR (4/9/14, options 4/6), UNIRTEXTO, PEGAR, DESCARTAR, ESCOLHERCOLS, DIVIDIRTEXTO, SUBTOTAL 2/9/109 with multiple refs.

## Unconfirmed suspicions (no failing test written)

1. **Chained cross-sheet derived state can go stale.** `Pasta` refreshes the other sheets once, in index order. If sheet 1's pivot or rule reads sheet 2's pivot output, a change on sheet 0 refreshes sheet 1 before sheet 2, so sheet 1 stays stale (`engine.ts` Pasta constructor, `aoMudar`). Fix: loop `refrescar` until no pivot output changes, with a bound.
2. **Pivot destination ignores spilled arrays.** `atualizarDinamicas` checks `textos` and the origin only. A pivot can be placed over the spill area of a user formula such as `=ÚNICO(...)`, which turns the user's formula into `#DESPEJAR!` instead of reporting "não cabe".
3. **Sorting a range that contains pivot output or spill areas.** `ordenar` reads key values from those cells but moves only `textos`, so the result is not actually sorted. A moved text can also land on a pivot cell and make the pivot error out.
4. **Sorting with an active filter.** `store.classificar` sorts the whole filter range, including hidden rows; Excel sorts only visible ones. Validation rules and conditional-format ranges stay by address and do not move with the rows. Excel moves validation with the cells.
5. **Pivot grader drops requested "(Tudo)" filters.** `conferirDinamica` filters `aplicados` to `marcados !== null`. A verification that asks for a field in Filtros with `valores: null` therefore always fails with "Coloque X em Filtros". No current content hits this.
6. **Verificar while editing on another sheet.** `Simulador.verificar` uses sheet 0's store. A draft typed on another sheet (`modo !== "pronto"` in that sheet's store) is neither confirmed nor graded. When the pointing flow starts on a draft such as `=A1`, which does not end in an operator, the inserted reference is concatenated into `=A1Jan!B2`.
7. **`MenuFiltro` caches values.** `valores` is memoized on `[planilha, coluna]` only, so the checkbox list is stale if the data changes while the menu is open (for example a cross-sheet recompute).
8. **Conditional "Menor do que" on blank cells.** Excel treats blanks as 0 and highlights them; `condicional.ts` only considers numbers. This is a fidelity gap that could make `destacadas` expectations differ from what the student sees in real Excel.
