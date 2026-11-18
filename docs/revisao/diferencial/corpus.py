"""Corpus for differential testing of the pt-BR formula engine vs LibreOffice.

Writes corpus.json: {"data": {cell: {"ours": entrada, "lo": value}}, "cases": [...]}
Each case: id, f (pt-BR formula), en (English formula for LO, auto-translated
unless overridden), lo (bool: whether LO 24.2 can evaluate it), exp (optional
real-Excel expectation used when LO can't evaluate it, or when LO is known to
differ from Excel), extra (optional extra cells), note.
"""
import datetime, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))


def serial(d, m, y):
    return (datetime.date(y, m, d) - datetime.date(1899, 12, 30)).days


# ---------------- shared data block ----------------
D = {}
def put(cell, ours, lo):
    D[cell] = {"ours": ours, "lo": lo}

# A: numbers
for cell, ours, lo in [
    ("A1", "10", 10), ("A2", "-5", -5), ("A3", "0", 0), ("A4", "2,5", 2.5), ("A5", "1000000", 1000000),
    ("A7", "'7", "7"), ("A8", "VERDADEIRO", True), ("A9", "3", 3), ("A10", "10", 10), ("A11", "=1/0", "=1/0"), ("A12", "0,1", 0.1),
]:
    put(cell, ours, lo)
# B: text
for cell, v in [("B1", "Maçã"), ("B2", "banana"), ("B3", "  Uva  "), ("B4", "MAÇÃ"), ("B5", "Pêra verde"), ("B7", "abc"),
                ("B8", "ABC"), ("B9", "a*b"), ("B11", "Ana Maria  da Silva")]:
    put(cell, v, v)
put("B10", '=""', '=""')
put("B12", "123", 123)
# C: dates
DATES = {"C1": (15, 3, 2024), "C2": (29, 2, 2024), "C3": (31, 1, 2024), "C4": (31, 12, 2023), "C5": (1, 1, 2024),
         "C6": (28, 2, 2023), "C7": (30, 12, 2024), "C8": (1, 1, 2021), "C9": (25, 12, 2024), "C10": (1, 1, 2025),
         "C11": (31, 8, 2024), "C12": (3, 1, 2027)}
for cell, (d, m, y) in DATES.items():
    put(cell, f"{d:02d}/{m:02d}/{y}", serial(d, m, y))
# D/E: sorted lookup table + extra rows
for i, (dv, ev) in enumerate([(1, "um"), (3, "três"), (5, "cinco"), (7, "sete"), (9, "nove"), (5, "cinco2"), ("x", "xis"), (3, "três2"), (None, "vazio"), (7, "sete2")]):
    if dv is not None:
        put(f"D{i+1}", ("'" + dv) if isinstance(dv, str) else str(dv), dv)
    put(f"E{i+1}", ev, ev)
# F/G: names + values
for i, (fv, gv) in enumerate([("Ana", 100), ("bruno", 200), ("Carla", 300), ("davi", 400), ("Eva", 500), ("Ana", 600), ("Éder", 700), ("carla", 800), ("Zé", 900), ("ana ", 1000)]):
    put(f"F{i+1}", fv, fv)
    put(f"G{i+1}", str(gv), gv)
# H: mixed
for cell, ours, lo in [("H1", "VERDADEIRO", True), ("H2", "FALSO", False), ("H3", "1", 1), ("H4", "texto", "texto"), ("H6", "0", 0), ("H7", "'VERDADEIRO", "VERDADEIRO"), ("H8", "-1", -1)]:
    put(cell, ours, lo)
# I: descending
for i, v in enumerate([9, 7, 5, 3, 1]):
    put(f"I{i+1}", str(v), v)
# K1:O3 horizontal table
for j, col in enumerate("KLMNO"):
    put(f"{col}1", str((j + 1) * 10), (j + 1) * 10)
    put(f"{col}2", "abcde"[j], "abcde"[j])
    put(f"{col}3", str(j + 1) + ",5", j + 1.5)
put("K5", "a,b,,c", "a,b,,c")
put("K6", "nome=Ana;idade=30", "nome=Ana;idade=30")
put("K7", "um dois  tres", "um dois  tres")

# ---------------- cases ----------------
CASES = []
def c(f, **kw):
    kw["f"] = f
    CASES.append(kw)

NEW = dict(lo=False)  # LO 24.2 lacks the function: use exp

# --- operators / precedence / coercion ---
for f in ["=1+2*3", "=(1+2)*3", "=-2^2", "=2^-1", "=2^3^2", "=-3^2", "=2*-3^2", "=10-2-3", "=100/10/2", "=50%", "=50%^2", "=A1%", "=10%%",
          "=-A2", "=--A7", '="3"+2', '=" 3 "+2', '="1.234,5"+0', '="1,5"*2', '="50%"+0', '="R$ 10"+1', '="abc"+1', '=""+1', "=B10+1",
          "=A8+1", "=VERDADEIRO+VERDADEIRO", '="VERDADEIRO"+0', "=A6+1", "=A6*2", "=1/A6", "=1/A3", "=A11+1", "=0^0", "=(-8)^(1/3)",
          "=10^309", "=2^0,5", "=A4*A12", "=0,1+0,2", '="a"&"b"', '="a"&1+2', '=1&2', '="x"&A8', '="x"&A6&"y"', '="x"&A4', '="x"&1/3',
          '="x"&1000000*1000000', '="x"&A11', "=1=1", "=1<2", '="a"="A"', '="a"<"b"', '="B">"a"', '="10">5', '="10"=10', "=VERDADEIRO>1",
          "=FALSO<0", "=A6=0", '=A6=""', "=A6=FALSO", "=B10=A6", "=B10=0", '="Maçã"=B4', '="abc"<"abd"', '="Z"<"É"', '="É"<"F"', '="e"<"É"',
          "=1<2=VERDADEIRO", "=5-3=2", '="5"-"3"', "=A1+A2*A3-A4/A9", "=(A1+A2)*(A3-A4)/A9", "=$A$1+A$2+$A3", "=a1+b12", "= A1 + A2 ",
          "=+A1", "=1+-2", "=-(-A1)", "=2*(3+(4-1))", "=A1:A3", "=SOMA(A3:A1)", "=1E3", "=,5", "=SOMA(A:A)", "=SOMA(1:1)",
          "=SOMA({1;2;3})", "=10/3", "=1-0,9", "=A5*A5*A5*A5", "=-0", "=A2^2", "=-A2^2", "=A2%", "=5%*A1"]:
    c(f, tag="op")

# --- SOMA / MÉDIA / MÍNIMO / MÁXIMO ---
for f in ["=SOMA(A1:A5)", "=SOMA(A1:A12)", "=SOMA(A1:A10)", "=SOMA(A1;A2;A3)", "=SOMA(A7)", "=SOMA(A8)", "=SOMA(B1)", '=SOMA("3";2)',
          "=SOMA(VERDADEIRO;1)", '=SOMA("abc";1)', "=SOMA(A6)", "=SOMA(A1;;A2)", "=SOMA(B1:B5)", "=SOMA(A1:A5;10)", "=SOMA(A1:A5*2)",
          "=SOMA(A11)", "=SOMA()",
          "=MÉDIA(A1:A5)", "=MÉDIA(A1:A10)", "=MÉDIA(A1;A6)", "=MÉDIA(A1;A7)", "=MÉDIA(A1;A8)", "=MÉDIA(B1:B5)", "=MÉDIA(A6)", "=MÉDIA(A1:A12)",
          "=MÉDIA(A1;2;3)", '=MÉDIA("4";2)',
          "=MÍNIMO(A1:A5)", "=MÍNIMO(A1:A10)", "=MÍNIMO(B1:B5)", "=MÍNIMO(A1;A6)", "=MÍNIMO(A9;A6)", "=MÍNIMO(A1:A12)", "=MÍNIMO(A7;A9)",
          "=MÁXIMO(A1:A5)", "=MÁXIMO(A2;A6)", "=MÁXIMO(A2:A3;-10)", "=MÁXIMO(H1:H8)", "=MÁXIMO(A8;2)", "=MÁXIMO(C1:C12)", "=MÁXIMO(A2;A8)",
          "=MÍNIMO(VERDADEIRO;5)", "=MÁXIMO()"]:
    c(f, tag="agg")

# --- CONT.* ---
for f in ["=CONT.NÚM(A1:A12)", "=CONT.NÚM(B1:B12)", "=CONT.NÚM(A1;B1;A6)", '=CONT.NÚM("3";4)', "=CONT.NÚM(VERDADEIRO)", "=CONT.NÚM(H1:H8)",
          "=CONT.VALORES(A1:A12)", "=CONT.VALORES(B1:B12)", "=CONT.VALORES(A6)", "=CONT.VALORES(B10)", "=CONT.VALORES(A1;A6;\"\")",
          "=CONTAR.VAZIO(A1:A12)", "=CONTAR.VAZIO(B1:B12)", "=CONTAR.VAZIO(H1:H8)", "=CONTAR.VAZIO(D1:D10)"]:
    c(f, tag="count")

# --- rounding ---
for f in ["=ARRED(2,5;0)", "=ARRED(-2,5;0)", "=ARRED(1,005;2)", "=ARRED(1234,567;-2)", "=ARRED(2,345;2)", "=ARRED(A4;0)", '=ARRED("2,6";0)',
          "=ARRED(0,5;0)", "=ARRED(1,45;1)", "=ARRED(-1,45;1)", "=ARRED(123456789,123456;3)", "=ARRED(2,5;0,9)", "=ARRED(B1;0)", "=ARRED(A11;0)",
          "=ARREDONDAR.PARA.CIMA(2,1;0)", "=ARREDONDAR.PARA.CIMA(-2,1;0)", "=ARREDONDAR.PARA.CIMA(3,14159;3)", "=ARREDONDAR.PARA.CIMA(1234;-2)",
          "=ARREDONDAR.PARA.CIMA(2;0)", "=ARREDONDAR.PARA.CIMA(0,1+0,2;1)", '=ARREDONDAR.PARA.CIMA("abc";0)',
          "=ARREDONDAR.PARA.BAIXO(2,9;0)", "=ARREDONDAR.PARA.BAIXO(-2,9;0)", "=ARREDONDAR.PARA.BAIXO(3,14159;2)", "=ARREDONDAR.PARA.BAIXO(1299;-2)",
          "=ARREDONDAR.PARA.BAIXO(4,35*100;0)",
          "=TRUNCAR(2,7)", "=TRUNCAR(-2,7)", "=TRUNCAR(3,14159;2)", "=TRUNCAR(1234;-2)", "=TRUNCAR(-0,5)", '=TRUNCAR("abc")',
          "=INT(2,7)", "=INT(-2,5)", "=INT(-2)", "=INT(A4)", "=INT(C1+0,75)", '=INT("x")',
          "=ABS(-3)", "=ABS(A2)", "=ABS(A6)", '=ABS("-4")', "=ABS(B1)",
          "=MOD(10;3)", "=MOD(-5;3)", "=MOD(5;-3)", "=MOD(-5;-3)", "=MOD(5,5;2)", "=MOD(10;0)", "=MOD(0;5)", "=MOD(A1;A9)",
          "=POTÊNCIA(2;10)", "=POTÊNCIA(2;0,5)", "=POTÊNCIA(-8;1/3)", "=POTÊNCIA(0;0)", "=POTÊNCIA(0;-1)", "=POTÊNCIA(A2;2)",
          "=RAIZ(16)", "=RAIZ(-1)", "=RAIZ(A6)", "=RAIZ(2)", '=RAIZ("9")',
          "=MARRED(10;3)", "=MARRED(-10;-3)", "=MARRED(-10;3)", "=MARRED(10;-3)", "=MARRED(1,3;0,2)", "=MARRED(7,5;5)", "=MARRED(2,5;5)",
          "=MARRED(5;0)", "=MARRED(0;5)", "=MARRED(1,25;0,05)", "=MARRED(A1;A9)", "=MARRED(-7,5;-5)"]:
    c(f, tag="round")

# --- MAIOR / MENOR / MED ---
for f in ["=MAIOR(A1:A5;1)", "=MAIOR(A1:A5;2)", "=MAIOR(A1:A10;2)", "=MAIOR(A1:A5;0)", "=MAIOR(A1:A5;6)", "=MAIOR(A1:A5;1,5)", "=MAIOR(A1:A12;1)",
          "=MAIOR(B1:B5;1)", "=MAIOR(G1:G10;3)",
          "=MENOR(A1:A5;1)", "=MENOR(A1:A10;3)", "=MENOR(D1:D10;2)", "=MENOR(A1:A5;-1)", "=MENOR(A1:A12;1)", "=MENOR(H1:H8;1)",
          "=MED(A1:A5)", "=MED(A1:A4)", "=MED(1;2;3;4)", "=MED(B1:B5)", "=MED(A1:A10)", "=MED(A6)", "=MED(A1:A12)"]:
    c(f, tag="kth")

# --- AGREGAR / SUBTOTAL ---
for f in ["=AGREGAR(9;6;A1:A12)", "=AGREGAR(9;0;A1:A12)", "=AGREGAR(14;6;A1:A12;1)", "=AGREGAR(14;6;A1:A12;2)", "=AGREGAR(15;6;A1:A12;1)",
          "=AGREGAR(1;6;A1:A12)", "=AGREGAR(2;6;A1:A12)", "=AGREGAR(3;6;A1:A12)", "=AGREGAR(4;6;A1:A12)", "=AGREGAR(5;6;A1:A12)",
          "=AGREGAR(6;6;A1:A4)", "=AGREGAR(7;6;A1:A5)", "=AGREGAR(8;6;A1:A5)", "=AGREGAR(10;6;A1:A5)", "=AGREGAR(11;6;A1:A5)",
          "=AGREGAR(12;6;A1:A12)", "=AGREGAR(13;6;A1:A12)", "=AGREGAR(13;6;D1:D10)", "=AGREGAR(14;6;A1:A12;20)", "=AGREGAR(16;6;A1:A5;0,5)",
          "=AGREGAR(17;6;A1:A5;1)", "=AGREGAR(19;6;A1:A5;2)", "=AGREGAR(9;8;A1:A5)", "=AGREGAR(9;3;A1:A12)", "=AGREGAR(4;6;B1:B5)",
          "=AGREGAR(14;6;G1:G10/(F1:F10=\"Ana\");1)", "=AGREGAR(9;6;A1:A5;G1:G2)",
          "=SUBTOTAL(9;A1:A5)", "=SUBTOTAL(9;A1:A12)", "=SUBTOTAL(1;A1:A5)", "=SUBTOTAL(2;A1:A12)", "=SUBTOTAL(3;A1:A12)", "=SUBTOTAL(4;A1:A5)",
          "=SUBTOTAL(5;A1:A5)", "=SUBTOTAL(6;A1:A4)", "=SUBTOTAL(7;A1:A5)", "=SUBTOTAL(8;A1:A5)", "=SUBTOTAL(10;A1:A5)", "=SUBTOTAL(11;A1:A5)",
          "=SUBTOTAL(109;A1:A5)", "=SUBTOTAL(9;A1:A5;G1:G3)", "=SUBTOTAL(12;A1:A5)", "=SUBTOTAL(4;B1:B5)", "=SUBTOTAL(1;B1:B5)"]:
    c(f, tag="aggregate")

# --- logic ---
for f in ['=SE(A1>5;"sim";"não")', '=SE(A1>50;"sim";"não")', '=SE(A1>50;"sim")', "=SE(A1>5;;1)", '=SE(A6;"v";"f")', '=SE(A3;"v";"f")',
          '=SE(A2;"v";"f")', '=SE(B1;"v";"f")', '=SE("VERDADEIRO";1;2)', '=SE(H7;1;2)', '=SE(A11;1;2)', '=SE(A1>5;A11;1)', "=SE(1;2)",
          '=SE(SOMA(A1:A5)>100;"grande";"pequeno")', '=SE(E(A1>5;A2<0);"ok";"x")', '=SE(A12;"v";"f")', '=SE(VERDADEIRO;"")',
          '=SES(A1>50;"a";A1>5;"b";VERDADEIRO;"c")', '=SES(A1>50;"a";A1>40;"b")', '=SES(A1>5;"a")', '=SES(B1;1;VERDADEIRO;2)', '=SES(A3;1;A1;2)',
          "=E(VERDADEIRO;VERDADEIRO)", "=E(VERDADEIRO;FALSO)", "=E(A1>5;A2<0;A3=0)", "=E(A1:A3)", "=E(A1;A6)", "=E(H1:H3)", "=E(H1:H6)", "=E(B1)",
          '=E("VERDADEIRO";1)', "=E(A11;FALSO)", "=E(FALSO;A11)", "=E(A6:A6)", "=E(B1:B2)",
          "=OU(FALSO;FALSO)", "=OU(A1>50;A2<0)", "=OU(A3;A6)", "=OU(H2:H6)", "=OU(B1:B5)", "=OU(A3:A3)", "=OU(H1;A11)",
          "=NÃO(VERDADEIRO)", "=NÃO(A3)", "=NÃO(A1)", "=NÃO(A6)", "=NÃO(B1)", '=NÃO("FALSO")',
          "=SEERRO(1/0;\"erro\")", "=SEERRO(A11;0)", "=SEERRO(A1;0)", "=SEERRO(A6;0)", '=SEERRO(PROCV(99;D1:E5;2;0);"não achou")', "=SEERRO(\"\";1)",
          '=SENÃODISP(PROCV(99;D1:E5;2;0);"nd")', '=SENÃODISP(1/0;"nd")', '=SENÃODISP(A1;"nd")',
          "=ÉERROS(A11)", "=ÉERROS(A1)", "=ÉERROS(1/0)", "=ÉERROS(PROCV(99;D1:E5;2;0))", "=ÉERROS(B1)",
          "=ÉCÉL.VAZIA(A6)", "=ÉCÉL.VAZIA(A1)", "=ÉCÉL.VAZIA(B10)", '=ÉCÉL.VAZIA("")', "=ÉCÉL.VAZIA(A3)",
          "=ÉNÚM(A1)", "=ÉNÚM(A7)", "=ÉNÚM(A6)", "=ÉNÚM(A8)", "=ÉNÚM(C1)", '=ÉNÚM("3")', "=ÉNÚM(A11)",
          "=ÉTEXTO(B1)", "=ÉTEXTO(A7)", "=ÉTEXTO(A6)", "=ÉTEXTO(B10)", "=ÉTEXTO(A1)", "=ÉTEXTO(H7)"]:
    c(f, tag="logic")

# --- conditional aggregation ---
for f in ['=CONT.SE(A1:A12;">0")', '=CONT.SE(A1:A12;10)', '=CONT.SE(A1:A12;"10")', '=CONT.SE(A1:A12;"=10")', '=CONT.SE(A1:A12;7)',
          '=CONT.SE(A1:A12;"7")', '=CONT.SE(A1:A12;"<>10")', '=CONT.SE(A1:A12;"<>")', '=CONT.SE(A1:A12;"")', '=CONT.SE(A1:A12;"=")',
          '=CONT.SE(A1:A12;">=2,5")', '=CONT.SE(A1:A12;"<0")', '=CONT.SE(A1:A12;VERDADEIRO)', '=CONT.SE(A1:A12;"VERDADEIRO")',
          '=CONT.SE(B1:B12;"maçã")', '=CONT.SE(B1:B12;"*a*")', '=CONT.SE(B1:B12;"?b?")', '=CONT.SE(B1:B12;"a~*b")', '=CONT.SE(B1:B12;"a*b")',
          '=CONT.SE(B1:B12;"Uva")', '=CONT.SE(B1:B12;"*Uva*")', '=CONT.SE(B1:B12;">b")', '=CONT.SE(B1:B12;"<>abc")', '=CONT.SE(B1:B12;"*")',
          '=CONT.SE(B1:B12;"")', '=CONT.SE(B1:B12;"<>")', '=CONT.SE(F1:F10;"ana")', '=CONT.SE(F1:F10;"ana*")', '=CONT.SE(F1:F10;"<C")',
          '=CONT.SE(C1:C12;">"&DATA(2024;6;30))', '=CONT.SE(C1:C12;">01/06/2024")', '=CONT.SE(C1:C12;C1)', '=CONT.SE(A1:A12;A6)',
          '=CONT.SE(A1:A12;">"&A9)', '=CONT.SE(D1:D10;5)', '=CONT.SE(H1:H8;1)', '=CONT.SE(H1:H8;"<>0")', '=CONT.SE(A1:A12;"> 3")',
          '=CONT.SE(B1:B12;123)', '=CONT.SE(B1:B12;"123")', '=CONT.SE(A1:A12;"#DIV/0!")', '=CONT.SE(G1:G10;">=500")',
          '=CONT.SES(F1:F10;"ana";G1:G10;">100")', '=CONT.SES(D1:D10;">2";E1:E10;"*2")', '=CONT.SES(A1:A5;">0";A1:A5;"<100")',
          '=CONT.SES(C1:C12;">="&DATA(2024;1;1);C1:C12;"<="&DATA(2024;12;31))', '=CONT.SES(A1:A5;">0";B1:B4;"*")',
          '=SOMASE(F1:F10;"ana";G1:G10)', '=SOMASE(G1:G10;">500")', '=SOMASE(D1:D10;5;G1:G10)', '=SOMASE(D1:D10;">=5";G1:G10)',
          '=SOMASE(F1:F10;"*a*";G1:G10)', '=SOMASE(A1:A12;"<>0")', '=SOMASE(D1:D10;"x";G1:G10)', '=SOMASE(D1:D5;">3";G1)',
          '=SOMASE(E1:E10;"três*";D1:D10)', '=SOMASE(F1:F10;F2;G1:G10)', '=SOMASE(A1:A12;"")', '=SOMASE(D1:D10;"";G1:G10)',
          '=SOMASES(G1:G10;F1:F10;"ana";D1:D10;">2")', '=SOMASES(G1:G10;D1:D10;">=3";D1:D10;"<=7")', '=SOMASES(G1:G10;F1:F10;"<>ana")',
          '=SOMASES(G1:G5;F1:F5;"*")', '=SOMASES(A1:A12;A1:A12;">0")',
          '=MÉDIASE(F1:F10;"ana";G1:G10)', '=MÉDIASE(G1:G10;">500")', '=MÉDIASE(F1:F10;"zz";G1:G10)', '=MÉDIASE(A1:A12;"<>0")', '=MÉDIASE(D1:D10;3;G1:G10)',
          '=MÁXIMOSES(G1:G10;F1:F10;"ana")', '=MÁXIMOSES(G1:G10;F1:F10;"zz")', '=MÁXIMOSES(G1:G10;D1:D10;">3";D1:D10;"<9")',
          '=MÍNIMOSES(G1:G10;F1:F10;"ana")', '=MÍNIMOSES(G1:G10;D1:D10;5)', '=MÍNIMOSES(A1:A5;A1:A5;"<>0")', '=MÍNIMOSES(G1:G10;F1:F10;"zz")',
          "=SOMARPRODUTO(D1:D5;G1:G5)", "=SOMARPRODUTO((D1:D5>3)*G1:G5)", "=SOMARPRODUTO(--(F1:F10=\"ana\");G1:G10)", "=SOMARPRODUTO(D1:D10;G1:G10)",
          "=SOMARPRODUTO(A1:A5)", "=SOMARPRODUTO(D1:D5;G1:G4)", "=SOMARPRODUTO(H1:H3)", "=SOMARPRODUTO((F1:F10=\"ana\")*1)", "=SOMARPRODUTO(F1:F10=\"ana\")",
          "=SOMARPRODUTO(A1:A12)", "=SOMARPRODUTO(D1:D5*2)", "=SOMARPRODUTO(D1:D5;D1:D5;D1:D5)"]:
    c(f, tag="cond")

# --- lookup ---
for f in ["=PROCV(5;D1:E5;2;0)", "=PROCV(5;D1:E5;2;FALSO)", "=PROCV(6;D1:E5;2;0)", "=PROCV(6;D1:E5;2)", "=PROCV(6;D1:E5;2;1)", "=PROCV(0;D1:E5;2)",
          "=PROCV(100;D1:E5;2)", "=PROCV(5;D1:E5;3;0)", "=PROCV(5;D1:E5;0;0)", "=PROCV(5;D1:E5;2,7;0)", '=PROCV("ana";F1:G10;2;0)', '=PROCV("ANA";F1:G10;2;0)',
          '=PROCV("Car*";F1:G10;2;0)', '=PROCV("?va";F1:G10;2;0)', '=PROCV("zz";F1:G10;2;0)', '=PROCV("5";D1:E5;2;0)', "=PROCV(5;D1:E5;2;)",
          '=PROCV("x";D1:E10;2;0)', "=PROCV(A11;D1:E5;2;0)", "=PROCV(3;D1:G5;4;0)", "=PROCV(3;D1:G5;3;0)", '=PROCV("Éder";F1:G10;2;0)', '=PROCV("eder";F1:G10;2;0)',
          "=PROCV(5;D1:E10;2;0)", "=PROCV(3;D1:E10;2;VERDADEIRO)", '=PROCV("abc";D1:E5;2;1)', '=PROCV("c";F1:G5;2;1)', "=PROCV(A9;D1:E5;2;0)",
          '=PROCV(" Ana";F1:G10;2;0)', '=PROCV("ana ";F1:G10;2;0)', "=PROCV(9;D1:E5;2;1)", "=PROCV(4,99;D1:E5;2)",
          "=PROCH(30;K1:O3;2;0)", "=PROCH(30;K1:O3;3;0)", "=PROCH(35;K1:O3;2)", "=PROCH(35;K1:O3;2;0)", "=PROCH(5;K1:O3;2)", "=PROCH(30;K1:O3;4;0)",
          "=PROCH(60;K1:O3;3;1)", '=PROCH("c";K2:O3;2;0)',
          "=ÍNDICE(D1:E5;3;2)", "=ÍNDICE(D1:D5;2)", "=ÍNDICE(K1:O1;3)", "=ÍNDICE(K1:O1;1;3)", "=ÍNDICE(D1:E5;6;1)", "=ÍNDICE(D1:E5;1;3)", "=ÍNDICE(A1:A12;6)",
          "=ÍNDICE(D1:E5;2,9;1)", "=ÍNDICE(D1:E5;0;1)", "=SOMA(ÍNDICE(D1:E5;0;1))", "=ÍNDICE(D1:D5;-1)", "=ÍNDICE(G1:G10;CORRESP(\"Carla\";F1:F10;0))",
          "=ÍNDICE(D1:E5;CORRESP(7;D1:D5;0);2)", "=ÍNDICE(K1:O3;2;2)",
          "=CORRESP(5;D1:D5;0)", "=CORRESP(6;D1:D5;0)", "=CORRESP(6;D1:D5)", "=CORRESP(6;D1:D5;1)", "=CORRESP(0;D1:D5;1)", "=CORRESP(6;I1:I5;-1)",
          "=CORRESP(10;I1:I5;-1)", "=CORRESP(0;I1:I5;-1)", '=CORRESP("carla";F1:F10;0)', '=CORRESP("c*";F1:F10;0)', '=CORRESP("?runo";F1:F10;0)',
          "=CORRESP(6;D1:D5;2)", "=CORRESP(6;D1:D5;-2)", "=CORRESP(30;K1:O1;0)", "=CORRESP(5;D1:D10;0)", '=CORRESP("x";D1:D10;0)', "=CORRESP(A6;A1:A12;0)",
          '=CORRESP("b";F1:F5;1)', "=CORRESP(9;D1:D5;1)", "=CORRESP(VERDADEIRO;H1:H8;0)", "=CORRESP(1;H1:H8;0)",
          '=ESCOLHER(2;"a";"b";"c")', '=ESCOLHER(4;"a";"b";"c")', '=ESCOLHER(0;"a";"b")', '=ESCOLHER(2,7;"a";"b";"c")', "=ESCOLHER(1;A1;A2)",
          '=ESCOLHER("2";"a";"b")', "=SOMA(ESCOLHER(2;A1:A2;D1:D5))", '=ESCOLHER(A8;"x";"y")',
          "=DESLOC(A1;2;0)", "=DESLOC(A1;0;3)", "=SOMA(DESLOC(D1;0;0;3;1))", "=SOMA(DESLOC(D1:D2;1;0))", "=DESLOC(A1;-1;0)", "=DESLOC(A1;5;0)",
          "=SOMA(DESLOC(D1;1;0;2;2))", "=DESLOC(D1;0;0;0;1)", "=DESLOC(B1;0;0)", "=SOMA(DESLOC(A1:A3;0;0;;))"]:
    c(f, tag="lookup")

# --- text ---
for f in ['=CONCAT("a";"b";1)', "=CONCAT(F1:F3)", "=CONCAT(A1;A6;A8)", "=CONCAT(A4)", "=CONCAT(A11;1)", '=CONCATENAR("a";" ";B1)', "=CONCATENAR(A1;A12)",
          "=CONCATENAR(C1)", '=CONCAT(1/3)',
          "=ESQUERDA(B1;2)", "=ESQUERDA(B1)", "=ESQUERDA(B1;0)", "=ESQUERDA(B1;10)", "=ESQUERDA(B1;-1)", "=ESQUERDA(A4;1)", "=ESQUERDA(A5;3)", "=ESQUERDA(A8;3)",
          "=ESQUERDA(B1;2,9)", "=ESQUERDA(A6;2)",
          "=DIREITA(B1;2)", "=DIREITA(B1)", "=DIREITA(B1;0)", "=DIREITA(B1;10)", "=DIREITA(B1;-1)", "=DIREITA(A1;1)", "=DIREITA(C1;2)",
          "=EXT.TEXTO(B5;2;3)", "=EXT.TEXTO(B5;1;100)", "=EXT.TEXTO(B5;20;3)", "=EXT.TEXTO(B5;0;3)", "=EXT.TEXTO(B5;2;0)", "=EXT.TEXTO(B5;2;-1)",
          "=EXT.TEXTO(A5;2;3)",
          "=NÚM.CARACT(B1)", "=NÚM.CARACT(B3)", "=NÚM.CARACT(A6)", "=NÚM.CARACT(A4)", "=NÚM.CARACT(A8)", "=NÚM.CARACT(1/3)", "=NÚM.CARACT(C1)", "=NÚM.CARACT(A11)",
          "=ARRUMAR(B3)", "=ARRUMAR(B11)", '=ARRUMAR("  a   b  ")', "=NÚM.CARACT(ARRUMAR(B3))", "=ARRUMAR(A4)",
          "=MAIÚSCULA(B1)", "=MAIÚSCULA(B5)", "=MAIÚSCULA(A4)", "=MAIÚSCULA(A8)", '=MAIÚSCULA("straße")',
          "=MINÚSCULA(B4)", "=MINÚSCULA(B8)", "=MINÚSCULA(A1)",
          "=PRI.MAIÚSCULA(B5)", '=PRI.MAIÚSCULA("joão DA silva")', '=PRI.MAIÚSCULA("2nd o\'neil d\'água")', '=PRI.MAIÚSCULA("ÉDER éder")', "=PRI.MAIÚSCULA(B11)",
          '=LOCALIZAR("a";B2)', '=LOCALIZAR("A";B2)', '=LOCALIZAR("a";B2;3)', '=LOCALIZAR("z";B2)', '=LOCALIZAR("";B2)', '=LOCALIZAR("a";B2;0)',
          '=LOCALIZAR("a";B2;10)', '=LOCALIZAR("n?n";B2)', '=LOCALIZAR("b*a";B2)', '=LOCALIZAR("ã";"maca")', '=LOCALIZAR("ç";B1)', '=LOCALIZAR("verde";B5)',
          '=LOCALIZAR("~*";B9)', '=LOCALIZAR(1;A1)',
          '=PROCURAR("a";B2)', '=PROCURAR("A";B2)', '=PROCURAR("a";B2;3)', '=PROCURAR("";B2)', '=PROCURAR("n?n";B2)', '=PROCURAR("a";B2;0)', '=PROCURAR("*";B9)',
          '=PROCURAR("ã";B1)', '=PROCURAR("a";B2;7)',
          '=SUBSTITUIR(B2;"a";"o")', '=SUBSTITUIR(B2;"a";"o";2)', '=SUBSTITUIR(B2;"a";"o";5)', '=SUBSTITUIR(B2;"a";"o";0)', '=SUBSTITUIR(B2;"A";"o")',
          '=SUBSTITUIR(B2;"";"x")', '=SUBSTITUIR(B2;"an";"")', '=SUBSTITUIR(A5;0;9)', '=SUBSTITUIR(B9;"*";"+")', '=SUBSTITUIR(B11;"  ";" ")',
          '=SUBSTITUIR("a.b.c";".";",";2)',
          '=TEXTO(1234,5;"#.##0,00")', '=TEXTO(1234,5;"0")', '=TEXTO(0,256;"0%")', '=TEXTO(0,256;"0,0%")', '=TEXTO(C1;"dd/mm/aaaa")', '=TEXTO(C1;"d/m/aa")',
          '=TEXTO(C1;"mmm")', '=TEXTO(C1;"mmmm")', '=TEXTO(C1;"dddd")', '=TEXTO(C1;"ddd")', '=TEXTO(C1;"aaaa")', '=TEXTO(42;"00000")', '=TEXTO(3,14159;"0,00")',
          '=TEXTO(-1234,5;"#.##0,00")', '=TEXTO(0,5;"hh:mm")', '=TEXTO(B1;"0")', '=TEXTO(1234567;"#.##0")', '=TEXTO(2,5;"0")', '=TEXTO(C1;"dd/mm")',
          '=TEXTO(1234,5;"R$ #.##0,00")', '=TEXTO(7;"#")', '=TEXTO(0;"#")', '=TEXTO(C1;"mmm/aaaa")', '=TEXTO(1234,5;"General")',
          '=VALOR("123")', '=VALOR("1.234,5")', '=VALOR(" 12 ")', '=VALOR("abc")', '=VALOR("")', '=VALOR("50%")', '=VALOR("R$ 10,50")', '=VALOR(A7)',
          '=VALOR("15/03/2024")', '=VALOR("10:30")', '=VALOR("1e3")', '=VALOR(A1)', '=VALOR("-5")', '=VALOR(A6)', '=VALOR("(5)")',
          '=REPT("ab";3)', '=REPT("ab";0)', '=REPT("ab";2,9)', '=REPT("ab";-1)', '=REPT(A1;2)', '=REPT("*";A9)',
          '=UNIRTEXTO(", ";VERDADEIRO;F1:F3)', '=UNIRTEXTO(", ";VERDADEIRO;A1:A6)', '=UNIRTEXTO(", ";FALSO;A1:A6)', '=UNIRTEXTO("-";VERDADEIRO;"a";"";"b")',
          '=UNIRTEXTO("-";FALSO;"a";"";"b")', '=UNIRTEXTO("";VERDADEIRO;B1:B2)', '=UNIRTEXTO(", ";VERDADEIRO;A11;1)', '=UNIRTEXTO("/";1;A8;A4)',
          '=UNIRTEXTO(", ";VERDADEIRO;B9:B10)', '=UNIRTEXTO(", ";FALSO;B9:B10)']:
    c(f, tag="text")

# --- dates ---
for f in ["=DATA(2024;2;29)", "=DATA(2023;2;29)", "=DATA(2024;13;1)", "=DATA(2024;0;1)", "=DATA(2024;1;0)", "=DATA(2024;-1;15)", "=DATA(24;1;1)",
          "=DATA(1900;1;1)", "=DATA(1900;3;1)", "=DATA(2024;1;31)+1", "=DATA(2024,5;1;1)", "=DATA(9999;12;31)", "=DATA(2024;1;1,9)",
          "=ANO(C1)", "=MÊS(C1)", "=DIA(C1)", "=ANO(C2)", "=DIA(C2+1)", "=MÊS(C4+1)", "=ANO(0)", "=DIA(0)", "=MÊS(A6)", '=ANO("15/03/2024")',
          '=DIA("abc")', "=ANO(-1)", "=DIA(C1+0,99)", "=ANO(60)", "=DIA(60)", "=MÊS(61)",
          "=DIA.DA.SEMANA(C1)", "=DIA.DA.SEMANA(C1;2)", "=DIA.DA.SEMANA(C1;3)", "=DIA.DA.SEMANA(C1;11)", "=DIA.DA.SEMANA(C1;12)", "=DIA.DA.SEMANA(C1;16)",
          "=DIA.DA.SEMANA(C1;17)", "=DIA.DA.SEMANA(C1;4)", "=DIA.DA.SEMANA(C5)", "=DIA.DA.SEMANA(C12;2)", '=DIA.DA.SEMANA("abc")',
          '=DATADIF(C5;C1;"D")', '=DATADIF(C5;C1;"M")', '=DATADIF(C8;C1;"Y")', '=DATADIF(C8;C1;"YM")', '=DATADIF(C8;C1;"MD")', '=DATADIF(C3;C2;"M")',
          '=DATADIF(C3;C2;"MD")', '=DATADIF(C1;C5;"D")', '=DATADIF(C5;C1;"YD")', '=DATADIF(C5;C1;"X")', '=DATADIF(C5;C1;"d")', '=DATADIF(C6;C2;"Y")',
          '=DATADIF(C2;DATA(2025;2;28);"Y")', '=DATADIF(C3;DATA(2024;3;1);"MD")', '=DATADIF(C4;C10;"M")',
          "=DIATRABALHOTOTAL(C5;C1)", "=DIATRABALHOTOTAL(C1;C5)", "=DIATRABALHOTOTAL(C5;C10;C9)", "=DIATRABALHOTOTAL(C5;C10;C1:C12)", "=DIATRABALHOTOTAL(C1;C1)",
          "=DIATRABALHOTOTAL(C12;C12)", "=DIATRABALHOTOTAL(C5;C5+6)",
          "=DIATRABALHO(C1;1)", "=DIATRABALHO(C1;5)", "=DIATRABALHO(C1;-1)", "=DIATRABALHO(C1;0)", "=DIATRABALHO(C7;1;C10)", "=DIATRABALHO(C12;1)", "=DIATRABALHO(C1;2,9)",
          "=DIATRABALHO(C9-1;1;C9)",
          "=FIMMÊS(C1;0)", "=FIMMÊS(C1;1)", "=FIMMÊS(C1;-1)", "=FIMMÊS(C3;1)", "=FIMMÊS(C6;12)", "=FIMMÊS(C1;1,9)", "=FIMMÊS(C1;-25)",
          "=DATAM(C3;1)", "=DATAM(C3;13)", "=DATAM(C2;12)", "=DATAM(C2;-12)", "=DATAM(C1;-3)", "=DATAM(C11;-6)", "=DATAM(C1;1,9)", "=DATAM(C1;0)",
          "=NÚMSEMANA(C5)", "=NÚMSEMANA(C1)", "=NÚMSEMANA(C1;2)", "=NÚMSEMANA(C7)", "=NÚMSEMANA(C7;2)", "=NÚMSEMANA(C7;21)", "=NÚMSEMANA(C12;21)",
          "=NÚMSEMANA(C12)", "=NÚMSEMANA(C4;21)", "=NÚMSEMANA(C10;21)", "=NÚMSEMANA(C8;21)", "=NÚMSEMANA(C8)", "=NÚMSEMANA(C1;11)", "=NÚMSEMANA(C1;16)",
          "=NÚMSEMANA(C1;3)", "=NÚMSEMANA(C2;17)", "=NÚMSEMANA(DATA(2023;1;1);2)", "=NÚMSEMANA(DATA(2021;1;3);21)", "=NÚMSEMANA(DATA(2026;12;31);21)",
          "=C2-C3", "=C1+30", "=C1-C5+1", "=HOJE()-HOJE()", "=AGORA()>=HOJE()", "=ANO(HOJE())>=2024", "=INT(AGORA())=HOJE()"]:
    c(f, tag="date")

# --- financial ---
for f in ["=PGTO(0,01;12;1000)", "=PGTO(0;12;1200)", "=PGTO(0,01;12;1000;0;1)", "=PGTO(0,01;12;1000;-100)", "=PGTO(0,05/12;360;-200000)",
          "=PGTO(0;12;1200;100)", "=PGTO(0;12;1200;0;1)", "=PGTO(0,01;0;1000)", "=PGTO(-0,01;12;1000)", '=PGTO("1%";12;1000)', "=PGTO(1%;12;1000)",
          "=VP(0,01;12;-100)", "=VP(0;12;-100)", "=VP(0,01;12;-100;0;1)", "=VP(0,01;12;0;1000)", "=VP(0;12;-100;-50)", "=VP(0,01;12;-100;500;1)",
          "=VF(0,01;12;-100)", "=VF(0;12;-100)", "=VF(0,01;12;-100;-1000)", "=VF(0,01;12;-100;0;1)", "=VF(0;12;-100;-1000;1)", "=VF(0,005;60;0;-10000)",
          "=NPER(0,01;-100;1000)", "=NPER(0;-100;1000)", "=NPER(0,01;-100;1000;0;1)", "=NPER(0,01;-10;1000)", "=NPER(0;0;1000)", "=NPER(0,01;-100;0;5000)",
          "=NPER(0,01;100;1000)", "=NPER(0;-100;1000;-200)",
          "=TAXA(12;-100;1000)", "=TAXA(12;-100;1200)", "=TAXA(12;-100;1000;0;1)", "=TAXA(60;-500;20000)", "=TAXA(10;0;-1000;2000)", "=TAXA(12;-100;2000)",
          "=TAXA(12;-100;1000;0;0;0,5)", "=TAXA(360;-1073,64;200000)"]:
    c(f, tag="fin")

# --- parser odds and ends ---
for f in ["=SOMA( A1 ; A2 )", "=soma(a1:a3)", "=média(A1:A5)", "=Se(A1>5;1;0)", "=SOMA(Planilha1!A1:A3)", "=Planilha1!A1*2", "='Planilha1'!A1",
          "=SOMA(SE(A1>5;A1:A3;0))", "=SE(A1>5;SE(A2<0;\"a\";\"b\");\"c\")", "=ARRED(MÉDIA(A1:A5);2)", '=MAIÚSCULA(ESQUERDA(B2;1))&MINÚSCULA(EXT.TEXTO(B2;2;100))',
          "=SOMA(A1:A3)/CONT.NÚM(A1:A3)", "=CONT.SE(A1:A12;\">\"&MÉDIA(A1:A5))", '="Total: "&TEXTO(SOMA(G1:G5);"#.##0")', "=VERDADEIRO()", "=FALSO()",
          "=verdadeiro", "=SOMA(A1:A3;)", "=SE(A1;\"a;b\";\"c\")", '="a""b"', '=NÚM.CARACT("a""b")', "=SOMA((A1:A3))", "=(A1)", "=((1+2))*3",
          "=SOMA(A1:A3)*-1", "=-SOMA(A1:A3)", "=10*SOMA(A1)%", "=ABS(-A2)^2", "=A1>A2>A3", "=MÍNIMO(MÁXIMO(A1;A2);5)", "=1/(A1-A10)",
          "=#N/D", "=ÉERROS(#N/D)", "=SEERRO(#VALOR!;1)", "=SOMA(A1:A3)+#REF!"]:
    c(f, tag="parser")

# --- dynamic arrays / LET (LO 24.2 has none of these; expectations from Excel 365) ---
T = lambda *rows: [list(r) for r in rows]
col = lambda *vs: [[v] for v in vs]
ND = {"erro": "#N/D"}; VAL = {"erro": "#VALOR!"}; CALC = {"erro": "#CALC!"}; NUM = {"erro": "#NÚM!"}
DYN = [
    ("=FILTRO(F1:G5;G1:G5>250)", T(["Carla", 300], ["davi", 400], ["Eva", 500])),
    ("=FILTRO(F1:F5;G1:G5>9999)", CALC),
    ('=FILTRO(F1:F5;G1:G5>9999;"nada")', "nada"),
    ("=FILTRO(F1:F5;(G1:G5>150)*(G1:G5<450))", col("bruno", "Carla", "davi")),
    ("=FILTRO(D1:D5;D1:D3>1)", VAL),
    ('=FILTRO(F1:F10;F1:F10="ana")', col("Ana", "Ana")),
    ("=FILTRO(K1:O2;K1:O1>30)", T([40, 50], ["d", "e"])),
    ("=SOMA(FILTRO(G1:G10;D1:D10>4))", 300 + 400 + 500 + 600 + 700 + 1000),  # "x">4 is TRUE in Excel (text > number)
    ("=FILTRO(D1:D5;D1:D5>3;\"\")", col(5, 7, 9)),
    ("=ÚNICO(F1:F10)", col("Ana", "bruno", "Carla", "davi", "Eva", "Éder", "Zé", "ana ")),
    ("=ÚNICO(D1:D8;;VERDADEIRO)", col(1, 7, 9, "x")),
    ("=ÚNICO(K1:O1;VERDADEIRO)", T([10, 20, 30, 40, 50])),
    ("=CONT.VALORES(ÚNICO(F1:F10))", 8),
    ("=ÚNICO(D1:D3)", col(1, 3, 5)),
    ("=CLASSIFICAR(F1:F10)", col("Ana", "Ana", "ana ", "bruno", "Carla", "carla", "davi", "Éder", "Eva", "Zé")),
    ("=CLASSIFICAR(F1:G5;2;-1)", T(["Eva", 500], ["davi", 400], ["Carla", 300], ["bruno", 200], ["Ana", 100])),
    ("=CLASSIFICAR(D1:D5;1;-1)", col(9, 7, 5, 3, 1)),
    ("=CLASSIFICAR(K1:O1;1;-1;VERDADEIRO)", T([50, 40, 30, 20, 10])),
    ("=CLASSIFICAR(A1:A5)", col(-5, 0, 2.5, 10, 1000000)),
    ("=CLASSIFICAR(D1:D8)", col(1, 3, 3, 5, 5, 7, 9, "x")),
    ("=CLASSIFICAR(F1:G5;3)", VAL),
    ("=SEQUÊNCIA(3)", col(1, 2, 3)),
    ("=SEQUÊNCIA(2;3)", T([1, 2, 3], [4, 5, 6])),
    ("=SEQUÊNCIA(3;1;10;-2)", col(10, 8, 6)),
    ("=SEQUÊNCIA(1;3;0;0,5)", T([0, 0.5, 1])),
    ("=SEQUÊNCIA(0)", CALC),
    ("=SEQUÊNCIA(2,7)", col(1, 2)),
    ("=SOMA(SEQUÊNCIA(100))", 5050),
    ("=SEQUÊNCIA(2;;5)", col(5, 6)),
    ("=PEGAR(D1:D5;2)", col(1, 3)),
    ("=PEGAR(D1:D5;-2)", col(7, 9)),
    ("=PEGAR(F1:G5;1;-1)", 100),
    ("=PEGAR(D1:D5;10)", col(1, 3, 5, 7, 9)),
    ("=PEGAR(D1:D5;0)", CALC),
    ("=PEGAR(F1:G3;;1)", col("Ana", "bruno", "Carla")),
    ("=DESCARTAR(D1:D5;3)", col(7, 9)),
    ("=DESCARTAR(D1:D5;-4)", 1),
    ("=DESCARTAR(D1:D5;5)", CALC),
    ("=DESCARTAR(F1:G3;;1)", col(100, 200, 300)),
    ("=ESCOLHERCOLS(F1:G3;2)", col(100, 200, 300)),
    ("=ESCOLHERCOLS(F1:G2;-1;1)", T([100, "Ana"], [200, "bruno"])),
    ("=ESCOLHERCOLS(F1:G2;3)", VAL),
    ("=ESCOLHERCOLS(F1:G2;0)", VAL),
    ('=DIVIDIRTEXTO(K5;",")', T(["a", "b", "", "c"])),
    ('=DIVIDIRTEXTO(K5;",";;VERDADEIRO)', T(["a", "b", "c"])),
    ('=DIVIDIRTEXTO(K6;"=";";")', T(["nome", "Ana"], ["idade", "30"])),
    ('=DIVIDIRTEXTO(K7;" ")', T(["um", "dois", "", "tres"])),
    ('=DIVIDIRTEXTO("a-b";"x")', "a-b"),
    ('=DIVIDIRTEXTO("a,b;c";",";";")', T(["a", "b"], ["c", ND])),
    ('=DIVIDIRTEXTO("aXbxc";"x")', T(["aXb", "c"])),
    ('=DIVIDIRTEXTO("";",")', CALC),
    ("=PROCX(5;D1:D5;E1:E5)", "cinco"),
    ("=PROCX(6;D1:D5;E1:E5)", ND),
    ('=PROCX(6;D1:D5;E1:E5;"nada")', "nada"),
    ("=PROCX(6;D1:D5;E1:E5;;-1)", "cinco"),
    ("=PROCX(6;D1:D5;E1:E5;;1)", "sete"),
    ('=PROCX("car*";F1:F5;G1:G5;;2)', 300),
    ("=PROCX(5;D1:D10;G1:G10;;0;-1)", 600),
    ('=PROCX("ANA";F1:F5;G1:G5)', 100),
    ("=PROCX(3;D1:D5;F1:G5)", T(["bruno", 200])),
    ("=PROCX(6;D1:D5;E1:E5;;0)", ND),
    ("=PROCX(5;D1:D5;E1:E4)", VAL),
    ("=PROCX(99;D1:D5;E1:E5;0)", 0),
    ("=PROCX(30;K1:O1;K3:O3)", 3.5),
    ("=CORRESPX(5;D1:D5)", 3),
    ("=CORRESPX(6;D1:D5)", ND),
    ("=CORRESPX(6;D1:D5;-1)", 3),
    ("=CORRESPX(6;D1:D5;1)", 4),
    ('=CORRESPX("c*";F1:F5;2)', 3),
    ("=CORRESPX(5;D1:D10;0;-1)", 6),
    ("=CORRESPX(10;D1:D5;-1)", 5),
    ("=CORRESPX(0;D1:D5;-1)", ND),
    ("=CORRESPX(6;D1:D5;-1;2)", 3),
    ('=CORRESPX("ana";F1:F10)', 1),
    ('=CORRESPX("c*";F1:F5)', ND),
    ("=CORRESPX(5;D1:D5;3)", VAL),
    ("=LET(x;2;x*3)", 6),
    ("=LET(x;A1;y;x+1;x*y)", 110),
    ("=LET(t;D1:D5;SOMA(t))", 25),
    ('=LET(x;5;SE(x>3;"alto";"baixo"))', "alto"),
    ("=LET(x;2;y;x^2;LET(x;10;x+y))", 14),
    ("=LET(taxa;10%;A1*taxa)", 1.0),
    ("=LET(a;1;b)", {"erro": "#NOME?"}),
]
for f, e in DYN:
    c(f, tag="dyn", lo=False, exp=e)

# Late additions (appended so earlier ids stay stable)
for f in ["=A6", "=B6", "=SEERRO(A6;\"x\")", "=ÉCÉL.VAZIA(A6)", "=SEQUÊNCIA(-1)", "=DIATRABALHO(C1;0,5)", "=PROCX(A6;D1:D10;E1:E10)", "=SOMA(A1;A6;A8;A7;B1)",
          "=MÉDIA(A2;A6;A9)", "=CONT.SE(A1:A12;\"<>\")", "=E(A1>0;B1)", "=OU(A6;VERDADEIRO)"]:
    c(f, tag="late")
for case in CASES:
    if case["f"] in ("=SEQUÊNCIA(-1)", "=PROCX(A6;D1:D10;E1:E10)") and case.get("tag") == "late":
        case["lo"] = False
        if case["f"] == "=SEQUÊNCIA(-1)":
            case["exp"] = VAL

# Cases where LO is known to differ from Excel: give Excel expectations too.
KNOWN_EXCEL = {
    "=2^3^2": 64,  # Excel: left-assoc
    "=SOMA(A8)": 0, "=SOMA(B1)": 0, "=SOMA(A7)": 0,
    "=MÉDIA(A1;A6)": 10, "=MÁXIMO(A2;A6)": -5, "=MÍNIMO(A9;A6)": 3,
    "=SOMARPRODUTO(H1:H3)": 1, '=SOMARPRODUTO(F1:F10="ana")': 0,
    "=E(A1;A6)": True, "=E(A1:A3)": False, "=E(H1:H6)": False,
    '=SE("VERDADEIRO";1;2)': 1,
    "=0^0": NUM, "=POTÊNCIA(0;0)": NUM,
    "=(-8)^(1/3)": NUM, "=POTÊNCIA(-8;1/3)": NUM,
    '=""+1': VAL, "=B10+1": VAL,
    "=PROCV(5;D1:E5;2;)": "cinco",
    "=ÍNDICE(A1:A12;6)": 0,
    "=A1:A3": col(10, -5, 0),
    "=A6": 0, "=B6": 0, "=SOMA(A1;A6;A8;A7;B1)": 10, "=MÉDIA(A2;A6;A9)": -1,
}
for case in CASES:
    if case["f"] in KNOWN_EXCEL:
        case["exp"] = KNOWN_EXCEL[case["f"]]

# ---------------- pt-BR -> English translation for LO ----------------
FN = {
    "SOMA": "SUM", "MÉDIA": "AVERAGE", "MÍNIMO": "MIN", "MÁXIMO": "MAX", "CONT.NÚM": "COUNT", "CONT.VALORES": "COUNTA", "CONTAR.VAZIO": "COUNTBLANK",
    "ARRED": "ROUND", "ARREDONDAR.PARA.CIMA": "ROUNDUP", "ARREDONDAR.PARA.BAIXO": "ROUNDDOWN", "TRUNCAR": "TRUNC", "INT": "INT", "ABS": "ABS",
    "MOD": "MOD", "POTÊNCIA": "POWER", "RAIZ": "SQRT", "MAIOR": "LARGE", "MENOR": "SMALL", "MED": "MEDIAN", "MARRED": "MROUND",
    "AGREGAR": "_xlfn.AGGREGATE", "SUBTOTAL": "SUBTOTAL", "SE": "IF", "SES": "_xlfn.IFS", "E": "AND", "OU": "OR", "NÃO": "NOT",
    "SEERRO": "IFERROR", "SENÃODISP": "_xlfn.IFNA", "ÉERROS": "ISERROR", "ÉCÉL.VAZIA": "ISBLANK", "ÉNÚM": "ISNUMBER", "ÉTEXTO": "ISTEXT",
    "CONT.SE": "COUNTIF", "CONT.SES": "COUNTIFS", "SOMASE": "SUMIF", "SOMASES": "SUMIFS", "MÉDIASE": "AVERAGEIF", "MÁXIMOSES": "_xlfn.MAXIFS",
    "MÍNIMOSES": "_xlfn.MINIFS", "SOMARPRODUTO": "SUMPRODUCT", "PROCV": "VLOOKUP", "PROCH": "HLOOKUP", "PROCX": "_xlfn.XLOOKUP",
    "ÍNDICE": "INDEX", "CORRESP": "MATCH", "ESCOLHER": "CHOOSE", "DESLOC": "OFFSET", "CORRESPX": "_xlfn.XMATCH", "CONCAT": "_xlfn.CONCAT",
    "CONCATENAR": "CONCATENATE", "ESQUERDA": "LEFT", "DIREITA": "RIGHT", "EXT.TEXTO": "MID", "NÚM.CARACT": "LEN", "ARRUMAR": "TRIM",
    "MAIÚSCULA": "UPPER", "MINÚSCULA": "LOWER", "PRI.MAIÚSCULA": "PROPER", "LOCALIZAR": "SEARCH", "PROCURAR": "FIND", "SUBSTITUIR": "SUBSTITUTE",
    "TEXTO": "TEXT", "VALOR": "VALUE", "REPT": "REPT", "UNIRTEXTO": "_xlfn.TEXTJOIN", "DIVIDIRTEXTO": "_xlfn.TEXTSPLIT", "HOJE": "TODAY",
    "AGORA": "NOW", "DATA": "DATE", "ANO": "YEAR", "MÊS": "MONTH", "DIA": "DAY", "DIA.DA.SEMANA": "WEEKDAY", "DATADIF": "DATEDIF",
    "DIATRABALHOTOTAL": "NETWORKDAYS", "DIATRABALHO": "WORKDAY", "FIMMÊS": "EOMONTH", "DATAM": "EDATE", "NÚMSEMANA": "WEEKNUM",
    "FILTRO": "_xlfn._xlws.FILTER", "CLASSIFICAR": "_xlfn._xlws.SORT", "ÚNICO": "_xlfn.UNIQUE", "SEQUÊNCIA": "_xlfn.SEQUENCE",
    "PEGAR": "_xlfn.TAKE", "DESCARTAR": "_xlfn.DROP", "ESCOLHERCOLS": "_xlfn.CHOOSECOLS", "LET": "_xlfn.LET", "PGTO": "PMT", "VP": "PV",
    "VF": "FV", "NPER": "NPER", "TAXA": "RATE", "VERDADEIRO": "TRUE", "FALSO": "FALSE",
}
ERR_EN = {"#N/D": "#N/A", "#VALOR!": "#VALUE!", "#NÚM!": "#NUM!", "#NOME?": "#NAME?", "#DIV/0!": "#DIV/0!", "#REF!": "#REF!"}


def to_en(f):
    out = []
    for m in re.finditer(r'("(?:[^"]|"")*")|([^"]+)', f):
        if m.group(1):
            out.append(m.group(1)); continue
        s = m.group(2)
        for pt, en in ERR_EN.items():
            s = s.replace(pt, en)
        s = re.sub(r"(?<=\d),(?=\d)", ".", s)
        s = re.sub(r"(?<![\d.]),(?=\d)", "0.", s)  # ,5 -> 0.5
        s = s.replace(";", ",")
        def fn(mm):
            name = mm.group(0).upper()
            return FN.get(name, name)
        s = re.sub(r"[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_.]*(?=\s*\()", fn, s)
        s = re.sub(r"(?<![A-Za-z0-9_.])(?:VERDADEIRO|verdadeiro)(?![A-Za-z0-9_.(])", "TRUE", s)
        s = re.sub(r"(?<![A-Za-z0-9_.])FALSO(?![A-Za-z0-9_.(])", "FALSE", s)
        s = s.upper()
        out.append(s)
    return "".join(out)


for i, case in enumerate(CASES):
    case["id"] = i + 1
    case.setdefault("lo", True)
    case.setdefault("en", to_en(case["f"]))

if __name__ == "__main__":
    with open(os.path.join(HERE, "corpus.json"), "w") as fh:
        json.dump({"data": D, "cases": CASES}, fh, ensure_ascii=False, indent=1)
    print(len(CASES), "cases;", sum(1 for x in CASES if x["lo"]), "LO-evaluable;", sum(1 for x in CASES if "exp" in x), "with Excel expectation")
