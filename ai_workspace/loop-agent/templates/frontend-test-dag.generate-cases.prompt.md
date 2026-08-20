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

Each case is independently executable and includes AC mapping (`acIds`), preconditions, cleanup, a semantic assertion, and its isolated evidence path. Use dimensions `core`, `boundary`, `flow`, or `backend`. Never guess API fields, constraints, SLA, credentials, or unrecorded data. For passed authority, include a successful `playwright-cli find ...` after `open` and before controller post-execution cleanup; `snapshot`, `goto`, `screenshot`, `request`/`console`, and ordinary interactions are not assertions.

Every case must copy the concrete absolute base URL from `testcase/frontend/rag/context.md` only after the environment shell has marked `environmentProbe: reachable`. Do not derive a different origin and do not leave a base-url placeholder.

Every case must start with `playwright-cli open --browser=chrome` followed by that concrete context URL. Do not copy an angle-bracket URL placeholder into a generated executable case line.

### Dynamic element refs (hard)

- Executable `playwright-cli` lines must never contain angle-bracket dynamic-ref tokens such as `<fresh-ref>` or descriptive `<...>` placeholders.
- Use only shell-safe documentation placeholders `eX`, `eY`, ... for dynamic element refs. Each placeholder means the real `eNN` ref parsed from the immediately preceding latest `snapshot` output.
- Before each element interaction, write a fresh `snapshot` step. A later snapshot invalidates earlier refs: do not reuse a stale ref.
- `eX`/`eY` are documentation placeholders, not literal structured-tool arguments; the browser child resolves them to the current real `eNN` before its tool call.

At execution time the browser child translates each `playwright-cli` line into one structured `playwright_cli` tool call (no Bash). Keep Markdown steps as CLI lines so the executor can map them 1:1.

For file evidence, use canonical `--filename` only. For screenshots, use `playwright-cli screenshot --filename final.png`; when a real ref from the latest `snapshot` is needed, use `playwright-cli screenshot e5 --filename final.png`. For PDF use `playwright-cli pdf --filename final.pdf`. A `snapshot` without filename is response-only; for a file use `playwright-cli snapshot --filename snapshot.txt`. Never write `playwright-cli screenshot <path>`, use `--path`, `--output`, or `--file`, or put an output path in a positional target slot.

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

`case-result.json` must be valid JSON containing the matching `caseId`, final `status` (`passed`, `failed`, or `blocked`), and an `evidencePaths` array. A rerun must overwrite this same file with its final status and integer `rerunAttempt`; the final report consumes that latest file. A blocked result must include a non-empty `blockedReason`, such as `isolated-test-environment-unavailable` or `token-budget-exhausted`, and must never claim or imply a pass. `execution.md` records attempted or blocked steps, base-URL safety decision, fixture/reset and request-observation availability, timestamps, and the evidence-file list. When available, use fixed headings `### 执行摘要` and `### 实际执行步骤` so the bounded deterministic report extractor can show actual execution facts. Available evidence files are required only when actually produced and must stay under the same case evidence directory.


## Standard scenarios (controller)

- Read `testcase/frontend/rag/standard-scenarios.v1.json` when present.
- Cover each `priority=must` scenario with at least one case or record an explicit GAP in coverage-map.
- Each case Markdown SHOULD include `## 测试点` and `## 测试步骤` sections.
- Prefer linking cases via `standardScenarioIds` in manifest.draft notes when possible.
