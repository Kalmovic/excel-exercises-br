#!/bin/bash
# Re-run the whole differential test. Needs: python3 + openpyxl, LibreOffice (soffice + python3-uno), node deps in the repo.
# Usage: bash run.sh      (takes ~1 min). Output: results.json + ../diferencial.md
set -e
cd "$(dirname "$0")"
python3 corpus.py            # -> corpus.json (cases + data block; edit corpus.py to add cases, append at the end to keep ids)
python3 run_lo.py            # -> corpus.xlsx, lo.json   (LO headless via UNO, pt-BR locale, calculateAll + NOW() sentinel)
./run_ours.sh                # -> ours.json (temp src/engine/motor/corpus.diferencial.tmp.test.ts, removed on exit; hangs -> hangs.json)
python3 compare.py           # -> results.json (status per case)
python3 classify.py          # -> results.json with verdict/bug per case (manual triage table lives here)
python3 report.py            # -> ../diferencial.md
