# Differential test: formula engine vs LibreOffice Calc

Date: 2026-11-18. Engine: `src/engine/motor/{parser,nucleo,entrada}.ts` via `Planilha` (`src/engine/engine.ts`). Reference: LibreOffice 24.2.7.2 (headless, UNO) + real-Excel knowledge.

## Method

1. **Corpus** (`diferencial/corpus.py` → `corpus.json`): every one of the 91 functions in `src/engine/catalogo.ts`, plus operators/precedence/coercion and parser edge cases, written in pt-BR over one shared data block:
   - `A1:A12` numbers 10, -5, 0, 2,5, 1000000, *empty*, text `'7`, VERDADEIRO, 3, 10 (tie), `=1/0` (error), 0,1
   - `B1:B12` text: Maçã, banana, "  Uva  ", MAÇÃ, Pêra verde, *empty*, abc, ABC, a\*b, `=""`, "Ana Maria  da Silva", 123
   - `C1:C12` dates around month ends / leap years / ISO-week edges (15/03/2024, 29/02/2024, 31/01/2024, 31/12/2023, 01/01/2024, 28/02/2023, 30/12/2024, 01/01/2021, 25/12/2024, 01/01/2025, 31/08/2024, 03/01/2027)
   - `D1:E10` sorted numeric lookup table + duplicates, a text key and a blank; `F1:G10` names (case/accents/trailing space/duplicates) + values; `H1:H8` mixed booleans/text "VERDADEIRO"; `I1:I5` descending; `K1:O3` horizontal table; `K5:K7` strings to split.
2. **Ours**: a temporary vitest file (`src/engine/motor/corpus.diferencial.tmp.test.ts`, created and deleted by `run_ours.sh`) builds a fresh `Planilha` per case, `definir("Q20", f)`, and reads the 12×10 block from Q20 (to capture spills). Cases that freeze the engine are detected with a 90 s timeout, recorded in `hangs.json` and the run is retried without them. Exceptions while reading are recorded as crashes.
3. **LibreOffice**: `run_lo.py` translates each formula to English (`;`→`,`, `,`→`.` decimals, function names incl. `_xlfn.` prefixes), writes `corpus.xlsx` with openpyxl (no cached values), starts `soffice --headless`, sets the UI locale to **pt-BR** (so TEXTO format codes, VERDADEIRO and text→number coercion follow Brazilian rules), loads, forces `calculateAll()`, and reads value/type/error per cell. A `=NOW()` sentinel is checked against today's serial (it was recalculated: 46344).
4. **Compare** (`compare.py`): numbers with 1e-9 relative tolerance, dates as serials, booleans by type, errors by type (LO `Err:502` ≈ #NÚM!/#VALOR!, `Err:504` ≈ #VALOR!). When the corpus has a real-Excel expectation (`exp`) it is the oracle (used for the dynamic-array / LET / PROCX / CORRESPX functions that LO 24.2 does not have, and for spots where LO is known to differ from Excel).
5. **Triage** (`classify.py`): every non-passing case was minimised/judged by hand as *engine bug*, *LO-specific* or *ambiguous*; bugs grouped by root cause with the culprit line.

LO 24.2 limits: no FILTER/SORT/UNIQUE/SEQUENCE/TAKE/DROP/CHOOSECOLS/TEXTSPLIT/XLOOKUP/XMATCH/LET (these were checked against hand-written Excel 365 results), booleans are numbers in LO (biggest source of LO-only differences).


## Numbers

- Cases: **980** (895 evaluated in LibreOffice 24.2.7.2; 110 with a hand-written real-Excel expectation, used as the oracle when present).
- Raw pass rate (ours == oracle): **795/980 = 81.1%**.
- After triage: 122 cases are engine bugs (35 distinct bugs), 51 are LibreOffice-specific (ours matches Excel), 12 ambiguous. Pass rate counting LO-specific as pass: **86.3%**.

## Confirmed engine bugs

Severity: P0 = wrong answer/crash in the most common learner formulas; P1 = likely to be hit in exercises; P2 = plausible; P3 = edge case. "Excel" column is the real-Excel expectation (hand-checked; equals LO unless noted).

| Bug | Sev | What | Example formula (data) | Ours | LibreOffice | Excel | Culprit | All failing cases |
|---|---|---|---|---|---|---|---|---|
| B01 | P1 | Engine hangs (infinite loop) when DIATRABALHO gets a fractional number of days | `=DIATRABALHO(C1;2,9)` | {"trava": "infinite loop (engine hangs)"} | 45370.0 | 45370.0 | nucleo.ts:343 (DIATRABALHO: `while (n !== 0)` with n -= ±1 never hits 0; Excel truncates days) | `=DIATRABALHO(C1;2,9)`, `=DIATRABALHO(C1;0,5)` |
| B02 | P1 | Single-cell references passed to SOMA/MÉDIA/MÍNIMO/MÁXIMO/MED are coerced like typed values: empty cell counts as 0, text cell → #VALOR!, TRUE/'7' are summed. Excel ignores empty/text/boolean cells reached through a reference | `=SOMA(A7)` | 7 | 0.0 | 0 | nucleo.ts:192-200 (numericos: non-matrix result of a `ref` goes through num()) | `=SOMA(A7)`, `=SOMA(A8)`, `=SOMA(B1)`, `=MÉDIA(A1;A6)`, `=MÉDIA(A1;A7)`, `=MÉDIA(A6)`, `=MÍNIMO(A1;A6)`, `=MÍNIMO(A9;A6)`, `=MÁXIMO(A2;A6)`, `=MED(A6)`, `=SOMA(A1;A6;A8;A7;B1)`, `=MÉDIA(A2;A6;A9)` |
| B03 | P1 | Whole-column/whole-row references (A:A, 1:1) are rejected as a syntax error | `=SOMA(A:A)` | {"rejeitada": "Há um problema na escrita desta fórmula. Confira os parênteses, os ; entre  | {"erro": "#DIV/0!"} | {"erro": "#DIV/0!"} | parser.ts:21 REF regex + parser.ts:108 (range needs row numbers on both ends) | `=SOMA(A:A)`, `=SOMA(1:1)` |
| B04 | P2 | Formula whose result is an empty cell (=A6, =SEERRO(A6;0), DESLOC to empty) shows blank instead of 0; downstream ÉCÉL.VAZIA sees it as empty | `=SEERRO(A6;0)` | — | 0.0 | 0.0 | nucleo.ts:694 (Calculo.calcular stores null; Excel turns a reference to an empty cell into 0) | `=SEERRO(A6;0)`, `=DESLOC(A1;5;0)`, `=A6`, `=B6`, `=SEERRO(A6;"x")` |
| B05 | P2 | Wildcards (* ? ~) not supported in exact-match PROCV/PROCH/CORRESP (Excel supports them); also no ~ escape in CONT.SE/SOMASE criteria | `=CONT.SE(B1:B12;"a~*b")` | 0 | 1.0 | 1.0 | nucleo.ts:212-214 (exato/busca), nucleo.ts:72 (criterio: no ~ escape) | `=CONT.SE(B1:B12;"a~*b")`, `=PROCV("Car*";F1:G10;2;0)`, `=PROCV("?va";F1:G10;2;0)`, `=CORRESP("c*";F1:F10;0)`, `=CORRESP("?runo";F1:F10;0)` |
| B06 | P2 | PROCX ignores match_mode and search_mode (5th/6th args): no approximate (-1/1), no wildcard (2), no last-to-first (-1) | `=PROCX(6;D1:D5;E1:E5;;-1)` | "" | n/a (LO 24.2 lacks fn) | "cinco" | nucleo.ts:305-311 | `=PROCX(6;D1:D5;E1:E5;;-1)`, `=PROCX(6;D1:D5;E1:E5;;1)`, `=PROCX("car*";F1:F5;G1:G5;;2)`, `=PROCX(5;D1:D10;G1:G10;;0;-1)` |
| B07 | P2 | An omitted argument (`;;` or trailing `;`) is parsed as the empty text "" instead of 'missing/0': PROCX(...;;0) returns "" instead of #N/D, SE(c;;1) returns "" instead of 0, SEQUÊNCIA(2;;5) returns nothing, DESLOC(r;0;0;;) → #REF! | `=SE(A1>5;;1)` | "" | 0.0 | 0.0 | parser.ts:118 | `=SE(A1>5;;1)`, `=SOMA(DESLOC(A1:A3;0;0;;))`, `=SEQUÊNCIA(2;;5)`, `=PROCX(6;D1:D5;E1:E5;;0)` |
| B08 | P2 | Text comparison/sorting uses code points, not Excel collation: accented letters sort after Z ("É">"Z"), affects =, <, CLASSIFICAR, approximate lookups | `="Z"<"É"` | true | false | false | nucleo.ts:53 (comparar) | `="Z"<"É"`, `="É"<"F"`, `=CLASSIFICAR(F1:F10)` |
| B09 | P2 | AND/OR (E/OU) do not ignore empty cells / text reached through references (E(A1;A6) → FALSO, E(A1>0;B1) → #VALOR!), and short-circuit so later errors are not reported | `=E(A1;A6)` | false | true | true | nucleo.ts:267-268 (+ bool() at nucleo.ts:44) | `=E(A1;A6)`, `=E(FALSO;A11)`, `=E(A6:A6)`, `=OU(H1;A11)`, `=E(A1>0;B1)` |
| B10 | P2 | SOMARPRODUTO counts TRUE/FALSE as 1/0; Excel treats booleans as 0, which is why the --(cond) idiom exists. SOMARPRODUTO(F1:F10="ana") gives 2 in the simulator but 0 in Excel | `=SOMARPRODUTO(H1:H3)` | 2 | 2.0 | 1 | nucleo.ts:279 | `=SOMARPRODUTO(H1:H3)`, `=SOMARPRODUTO(F1:F10="ana")` |
| B11 | P2 | TEXTO: unsupported format codes – d/m single letters, ddd/dddd weekday names, zero padding 00000, time hh:mm, '#' with 0 | `=TEXTO(C1;"d/m/aa")` | "d/m/24" | "15/3/24" | "15/3/24" | nucleo.ts:108-125 (formatarTexto) | `=TEXTO(C1;"d/m/aa")`, `=TEXTO(C1;"dddd")`, `=TEXTO(C1;"ddd")`, `=TEXTO(42;"00000")`, `=TEXTO(0,5;"hh:mm")`, `=TEXTO(0;"#")` |
| B12 | P2 | CONT.SE/SOMASE criteria with a date written as text (">01/06/2024") are compared as text and match nothing | `=CONT.SE(C1:C12;">01/06/2024")` | 0 | 5.0 | 5.0 | nucleo.ts:64 (criterio: only plain numbers are parsed) | `=CONT.SE(C1:C12;">01/06/2024")` |
| B13 | P2 | SEQUÊNCIA(0) / SEQUÊNCIA(-1) throw an uncaught TypeError when the cell is read (should be #CALC! / #VALOR!) | `=SEQUÊNCIA(0)` | {"excecao": "uncaught exception while reading: TypeError: Cannot read properties of undefi | n/a (LO 24.2 lacks fn) | {"erro": "#CALC!"} | nucleo.ts:357 + nucleo.ts:692 (r[0][0] on an empty array) | `=SEQUÊNCIA(0)`, `=SEQUÊNCIA(-1)` |
| B14 | P2 | ÍNDICE returning an empty cell gives #REF! instead of 0; row/col 0 (whole column) unsupported; fractional indexes not truncated | `=ÍNDICE(A1:A12;6)` | {"erro": "#REF!"} | 0.0 | 0 | nucleo.ts:312 (`?? E("#REF!")` also catches null) | `=ÍNDICE(A1:A12;6)`, `=ÍNDICE(D1:E5;2,9;1)`, `=ÍNDICE(D1:E5;0;1)`, `=SOMA(ÍNDICE(D1:E5;0;1))`, `=ÍNDICE(D1:D5;-1)` |
| B15 | P2 | 2^3^2 is right-associative (512); Excel evaluates ^ left to right (64) | `=2^3^2` | 512 | 64.0 | 64 | parser.ts:143 | `=2^3^2` |
| B16 | P3 | Fractional index arguments are not truncated: PROCV col 2,7 → #REF!, ESCOLHER(2,7;…) → #VALOR!, MAIOR(…;1,5) → #NÚM!, ARRED(x;0,9) uses 10^0,9 | `=ARRED(2,5;0,9)` | 2.517850823588334 | 3.0 | 3.0 | nucleo.ts:303, 367, 258, 202 | `=ARRED(2,5;0,9)`, `=PROCV(5;D1:E5;2,7;0)`, `=ESCOLHER(2,7;"a";"b";"c")` |
| B17 | P3 | "" (empty text, e.g. a cell with ="") used in arithmetic gives 0 instead of #VALOR!; VALOR("") gives 0 | `=""+1` | 1 | {"erro": "#VALOR!"} | {"erro": "#VALOR!"} | nucleo.ts:25 (num: v === "" → 0) | `=""+1`, `=B10+1`, `=VALOR("")` |
| B18 | P3 | Number → text conversion keeps only 10 decimals ("x"&1/3 = x0,3333333333; Excel shows 15 significant digits) | `="x"&1/3` | "x0,3333333333" | "x0,333333333333333" | "x0,333333333333333" | nucleo.ts:43 (txt) | `="x"&1/3`, `=CONCAT(1/3)`, `=NÚM.CARACT(1/3)` |
| B19 | P3 | Errors inside ranges are silently ignored by MAIOR/MENOR, SOMASE/MÉDIASE (sum range), PROCV with an error key | `=MAIOR(A1:A12;1)` | 1000000 | {"erro": "#DIV/0!"} | {"erro": "#DIV/0!"} | nucleo.ts:258-259, 274, 276, 303 | `=MAIOR(A1:A12;1)`, `=MENOR(A1:A12;1)`, `=SOMASE(A1:A12;"<>0")`, `=MÉDIASE(A1:A12;"<>0")`, `=PROCV(A11;D1:E5;2;0)` |
| B20 | P3 | CONT.VALORES does not count cells holding "" from a formula, nor a literal "" argument (Excel does) | `=CONT.VALORES(B1:B12)` | 10 | 11.0 | 11.0 | nucleo.ts:251 | `=CONT.VALORES(B1:B12)`, `=CONT.VALORES(B10)`, `=CONT.VALORES(A1;A6;"")` |
| B21 | P3 | CONT.NÚM does not count numbers/booleans typed directly as arguments (CONT.NÚM("3";4)=2, CONT.NÚM(VERDADEIRO)=1 in Excel) | `=CONT.NÚM("3";4)` | 1 | 2.0 | 2.0 | nucleo.ts:250 | `=CONT.NÚM("3";4)`, `=CONT.NÚM(VERDADEIRO)` |
| B22 | P3 | Text functions accept invalid sizes/positions instead of #VALOR!: ESQUERDA/DIREITA negative, EXT.TEXTO start 0 or negative length, LOCALIZAR/PROCURAR start 0, SUBSTITUIR occurrence 0, REPT negative | `=ESQUERDA(B1;-1)` | "Maç" | {"erro": "Err:502"} | {"erro": "#VALOR!"} | nucleo.ts:316-318, 324-325, 379, 381 | `=ESQUERDA(B1;-1)`, `=DIREITA(B1;-1)`, `=EXT.TEXTO(B5;0;3)`, `=EXT.TEXTO(B5;2;-1)`, `=LOCALIZAR("a";B2;0)`, `=PROCURAR("a";B2;0)`, `=SUBSTITUIR(B2;"a";"o";0)`, `=REPT("ab";-1)` |
| B23 | P3 | LOCALIZAR ignores wildcards (* ? ~) and is accent-insensitive (LOCALIZAR("ã";"maca")=2; Excel #VALOR!) | `=LOCALIZAR("n?n";B2)` | {"erro": "#VALOR!"} | 3.0 | 3.0 | nucleo.ts:324 | `=LOCALIZAR("n?n";B2)`, `=LOCALIZAR("b*a";B2)`, `=LOCALIZAR("ã";"maca")`, `=LOCALIZAR("~*";B9)` |
| B24 | P3 | AGREGAR functions 16–19 (PERCENTIL/QUARTIL) not implemented → #VALOR! | `=AGREGAR(16;6;A1:A5;0,5)` | {"erro": "#VALOR!"} | 2.5 | 2.5 | nucleo.ts:493-527 | `=AGREGAR(16;6;A1:A5;0,5)`, `=AGREGAR(17;6;A1:A5;1)`, `=AGREGAR(19;6;A1:A5;2)` |
| B25 | P3 | DIA.DA.SEMANA types 11–17 treated as type 1; invalid type not #NÚM! | `=DIA.DA.SEMANA(C1;11)` | 6 | 5.0 | 5.0 | nucleo.ts:332 | `=DIA.DA.SEMANA(C1;11)`, `=DIA.DA.SEMANA(C1;12)`, `=DIA.DA.SEMANA(C1;16)`, `=DIA.DA.SEMANA(C1;4)` |
| B26 | P3 | DATADIF unit "YD" not supported | `=DATADIF(C5;C1;"YD")` | {"erro": "#NÚM!"} | 74.0 | 74.0 | nucleo.ts:333-341 | `=DATADIF(C5;C1;"YD")` |
| B27 | P3 | TAXA fails (#NÚM!) when the true rate is 0 (TAXA(12;-100;1200)) | `=TAXA(12;-100;1200)` | {"erro": "#NÚM!"} | 1.7046692413652312e-10 | 1.7046692413652312e-10 | nucleo.ts:554-561 (g(x) switches formula at |x|<1e-12, derivative breaks) | `=TAXA(12;-100;1200)` |
| B28 | P3 | 0^0 and POTÊNCIA(0;0) return 1 (Excel #NÚM!); (-8)^(1/3) returns #VALOR! (Excel #NÚM!) | `=0^0` | 1 | 1.0 | {"erro": "#NÚM!"} | nucleo.ts:143, 360, 149 | `=0^0`, `=(-8)^(1/3)`, `=POTÊNCIA(-8;1/3)`, `=POTÊNCIA(0;0)` |
| B29 | P3 | Literals not accepted: 1E3, ,5, array constants {1;2;3} | `=1E3` | {"rejeitada": "Há um problema na escrita desta fórmula. Confira os parênteses, os ; entre  | 1000.0 | 1000.0 | parser.ts:48 (number token), no '{' token | `=1E3`, `=,5`, `=SOMA({1;2;3})` |
| B30 | P3 | CORRESP tipo other than -1/0/1 (e.g. 2) handled as -1; CORRESP of an empty cell finds the first blank instead of #N/D; PROCV approximate with a text key in a numeric column returns the last row instead of #N/D | `=PROCV("abc";D1:E5;2;1)` | "nove" | {"erro": "#N/D"} | {"erro": "#N/D"} | nucleo.ts:313, 216 | `=PROCV("abc";D1:E5;2;1)`, `=CORRESP(6;D1:D5;2)`, `=CORRESP(A6;A1:A12;0)` |
| B31 | P3 | Mismatched range sizes not rejected: SOMARPRODUTO(D1:D5;G1:G4), CONT.SES with different-size ranges (Excel #VALOR!); SOMASE with a 1-cell sum range is not expanded like Excel | `=CONT.SES(A1:A5;">0";B1:B4;"*")` | 2 | {"erro": "Err:502"} | {"erro": "#VALOR!"} | nucleo.ts:279, 207-211, 274 | `=CONT.SES(A1:A5;">0";B1:B4;"*")`, `=SOMASE(D1:D5;">3";G1)`, `=SOMARPRODUTO(D1:D5;G1:G4)` |
| B32 | P3 | ÚNICO ignores exatamente_uma_vez; CLASSIFICAR ignores por_col and an out-of-range índice | `=ÚNICO(D1:D8;;VERDADEIRO)` | [[1], [3], [5], [7], [9], ["x"]] | n/a (LO 24.2 lacks fn) | [[1], [7], [9], ["x"]] | nucleo.ts:355-356 | `=ÚNICO(D1:D8;;VERDADEIRO)`, `=CLASSIFICAR(K1:O1;1;-1;VERDADEIRO)`, `=CLASSIFICAR(F1:G5;3)` |
| B33 | P3 | CONT.SE criterion "VERDADEIRO" does not match TRUE cells; criterion "#DIV/0!" does not match error cells; text criterion "7" does not match text '7' (while numeric 7 does) | `=CONT.SE(A1:A12;"VERDADEIRO")` | 0 | 1.0 | 1.0 | nucleo.ts:58-77 (criterio) | `=CONT.SE(A1:A12;"VERDADEIRO")`, `=CONT.SE(A1:A12;"#DIV/0!")` |
| B34 | P3 | VALOR does not parse times ("10:30"), scientific ("1e3") or accounting negatives ("(5)") | `=VALOR("10:30")` | {"erro": "#VALOR!"} | 0.4375 | 0.4375 | nucleo.ts:32-41 (textoParaNumero) | `=VALOR("10:30")`, `=VALOR("1e3")`, `=VALOR("(5)")` |
| B35 | P3 | SE/NÃO do not accept the texts "VERDADEIRO"/"FALSO" as logical values (Excel IF("TRUE";…) works) | `=SE("VERDADEIRO";1;2)` | {"erro": "#VALOR!"} | 1.0 | 1 | nucleo.ts:44 (bool) | `=SE("VERDADEIRO";1;2)`, `=SE(H7;1;2)` |

## LibreOffice-specific differences (our engine matches Excel; needs no fix)

| Formula | Ours | LibreOffice | Why |
|---|---|---|---|
| `="VERDADEIRO"+0` | {"erro": "#VALOR!"} | 1.0 | Excel: text that looks like TRUE is not coerced in arithmetic (#VALOR!); LO converts it. |
| `="x"&A8` | "xVERDADEIRO" | "x1" | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=VERDADEIRO>1` | true | false | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=SOMA(A1:A10)` | 1000020.5 | 1000021.5 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=SOMA("3";2)` | 5 | {"erro": "#VALOR!"} | Excel coerces numeric text typed directly as an argument (SOMA("3";2)=5); LO 24.2 gives #VALUE!. |
| `=SOMA(A1:A5*2)` | 2000015 | {"erro": "#VALOR!"} | Excel 365 evaluates array expressions natively; LO needs array entry. |
| `=MÉDIA(A1:A10)` | 142860.07142857142 | 125002.6875 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MÉDIA("4";2)` | 3 | {"erro": "#VALOR!"} | Excel coerces numeric text typed directly as an argument (SOMA("3";2)=5); LO 24.2 gives #VALUE!. |
| `=MÁXIMO(H1:H8)` | 1 | true | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MÁXIMO(A8;2)` | 2 | true | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MÁXIMO()` | 0 | {"erro": "Err:511"} | Formula not accepted by Excel (MÁXIMO needs ≥1 argument); not comparable. |
| `=CONT.NÚM(A1:A12)` | 8 | 9.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=CONT.NÚM(H1:H8)` | 3 | 5.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MARRED(-10;3)` | {"erro": "#NÚM!"} | -9.0 | Excel MROUND with different signs → #NÚM!; LO rounds. |
| `=MARRED(10;-3)` | {"erro": "#NÚM!"} | 9.0 | Excel MROUND with different signs → #NÚM!; LO rounds. |
| `=MAIOR(A1:A5;0)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=MAIOR(A1:A5;6)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=MAIOR(B1:B5;1)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=MENOR(A1:A10;3)` | 2.5 | 1.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MENOR(A1:A5;-1)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=MED(B1:B5)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=MED(A1:A10)` | 3 | 2.75 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=AGREGAR(9;6;A1:A12)` | 1000020.6 | 1000021.6 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=AGREGAR(1;6;A1:A12)` | 125002.575 | 111113.5111111111 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=AGREGAR(2;6;A1:A12)` | 8 | 9.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=AGREGAR(12;6;A1:A12)` | 2.75 | 2.5 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=AGREGAR(14;6;A1:A12;20)` | {"erro": "#NÚM!"} | {"erro": "#VALOR!"} | Excel: k out of range / no numbers → #NÚM! (ours); LO gives #VALUE!/Err:502. |
| `=AGREGAR(9;3;A1:A12)` | 1000020.6 | 1000021.6 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=SUBTOTAL(2;A1:A12)` | 8 | 9.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=ÉNÚM(A8)` | false | true | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=CONT.SE(A1:A12;">0")` | 6 | 7.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=CONT.SE(B1:B12;"*")` | 10 | 11.0 | Excel COUNTIF "*" matches only text (ours 10); LO also matches numbers. |
| `=CONT.SE(H1:H8;1)` | 1 | 2.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=CONT.SE(H1:H8;"<>0")` | 7 | 6.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=SOMASES(A1:A12;A1:A12;">0")` | 1000025.6 | 1000026.6 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=PROCV(5;D1:E5;3;0)` | {"erro": "#REF!"} | {"erro": "Err:502"} | Error type only: Excel #REF! (ours) vs LO Err:502. |
| `=PROCV("5";D1:E5;2;0)` | {"erro": "#N/D"} | "cinco" | Excel lookups do not match text "5" with number 5 (#N/D, ours); LO does. |
| `=PROCH(30;K1:O3;4;0)` | {"erro": "#REF!"} | {"erro": "Err:502"} | Error type only: Excel #REF! (ours) vs LO Err:502. |
| `=CORRESP(1;H1:H8;0)` | 3 | 1.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=DESLOC(A1;-1;0)` | {"erro": "#REF!"} | {"erro": "Err:502"} | Error type only: Excel #REF! (ours) vs LO Err:502. |
| `=DESLOC(D1;0;0;0;1)` | {"erro": "#REF!"} | {"erro": "Err:502"} | Error type only: Excel #REF! (ours) vs LO Err:502. |
| `=CONCAT(A1;A6;A8)` | "10VERDADEIRO" | "101" | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=ESQUERDA(A8;3)` | "VER" | "1" | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=NÚM.CARACT(A8)` | 10 | 1.0 | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=MAIÚSCULA(A8)` | "VERDADEIRO" | "1" | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=LOCALIZAR("";B2)` | 1 | {"erro": "#VALOR!"} | Excel SEARCH/FIND("";…) = 1 (ours); LO #VALUE!. |
| `=PROCURAR("";B2)` | 1 | {"erro": "#VALOR!"} | Excel SEARCH/FIND("";…) = 1 (ours); LO #VALUE!. |
| `=UNIRTEXTO("/";1;A8;A4)` | "VERDADEIRO/2,5" | "1/2,5" | LO stores TRUE as the number 1 (no boolean type); Excel ignores booleans in ranges / shows VERDADEIRO. Our engine matches Excel. |
| `=DATA(24;1;1)` | 8767 | 45292.0 | Excel DATE(24;1;1) = 1924-01-01 (years 0-1899 add 1900); LO applies its 2-digit-year rule (2024). |
| `=NÚMSEMANA(C7)` | 53 | 1.0 | Excel WEEKNUM(30/12/2024;1|2) = 53 (ours); LO returns 1. |
| `=NÚMSEMANA(C7;2)` | 53 | 1.0 | Excel WEEKNUM(30/12/2024;1|2) = 53 (ours); LO returns 1. |

## Ambiguous (needs confirmation in real Excel)

| Formula | Ours | LibreOffice | Note |
|---|---|---|---|
| `=MAIOR(A1:A5;1,5)` | {"erro": "#NÚM!"} | 10.0 | Excel LARGE with fractional k: LO truncates (10); ours #NÚM!. Likely B16 but needs Excel confirmation. |
| `=NÃO("FALSO")` | {"erro": "#VALOR!"} | true | Excel NOT("FALSE") text coercion uncertain. |
| `=CONT.SE(A1:A12;7)` | 1 | 0.0 | Excel COUNTIF numeric 7 vs text '7': LO counts the text only for "7"; ours only for 7. Needs Excel confirmation. |
| `=CONT.SE(A1:A12;"7")` | 0 | 1.0 | Excel COUNTIF numeric 7 vs text '7': LO counts the text only for "7"; ours only for 7. Needs Excel confirmation. |
| `=CONT.SE(B1:B12;"<>")` | 10 | 11.0 | Excel COUNTIF(range;"<>") probably counts cells with ="" as non-empty (LO does); ours does not. Needs Excel confirmation. |
| `=PROCV(5;D1:E5;0;0)` | {"erro": "#REF!"} | {"erro": "Err:502"} | PROCV col_index 0 → Excel #VALOR! (ours #REF!, LO Err:502). Error type only. |
| `=MAIÚSCULA("straße")` | "STRASSE" | "STRAẞE" | Excel UPPER("straße") keeps ß; JS gives STRASSE; LO gives ẞ. |
| `=TEXTO(1234,5;"General")` | "general" | "1234,5" | TEXTO format "General" is "Geral" in pt-BR Excel; not a fair test. |
| `=DATADIF(C3;DATA(2024;3;1);"MD")` | 1 | -1.0 | DATADIF "MD" is documented as unreliable in Excel. |
| `=DIVIDIRTEXTO("";",")` | "" | — | TEXTSPLIT of an empty string: Excel result uncertain (#CALC! assumed). |
| `=LET(a;1;b)` | {"rejeitada": "Há um problema na escrita desta fórmula. Conf | — | LET with an undefined name: Excel accepts the formula and shows #NOME?; the simulator rejects it while typing (arguably fine). |
| `=PROCX(A6;D1:D10;E1:E10)` | "vazio" | — | PROCX with an empty lookup cell: ours matches a blank row; Excel behaviour needs confirmation. |

## Notes on the most important bugs

- **B01 (hang)**: `=DIATRABALHO(C1;2,9)` or `;0,5` loops forever (`n` goes 2.9→1.9→0.9→-0.1…, never 0). In the browser this freezes the tab. Any fractional `dias` (e.g. a computed `=B2/2`) triggers it. Fix: `n = Math.trunc(n)`.
- **B02**: `=MÉDIA(B2;B3;B4)` with one empty cell divides by 3 instead of 2; `=MÁXIMO(A2;A6)` with negatives returns 0; `=SOMA(B1)` on a text cell gives #VALOR! (Excel 0). `numericos` must ignore non-numbers when the argument is a `ref` node (only literal/computed scalars are coerced).
- **B03**: `PROCV(x;A:B;2;0)` / `SOMA(C:C)` are extremely common in tutorials and are rejected as a syntax error.
- **B04**: a formula pointing at an empty cell shows blank instead of 0 (Excel shows 0), and later formulas see it as empty.
- **B13**: `SEQUÊNCIA(0)` throws a TypeError out of `Planilha.valor()` (would crash the React render, not just show an error).

## Files / how to re-run

- Report: this file. Machine-readable results (per case: formula, English formula, ours, LO, Excel expectation, status, verdict, bug id): `revisao/diferencial/results.json` (also `corpus.json`, `ours.json`, `lo.json`, `hangs.json`, `corpus.xlsx`).
- Re-run everything: `bash /tmp/claude-0/-home-user-excel-exercises-br/4fb5383a-9cc7-5eb2-9dd1-c4d53f82e443/scratchpad/revisao/diferencial/run.sh` (≈1 min; needs openpyxl + LibreOffice with python3-uno; the temporary `*.diferencial.tmp.test.ts` is deleted automatically). Add cases at the end of `corpus.py` to keep ids stable; new non-passing cases are printed as `UNCLASSIFIED` by `classify.py`.
