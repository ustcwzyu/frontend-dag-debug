# Frontend Verification Checklist

## Static And Behavior Evidence

- Required type/compile, lint/format, build, schema/client, browser/e2e/manual checks ran.
- Lint is recorded as `passed | baseline-debt | failed | unavailable`.
  `baseline-debt` cites `frontend-lint-baseline-v1` and
  `frontend-lint-assessment-v1`, writer changed files, tolerated diagnostic count,
  command identity, and raw output hashes; it is never labeled passed.
- Every remaining lint diagnostic is on an unchanged file and matches the
  writer-preceding baseline. Changed-file diagnostics, new unmatched diagnostics,
  command drift, timeout, worktree mutation, or unparseable output fail closed.
- Typecheck, build, and test are fully passed; none accepts baseline debt.
- Generated output was authorized; tests cover changed logic, flows, and regressions.
- Fixed entrypoints prove selected-strategy behavior and applicable UI states.
- Mock-specific checks cover service/handler/schema/fixtures; behavior evidence separately proves page consumption.
- Mock activation is explicit/non-production; a default-real-path build with Mock off proves the real request remains default.
- `not-needed` has real/no-remote evidence or a default-auto skipped-Mock rationale.
- Mock-backed evidence is frontend-only and never satisfies real API integration.

## Design And Component Evidence

- Claims cite knowledge-base, OpenSpec, and `<repoRoot>/ai_workspace/` sources.
- Evidence records query/source/time, local-spec terms, paths, headings, and rules.
- OpenSpec or `ai_workspace/` matches satisfy source availability; none blocks required design decisions.

## Status

- `passed`: fresh successful evidence matches current implementation.
- `failed`: check ran and failed.
- `not-run`: no fresh attempt exists.
- `blocked`: a prerequisite prevented execution.
- `unavailable`: tool, environment, connector, or source was absent.

Only passed satisfies a required check. For lint alone, evidence-backed
`baseline-debt` may continue as explicit debt; it replaces no other check.

## Closeout Checks

- List exact commands/source/exit status/artifacts; map every criterion to evidence or a named gap.
- Record review verdict before completion.
- Do not conflate static, behavior, browser/visual/manual, or knowledge-base proof.
- If only Mock evidence exists, report `Frontend status: mock-validated` and `Real integration: pending`, with actual API verification follow-up.
- If default `auto` skipped Mock and no real API evidence exists, report `Frontend status: locally-validated` and `Real integration: pending`.

Output uses Changes, Verification Evidence, Mock Decision/Files/Verification,
Production Boundary, Review Result, Known Risks, and Follow-up headings. If review is
not pass or a required check fails, describe the task as incomplete with follow-up.
