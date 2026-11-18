"""Gera src/engine/motor/diferencial.casos.json a partir de docs/revisao/diferencial (corpus + results)."""
import json, sys

repo = sys.argv[1]
corpus_json = sys.argv[2]
corpus = json.load(open(corpus_json))
res = json.load(open(f"{repo}/docs/revisao/diferencial/results.json"))

VAL = {"erro": "#VALOR!"}
NUM = {"erro": "#NÚM!"}
# Excel onde o LibreOffice diverge (Err:502 etc.) ou onde o relatório anotou outro valor.
EXCEL = {
    84: 45636,  # SOMA(1:1): o Excel ignora o VERDADEIRO de H1 (o LO soma 1)
    246: NUM,   # MED sem números: #NÚM! no Excel
    418: VAL, 510: VAL,
    508: [[1], [3], [5], [7], [9]],  # ÍNDICE(…;0;1) no Excel 365 derrama a coluna
    566: VAL, 576: VAL, 582: VAL, 584: VAL, 617: VAL, 638: VAL, 674: VAL, 688: VAL,
    737: NUM,
    # O LO soma VERDADEIRO de A8 (não tem tipo lógico); o Excel ignora lógico vindo de referência.
    115: 10, 134: -5,
    207: {"erro": "#DIV/0!"},  # POTÊNCIA(0;-1): #DIV/0! no Excel (o LO dá #NÚM!)
}

casos = []
for e in res["cases"]:
    v = e.get("verdict")
    if v == "ambiguous":
        continue
    caso = {"id": e["id"], "f": e["f"]}
    if e["status"] == "pass" or v == "engine_bug":
        if e["id"] in EXCEL:
            esp = EXCEL[e["id"]]
        elif "excel_expected" in e:
            esp = e["excel_expected"]
        else:
            esp = e["lo"]
        if isinstance(esp, dict) and str(esp.get("erro", "")).startswith("Err:") and e["status"] == "pass":
            esp = e["ours"]  # o comparador aceitou o nosso erro como equivalente
        if isinstance(esp, dict) and str(esp.get("erro", "")).startswith("Err:"):
            raise SystemExit(f"sem valor do Excel: {e['id']} {e['f']} {esp}")
        caso["esperado"] = esp
        if v == "engine_bug":
            caso["bug"] = e["bug"]
    elif v == "lo_specific":
        caso["esperado"] = e["ours"]  # o nosso valor é o do Excel
        caso["soLibreOffice"] = True
    else:
        raise SystemExit(f"sem veredito: {e}")
    casos.append(caso)

dados = {k: v["ours"] for k, v in corpus["data"].items()}
out = {"origem": "docs/revisao/diferencial (gerado por um script; os ambíguos ficam de fora)", "dados": dados, "casos": casos}
json.dump(out, open(f"{repo}/src/engine/motor/diferencial.casos.json", "w"), ensure_ascii=False, indent=0)
print(len(casos), "casos")
