# Generate frontend functional cases

Use `playwright-cli-case-generator`. Read only `testcase/frontend/rag/context.md`, `coverage-map.md`, and existing `testcase/frontend/cases/`; write only that cases directory. Produce Markdown cases, `index.md`, and schema-version-1 `manifest.draft.json` (materialize promotes to `manifest.json`). Do not generate pytest or Playwright source code.

## HARD ID contract (frequent failure)

| Concept | Field | Shape | Example |
|---|---|---|---|
| Test case id | `caseId` + filename | `FE-<FEATURE>-<NNN>-<dimension>` | `FE-LOGIN-001-core` |
| Acceptance criteria | `acIds[]` | `AC-FE-*` / `AC-*` | `AC-FE-001` |

- **Never** set `caseId` to `AC-FE-001` or name the file `AC-FE-001.md`.
- **Never** put `FE-LOGIN-001-core` into `acIds`.
- `casePath` must be `testcase/frontend/cases/<caseId>.md`.
- `evidenceDir` must be `testcase/frontend/evidence/<caseId>/`.

Each case is independently executable and includes AC mapping (`acIds`), preconditions, cleanup, UI assertions, and its isolated evidence path. Use dimensions `core`, `boundary`, `flow`, or `backend`. Never guess API fields, constraints, SLA, credentials, or unrecorded data.

Every case must use the **resolved** absolute base URL from `testcase/frontend/rag/context.md` (field `baseUrl` / base URL line). Do not leave a `<base-url>` placeholder. Resolution policy (already applied by retrieve-context): prefer `config.md` frontend URL; else default `http://localhost:5173`.

Every case must use this exact browser-start command prefix with that concrete URL:

```text
playwright-cli open --browser=chrome --headed <resolved-base-url-from-context.md>
```

Do not put a session flag before `open`. Every later Playwright CLI command must stay in that same default browser session: do **not** emit `-s=<case-id>`, `-s=...`, or assume an undocumented named-session binding.

## playwright-cli-only (hard)

Every browser step must use only commands declared by the repo-local `playwright-cli` skill. Forbidden with **no fallback**: bare `playwright`, `npx playwright`, `playwright test`, `@playwright/test`, Node Playwright API, or generating Playwright/Pytest source. If `playwright-cli` is unavailable, the case must require blocked evidence with `blockedReason: playwright-cli-unavailable` and must not open a browser.

## U/D data ownership (hard for modify/delete)

1. Only mutate data whose ownership is proven by the **current login identity** plus observable UI/API owner fields — never by name, guessed id, or list order alone.
2. If the current user has no suitable data, create tagged, cleanable data in the current-user context, then modify/delete, then cleanup and verify cleanup.
3. If safe create is impossible, only task-authorized Mock may construct data, and the case must label it as Mock (not real backend proof).
4. If ownership is unverifiable and create/Mock are unavailable: require blocked evidence with one of `current-user-data-unavailable`, `data-ownership-unverifiable`, `safe-test-data-setup-unavailable` — never risk cross-user data.
5. Never touch other users' data, shared fixtures, production data, or non-cleanable data.

For every executable sub-scenario, state the fixture/reset operation, UI reset operation, a fresh snapshot before using element references, and the exact evidence write point. If the isolated environment is unavailable, require writing blocked evidence before any browser command; do not open or connect to a browser.

Each case must require the executor to persist, even when blocked:

- `testcase/frontend/evidence/<case-id>/execution.md`
- `testcase/frontend/evidence/<case-id>/case-result.json`

`case-result.json` must be valid JSON containing the matching `caseId`, `status` (`passed`, `failed`, or `blocked`), and an `evidencePaths` array. A blocked result must include a non-empty `blockedReason`, such as `isolated-test-environment-unavailable` or `token-budget-exhausted`, and must never claim or imply a pass. `execution.md` records attempted or blocked steps, base-URL safety decision, fixture/reset and request-observation availability, timestamps, and the evidence-file list. Screenshots, snapshots, traces, videos, and logs are required only when actually available and must stay under the same case evidence directory.
