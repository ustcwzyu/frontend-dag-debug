# Frontend-test case blocking checklist

Shared mechanical rules for `frontend-case-checklist-shell` and generate prompts.
LLM review (when `frontendTest.reviewMode=blocking`) must not invent blocking rules outside this list.

## Blocking (fail closed)

| ruleId | Rule |
|---|---|
| `open-prefix` | Each case body includes `playwright-cli open --browser=chrome --headed <absolute-http(s)-url>` |
| `production-url` | Open URL must not look like a production host |
| `ac-mapping` | Manifest entry has non-empty `acIds` (**acceptance** ids, not case ids) |
| `ac-id-shape` | Each `acIds[]` entry matches `AC-*` / `AC-FE-*` |
| `ac-id-is-case` | `acIds` must not contain `FE-*` case ids |
| `unknown-ac` | When task `sourceBinding.requirementIds` lists ACs, every `acIds` entry must be in that set |
| `case-id-shape` | `caseId` matches `FE-<FEATURE>-<NNN>-...` (never `AC-FE-*`) |
| `case-id-is-ac` | Do not use acceptance id as `caseId` / filename |
| `case-path-mismatch` | `casePath === testcase/frontend/cases/{caseId}.md` |
| `case-file-missing` | `casePath` exists |

## Tool guidance (non-blocking)

- Browser execution should **strongly prefer `playwright-cli`** and the standard start command documented above.
- The fourth node does not scan for or block executable commands from other tools, including `pytest`, bare/native Playwright, `npx playwright`, `playwright test`, `@playwright/test`, or Node Playwright APIs.
- Tool-choice findings belong in later advisory/reporting stages rather than this structural hard gate.

### ID 对照（避免混用）

| 字段 | 正确示例 | 错误示例 |
|---|---|---|
| `caseId` | `FE-LOGIN-001-core` | `AC-FE-001` |
| `acIds` | `["AC-FE-001"]` | `["FE-LOGIN-001-core"]` |
| 文件名 | `FE-LOGIN-001-core.md` | `AC-FE-001.md` |

## Non-blocking (notes only)

- Preferred extra evidence filenames not required by generate
- Style / wording preferences
- Additional network envelope proofs beyond capability matrix

## Pipeline vs quality

- **Pipeline acceptance**: final `testcase/frontend/reports/frontend-test-retrospect-*.md` exists after result materialize
- **Quality**: `frontend-test-result-v1.outcome=passed` with 0 blocked/failed (opt-in via `frontendTest.strictOutcomeGate`)
