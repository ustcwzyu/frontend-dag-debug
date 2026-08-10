# Frontend Node Contracts

Pre-write nodes are read-only. Preserve IDs, labels, commands, language, required headings.

## Core nodes

- **`frontend-contract-pi`**: `Scope`, `Non-goals`, `Acceptance Criteria`, `UI States`, `Target Runtime Environment`, `Risks`, `Verification Expectations`. No guessed requirements.
- **`frontend-scout-pi`**: routes, components, tokens, data/API/Mock, scripts, tests, assets. Fact vs inference vs gap. Query the knowledge base when available and always search+read `openspec/schemas/`, `openspec/project-specs/`, and `ai_workspace/` before repo fallback. Output stack, routes, components, styling, conventions, state/data, test entry points, reuse, risks.
- **`frontend-plan-pi` + conditional design loop**: AC → explicit observable `expectedOutcome`, interactions → explicit `trigger` + `expectedBehavior`, then steps, in-bound files, applicable UI states, reuse, deps, Mock/API strategy, activation/rollback, frozen verify entrypoints, real-integration gap, and exactly one `frontend-implementation-contract-v1` JSON object. IDs plus file paths are not sufficient behavior semantics. Use `uiStates: []` for logic-only changes with no user-visible UI state; do not invent UI states. Applicable states require behavior/implementation/verification, while non-applicable states require a reason and omit empty behavior placeholders. Prefer native Mock; browser intercept only with existing e2e; request-adapter only for a reversible seam. `auto` with absent/ambiguous project Mock capability must select `not-needed`, keep real requests default, and record the gap; `required` cannot select `not-needed`. Initial design pass uses the original plan; only exact `request-revision` runs read-only revision plus final review. Small-risk runs one design review only.
- **`frontend-prewrite-gate-shell`**: the sole write authorization. Resolve effective plan/review, require exact pass, retain every REQ/BR/AC id, enforce Mock policy, validate schema/source binding and writeSet containment, and materialize `contracts/frontend-implementation-contract.json`. A planned fixture or consumer may be a future writer output and need not exist before authorization. Fallback is allowed only when a conditional primary is absent; an existing malformed primary fails closed. Generation-time blocked Mock produces one deterministic blocking shell node and no writer.
- **`frontend-implement-pi`**: sole regular exclusive writer and consumer of `frontend-bounded-implement`, not this discovery skill. Stay in `writeSet`; real requests default-on; Mock reversible, dev/test-only, production-off. Atomic handler/intercept/adapter with consumer+tests. Stop on forbidden paths or guesses. First line must be `IMPLEMENTATION_OUTCOME: changed|already-satisfied|blocked`; runtime checks it against the attributed diff. Optional mock-verify when frozen; static+behavior always; behavior must prove page consumption. Skipped-Mock `not-needed` keeps real integration pending unless the real backend path has fresh evidence.

## Contract / trace / stages (M1–M2)

- `frontend-verify-assess-shell` runs Mock/static/behavior command groups, binds contract `verificationTargets` to command labels and file/symbol evidence, then writes `frontend-verification-trace.json` and `frontend-repair-assessment.json`. Browser/visual remain `not-run`.
- `frontend-review-context-shell` captures the real diff and combines contract, effective trace, repair assessment, and diff into `contracts/frontend-review-context.json`.
- Implement stages: (1) contract confirm (2) tests sync (3) component/UI (4) API/Mock (5) frozen checks (6) diff cleanup. Summary: Contract Ref, Changed Files, Requirements, UI States, Tests, Verification Attempts, Deviations, Residual Risks.

## Repair (M3)

Only `eligible=true` runs `frontend-repair-pi` (same writeSet as implement; no re-spec; max 1 attempt) and `frontend-reverify-shell`. No failure condition-skips both. Non-repairable contract/path/dependency/credential/deploy/spec-unclear failures fail closed.

## Risk & capability (M4–M6)

Deterministic risk (no model); high-risk beats small; supervised never small. Standard/high-risk contain 15 top-level nodes; small contains 13 by omitting revision and final review. Capability seed injects adapters; openspec specs and task sources outrank adapter guidance. A11y: static/component tools only when present; Browser a11y always not-run.
