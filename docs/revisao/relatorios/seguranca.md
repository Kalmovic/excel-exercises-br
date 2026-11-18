# Planilhês: adversarial security and backend review

Scope: API route handlers, auth callback, server actions, proxy, Supabase migrations/RLS, Stripe webhook, the certificate re-grading engine, the client bundle and response headers.
Method: reading the code, plus measurements. The measurements came from temporary vitest files (`src/*.seguranca.tmp.test.ts`, now deleted) that called `conferirQuestao`/`conferirTeste` directly, and from `next start -p 3303` against the existing `.next` build. That build has no Supabase or Stripe keys, so the routes return 401/503 early. The behaviour with keys set is worked out from the code below.
No repo files were modified. The working tree is clean.

Severity: **P0** exploitable now · **P1** likely · **P2** hardening · **P3** note.

---

## P0-1: One authenticated request crashes the server process (OOM) through `formatos`

**Evidence**
- `src/grader/conferir-teste.ts:30` `INTERVALO = /^[A-Z]{1,2}[1-9]\d{0,2}(:[A-Z]{1,2}[1-9]\d{0,2})?$/` accepts `A1:ZZ999`, which is 702 × 999 ≈ 701k cells. The range is **not clipped to the grid**, which is at most 50×26.
- `conferir-teste.ts:47-48`: up to 300 entries per question, each calling `p.formatar(deIntervalo(end), f)`.
- `src/engine/engine.ts:332-343`: `formatar` builds `antes`/`depois` arrays with one object per cell, writes 701k Map entries, pushes the action to the undo history (`registrar` keeps **200** actions, `engine.ts:354-358`) and calls `notificar()`. That recomputes the derived state, including every conditional-format rule.
- `/api/certificado` accepts `entregas: max(10)`, and the `formatos` record has no size limit in zod (`route.ts:15`).

**Measured**
- 1 × `A1:ZZ999` costs 534 ms. 5 cost 2.8 s.
- 8 `formatar` calls on one Planilha: 6.3 s and **+868 MB heap**. That is about 108 MB per call, and the undo history keeps it alive.
- `conferirQuestao(q, { conteudos:{}, formatos: {A1:ZZ999 … A300:ZZ999} })` with `--max-old-space-size=4096` produced **`FATAL ERROR: Reached heap limit … JavaScript heap out of memory`, and the worker died with SIGABRT**. A V8 OOM cannot be caught, so the `try/catch` in `conferirQuestao` does not help.

**Exploit**
Any free account (PAYWALL_ATIVO=false, so no Pro is needed) sends a ~10 KB body:
`POST /api/certificado {"modulo":"intro","nome":"xxx","entregas":[{"conteudos":{},"formatos":{"A1:ZZ999":"moeda","A2:ZZ999":"moeda", … 300}}]}`.
On a long-lived Node server this takes the whole process down. On Vercel Fluid compute it kills the instance and every request running on it, and repeated requests keep burning function-seconds.

**Fix**
- In `conferirQuestao`, clip each format range to `p.linhas × p.colunas` and skip ranges that fall outside the grid.
- Cap `formatos` at about 50 entries and their total cell count at the grid size.
- Do not record history or call `notificar` per entry: add a `formatarSemHistorico`/batch API, or call `p.limparHistorico()`, and recompute derived state once.
- Add `.max()` to every record in the route's zod schema (`z.record(...).refine(o => Object.keys(o).length <= 300)`).

## P0-2: ReDoS in the wildcard criterion (CONT.SE, SOMASE, CONT.SES, MÉDIASE, CORRESPX mode 2) blocks the event loop for minutes

**Evidence**
`src/engine/motor/nucleo.ts:72` builds `new RegExp("^" + alvo… .replace(/\*/g, ".*") … + "$", "i")` from a user-controlled criterion. Many `*` in a row become `.*a.*a.*…b`, which backtracks catastrophically.

**Measured** (in the target cell of `teste-intro-3`, criterion `"*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b"`):

| Subject text | Time |
|---|---|
| `F9` = 30 × `a` | 1.6 s |
| `REPT("a";30)` inline | 4.8 s |
| `F9` = 40 × `a` | **271.9 s** (one cell) |

Growth is polynomial in length, with the exponent set by the number of stars. A 500-char cell (MAX_TEXTO) and 300 cells × 10 deliveries make this effectively unbounded. The same pattern also works inside conditional-format formula rules (300 chars), which run once per grid cell.

**Exploit**
`conteudos: {"F9":"aaaa…(40)", "D2":"=CONT.SE(F9;\"*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b\")"}`. The answer is wrong, but the server spends minutes grading it. Node is single-threaded, so every other request on that process or instance stalls.

**Fix**
- Replace the regex with a linear wildcard matcher (the classic two-pointer glob match with `*`/`?`/`~` escape).
- At minimum, collapse runs of `*`, cap criterion length (~255, like Excel) and cap the number of `*`.
- Also run server grading under a time budget: a `worker_threads` worker with a timeout, or check a deadline inside `avaliar`.

## P0/P1-3: Other engine CPU/memory amplification with no budget (server grading)

The engine has no limits on matrix size, string size or total work. Measured in the target cell:

| Formula in target cell | Time |
|---|---|
| `=SOMA(SEQUÊNCIA(1000;1000))` | 144 ms |
| `=SOMA(SEQUÊNCIA(3000;3000))` | 1.3 s, ~9M-element arrays (≈ 72 MB+) |
| `=SOMA(DESLOC(A1;0;0;3000;700))` | 713 ms |
| `DIVIDIRTEXTO` of 1e6 items | 245 ms |

- `SEQUÊNCIA(20000;20000)` (4e8 elements) requests gigabytes. Following P0-1, that is expected to end in a fatal OOM. This was inferred and not run, so the test machine would not be crashed again.
- Formulas in cells outside the grid (`Z99`, `ZZ300`) are evaluated lazily, but any read of an empty cell triggers all pending formulas (`nucleo.ts:704-707`). Measured: a pending `Z99 = SOMA(SEQUÊNCIA(2000;2000))` plus an alvo of `=F10+1` took 640 ms.
- Conditional-format formula rules (20 × grid cells, re-evaluated without cache on every `notificar`) multiply all of this. Measured: 20 trivial rules plus 100 `formatos` took 390 ms on a 10×6 grid. Grids go up to 50×26 (1300 cells), and with ≤5 sheets the cost is higher.
- `conferirComPerturbacao` runs the student's formulas 2+ more times per question.

**Fix**
- Cap array results in `SEQUÊNCIA`, `DESLOC`, `MATRIZALEAT`, `DIVIDIRTEXTO`, `REPT` and the others. For example, return `#NÚM!` when rows×cols > 10k or the string length > 32,767 (Excel's own cell limit).
- Only accept `conteudos` addresses inside the question's grid (`deEndereco(end)` < `linhas/colunas` of the target sheet).
- Run grading in a worker with a hard timeout and a memory cap (`resourceLimits`).
- Add rate limiting to `/api/certificado`: per user, for example 10/hour (Upstash/Vercel KV or a Supabase table).

## P1-4: The test answer key is public, so the "server-side re-grading" does not prove anything

**Evidence**
The prerendered, unauthenticated `/teste/<modulo>` page ships the full questions in its RSC payload. `.next/server/app/teste/abas.rsc` contains `solucaoReferencia":"=SOMA(Mar!B2:B6)"`, `"=PROCV(A2;Preços!$A$2:$B$6;2;FALSO)"`, and so on. The `esperado`, `correta` (multiple choice), `aceitas` and `verificacoes` fields come along with it (`src/app/(app)/teste/[modulo]/page.tsx` passes `questoes={questoes}` to a client component).

**Measured**
Submitting each alvo's `solucaoReferencia` passes in 5 ms. The test bank has 75 questions across 15 modules: 37 formula, 15 multiple_choice, 20 ferramenta, plus 1 each of text_answer, select_range and format_cell.
Separately, the anti-hardcode check is weak: **15 of the 37 formula test questions accept the expected value typed as `=<value>`**. Examples are teste-intro-3, teste-logica-2/4, teste-condicionais-1/3, teste-busca-2/4, teste-texto-1..4, teste-datas-1..3 and teste-casos-2. Those questions have no `variaveis`/`alternativas`, so `conferirComPerturbacao` returns `[]`.

**Exploit**
A short script reads `/teste/<slug>.rsc` for all 15 modules, builds `entregas` from the answer key and POSTs `/api/certificado`, then `/api/certificado/especialista`. The result is all 16 certificates in seconds, with no learning involved. The server's re-grading only stops people who edit the client-side `aprovado` flag.

**Fix**
- Strip `solucaoReferencia`, `esperado`, `correta`, `aceitas`, `errosComuns`, `solucao`, `verificacoes` and `alternativas` from test questions before they reach the client. Grade the test on the server, one question per request, with a single attempt recorded server-side.
- Add `variaveis` to every formula test question; consider a CI rule that requires them for `teste: true`.
- Optionally randomize the data per attempt (seeded on the server).

## P1-5: Open redirect after login (`/auth/confirmar` and `/entrar`)

**Evidence**
- `src/app/auth/confirmar/route.ts:18`: `p.startsWith("/") && !p.startsWith("//")`, then `new URL(proximo, url.origin)`.
- The same check is in `src/components/conta/FormEntrar.tsx:13-15`, which forwards the value into `emailRedirectTo` (`:75`).

**Verified in Node:**
```
"/\\evil.com"  passes check -> https://evil.com/
"/\t/evil.com" passes check -> https://evil.com/
```
WHATWG URL treats `\` as `/` for http(s) and strips tab/newline characters.

**Exploit**
The attacker sends `https://<site>/entrar?proximo=/%5Cevil.com`. The victim requests the e-mail link, which carries `proximo=%2F%5Cevil.com`, clicks it and logs in successfully. `/auth/confirmar` then 307s the victim to `https://evil.com/`, a phishing page that looks like the site ("sessão expirou, digite o código…"). The redirect only fires after a successful code exchange, which makes the phishing more convincing.

**Fix**
- Parse first and compare origins:
  `const u = new URL(p, url.origin); const ok = u.origin === url.origin; redirect(ok ? u.pathname + u.search : "/trilha")`.
- Alternatively, reject `\`, control characters and `%5C` (for example, require `/^\/(?![\/\\])[\w\-\/?=&%.]*$/`).
- Apply the same fix in `FormEntrar.destino()`.

## P2-6: Certificate name and score can be changed after issue under the same code

`src/app/api/certificado/route.ts:67-73` and `especialista/route.ts:47-49` overwrite `nome` on an existing certificate and keep `codigo` and `emitido_em`. A verified link (`/certificado/ABCD-EFGH`) can be renamed to another person at any time, for example sold or handed over, and `emitido_em` still shows the original date. Repeated requests also re-run the full grading, which ties into P0-1/2/3.
**Fix:** make `nome` immutable once issued, or store a name history and show "nome alterado em …". Rate-limit renames.

## P2-7: No rate limiting anywhere; contact form puts PII in logs

- `/api/contato` has no rate limit and only a honeypot. Each lead writes name, e-mail, organization, message and referer to the Vercel logs (`contato/route.ts:22`). That is personal data under LGPD sitting in a log system with its own retention and access rules. It is also open to log flooding and spam.
- `/api/erros` is anonymous with up to ~5 KB per line and no rate limit. Anyone can flood the logs. Output is JSON-escaped, so no line injection: a `\n` payload was verified to stay escaped.
- The admin login server action (`admin/acoes.ts:9-12`) has an 800 ms sleep but no per-IP limit. Parallel attempts are unbounded, which is acceptable only if ADMIN_TOKEN is long and random. The 12-character minimum is low for an internet-facing password.
- `/api/certificado` has no limit. It is CPU-heavy even with valid input (5 questions + perturbation).

**Fix:** use a per-IP/per-user limiter (Vercel KV/Upstash or a Supabase RPC with a counter) on contato, erros, certificado and the admin login. Write leads to a Supabase table with RLS instead of logs, or redact e-mail and message. Require ADMIN_TOKEN ≥ 32 random characters.

## P2-8: No security headers (CSP, frame-ancestors, nosniff, Referrer-Policy)

`curl -I` on `next start` returns only `X-Robots-Tag` and `X-Powered-By: Next.js` (`next.config.ts:14-17`).
- There is no `Content-Security-Policy` / `frame-ancestors` and no `X-Frame-Options`, so every page can be framed. Clickjacking candidates: `/conta` (cancel subscription, portal), `/certificado/emitir`, `/assinar`.
- There is no `X-Content-Type-Options: nosniff` and no `Referrer-Policy`. The `/auth/confirmar?code=` URL is a one-time code tied to the PKCE cookie, so the referer risk there is low.

**Fix:** in `headers()`, always (not only when not indexing):
- `Content-Security-Policy: frame-ancestors 'self'`. Add a script-src policy later; Next with nonces is required for a strict one.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `poweredByHeader: false`

If embedding exercises in third-party sites is intended (`ExercicioEmbutido`), allow framing only on that route.

## P2-9: Stripe: grants Pro for any paid Checkout/Invoice in the account; chargebacks not handled

- `src/lib/pagamento-stripe.ts:29-43`: `checkout.session.completed` with `mode=payment && paid` grants a **year** of Pro to `client_reference_id`. It does not check `metadata.plano`, the price/product or `amount_total`. If the Stripe account ever sells anything else, the grant still fires. For example, a Payment Link accepts `?client_reference_id=` from the URL, so a cheap product bought with a crafted link would grant Pro to any UUID. The same applies to `invoice.paid`, which accepts any subscription invoice. This depends on the account's setup and was not verified.
  **Fix:** check `s.metadata.plano === "anual"` and the expected `amount_total`/currency, or the product id, before `liberar`. For invoices, check the subscription metadata `usuario_id`.
- `charge.dispute.created` / `charge.dispute.closed` (chargeback) are not handled. A buyer who files a chargeback keeps access. **Fix:** map disputes to `revogar`.
- Race in `/api/assinatura` (`route.ts:36-37`): two concurrent checkouts with no existing row create two Stripe customers, and the last upsert wins. A monthly payment made on the other session arrives as `invoice.paid` with an unmapped `customer`. `registrar_pagamento` then returns `desconhecido`: the user paid and did not get Pro. **Fix:** create or lock the row first (`insert … on conflict do nothing` then `select … for update`), or find the customer by `metadata.usuario_id` via `stripe.customers.search`. Also pass the user id in subscription metadata and fall back to it in the webhook.
- Verified as correct: signature is checked with the raw body (`request.text()`) and `constructEvent` uses the default 300 s tolerance. Idempotency is the `eventos_pagamento.id` PK plus `processado_em`. Concurrent duplicates can both apply, but `greatest()` keeps that harmless. `registrar_pagamento` is `security definer`, has `search_path=''` and is revoked from public/anon/authenticated. Signature failure returns 400, unconfigured returns 503 (both verified locally).
- Note: `p_payload` stores the full Stripe object, including customer e-mail and name, in `eventos_pagamento` indefinitely. Access is via service role only. Consider a retention policy.

## P2-10: Supabase: user-writable storage with no quotas

- `perfis.origem jsonb` is user-updatable (`grant update (nome, origem)`) with **no size check**. `progresso` has a 32 KB cap per row but **no cap on row count** (any `chave` ≤120 chars). An attacker with the publishable key and a session can insert millions of rows or a huge `origem` straight through PostgREST. **Fix:** `check (pg_column_size(origem) <= 4096)`. Limit rows per user, either with a trigger counting rows or by restricting `chave` to known slugs through an FK or check against a list.
- `perfis.origem` is meant to drive affiliate attribution (`origem.ts`: "grava referred_by_affiliate"). The user controls it, so never pay commissions based on it. Set it server-side from the cookie at signup.
- RLS review: RLS is on for every table, and every table has `revoke all` before the narrow grants. `assinaturas` and `certificados` are SELECT-own only; no user can write Pro status or certificates (also covered by `supabase/testes/*.sql`). `perfis.papel` is not updatable thanks to the column grants. `eventos_pagamento` has RLS on, no policy and is revoked. `criar_perfil` has execute revoked. All three `security definer` functions use `search_path=''`. No issues found.
- `verificar_certificado` (anon) returns name, module, score and date for an exact code. The code space is 32^8 ≈ 1.1e12, so enumeration is impractical. It does not leak `usuario_id` or e-mail. Fine; consider Supabase rate limits on anon RPC.

## P3 notes

- `/api/erros`: body `null` (or `[]` / a number) gives an unhandled TypeError and a **500** (verified: `curl -d 'null'` returned 500), because `dados[k]` is read on null. Guard with `typeof dados === "object" && dados`.
- `/certificado/%E0%A4%A` gives a **500** (verified): `decodeURIComponent` throws in `src/lib/certificado-publico.ts:10` before the regex check. Wrap it in try/catch and return null.
- `ehAdmin()` (`src/lib/admin.ts:53-54`): a 64-character cookie that is not valid hex makes `Buffer.from(v,"hex")` shorter, so `timingSafeEqual` throws and the page returns 500. Only the requester is affected. Check `/^[0-9a-f]{64}$/` first.
- Admin cookie value = `sha256("excel-br-admin:"+ADMIN_TOKEN)`. It is deterministic and has no server-side expiry or revocation short of rotating the password. A leaked cookie works for as long as the password is unchanged, even though `maxAge` is 7 days. Use an HMAC with an issued-at timestamp.
- Certificate routes: concurrent requests from the same user hit `unique(usuario_id, modulo)`. That error is also 23505 and gets treated as a code collision: 3 retries, then a 500. Distinguish the constraint name. Names are only trimmed and whitespace-collapsed, so bidi overrides and zero-width characters are accepted. React escapes the output, but consider NFKC normalization and stripping `\p{Cf}`.
- Body size: Next 16 with a `proxy` buffers request bodies up to `proxyClientMaxBodySize` (default **10 MB**; `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md`). Verified: a 30 MB POST was truncated ("Request body exceeded 10MB … Only the first 10MB will be available") and the JSON then failed to parse with a 400. On Vercel the platform cap is 4.5 MB. Measured: `JSON.parse` + zod on a 14 MB body with 1M keys took 1.45 s of CPU. Consider `experimental.proxyClientMaxBodySize: '256kb'` and checking `content-length` early in `/api/certificado`.
- Prototype pollution: `{"conteudos":{"__proto__":{"B2":"1"}}}`: zod 4 keeps `Object.prototype` intact and grading returns false. No issue.
- Sheet-prefixed and locked cells: `Planilha1!B2`, `'X'!B2` (rejected by regex), locked cells via another sheet and lowercase addresses are all filtered correctly (`conferir-teste.ts:43-45` plus `engine.ts:303-308` and `474-492`). Sorting through `recursos.ordenacoes` moves locked data, but that is the intended exercise behaviour.
- CSRF: the POST APIs have no Origin check. They rely on Supabase SSR cookies being `SameSite=Lax`, which blocks cross-site POST. Also note that `request.json()` ignores Content-Type, so a `text/plain` form post would parse. Adding an `Origin` check on state-changing routes (`/api/assinatura/cancelar` in particular) is cheap defence in depth.
- `request.url` origin feeds Stripe `success_url`/`return_url`. With `next start` the Host and X-Forwarded-Host headers were verified **not** to change the origin. On Vercel the origin is set by the platform. Prefer `URL_SITE` anyway.
- Secrets: no `SUPABASE_SECRET_KEY`, `STRIPE_*`, `ADMIN_TOKEN`, `sk_`, `whsec_`, `sb_secret_` or JWTs in `.next/static`. `.env*` is gitignored. Git history only contains a placeholder `ADMIN_TOKEN=senha-de-teste-admin` in docs or tests. `supabaseAdmin`, `stripe` and `acesso` import `server-only`.
- `usuarioEhPro()` reads `assinaturas` without `.eq("usuario_id", …)` and relies on RLS. That is correct today, but brittle if the client ever becomes the admin client.

---

## Priority order for fixes

1. Bound server grading (P0-1/2/3). This means:
   - clip and cap `formatos`/`conteudos` to the grid;
   - a linear wildcard matcher;
   - caps on array and string sizes in the engine;
   - a worker with a timeout;
   - a per-user rate limit on `/api/certificado`.
2. Stop shipping test answer keys; add `variaveis` to every formula test question (P1-4).
3. Fix the `proximo` open redirect in both places (P1-5).
4. Security headers (P2-8), Stripe metadata/amount checks and disputes (P2-9), immutable certificate names (P2-6), DB quotas (P2-10), rate limits and PII in logs (P2-7).
