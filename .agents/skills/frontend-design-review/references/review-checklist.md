# Frontend Design Review Checklist

## Coverage

- Route/component, non-goals, assumptions, and unresolved ambiguity are explicit.
- Each acceptance criterion maps to steps, files, UI behavior, states, and verification.
- Success/error/loading/empty/disabled/permission/retry/stale/boundary states are handled or N/A.

## Project Fit

- Reuse components, hooks, API helpers, mocks, schemas, router patterns, tokens, and theme rules.
- Cite knowledge base, `openspec/schemas/`, `openspec/project-specs/`, and `ai_workspace/` as parallel sources; failed or empty
  knowledge queries must still search `<repoRoot>/openspec/schemas/`, `<repoRoot>/openspec/project-specs/`, and `<repoRoot>/ai_workspace/`.
- Record source status, query terms, paths/headings, conflicts, authorized deps, and allowed paths for both.

## Interaction / Quality

- Actions, feedback, validation timing, navigation, persistence, recovery, responsive/overflow, focus/keyboard/semantics/contrast/reduced motion, cancellation, and data lifecycle are covered when applicable.

## Verification

- Static/behavior commands are exact, frozen, discoverable, and deterministic.
- Tests prove changed state and flows at supported levels; browser/visual only when task/gate requires.
- Missing required verification is a blocker; optional gaps are disclosed risks.

## Mock Safety

- Strategy line is valid and not `MOCK_STRATEGY: blocked`.
- Mock API fields/states trace to contract evidence; gaps are explicit.
- Prefer native mock; browser intercept only for existing e2e; request adapter only for reversible local preview.
- Real request stays default; activation is explicit, reversible, local/test-only, and production-off.
- Plans use only DAG-frozen shell entrypoints.
- Mock strategies need default-real-path build with Mock off plus Mock-backed behavior evidence.
- `not-needed` needs real/no-remote evidence, or default-auto skipped-Mock rationale with Real Integration Gap preserved when no project Mock capability exists.
- Mock-backed checks prove frontend states only; real integration remains pending until actual backend evidence exists.

## Verdict Matrix

- Request revision for coverage gaps, unsafe scope, unauthorized deps, unresolved required interaction, missing required verification, skipped local specification fallback (`openspec/schemas/`, `openspec/project-specs/`, or `ai_workspace/`), unsafe/missing Mock strategy, or Mock evidence presented as real integration.
- Knowledge-base unavailable but relevant OpenSpec or `ai_workspace/` rules applied is advisory only.
- Optional cleanup that cannot affect acceptance is advisory.
