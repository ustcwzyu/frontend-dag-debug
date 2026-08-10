---
name: frontend-verification
description: Use to assess frontend evidence and produce closeout.
references:
  - path: references/verification-checklist.md
    required: true
    maxChars: 3000
---

# Frontend Verification

Use for `frontend-closeout-pi`. Shell nodes execute commands; this read-only skill
assesses their evidence. Read the checklist first.

Inputs: criteria, change inventory, shell commands/status/artifacts, review
verdict/findings, and required browser, visual, manual, or knowledge evidence.

## Evidence Rules

- Static evidence covers type/build/schema; behavior evidence must exercise the flow.
  Lint has its own assessment status: `passed`, `baseline-debt`, `failed`, or
  `unavailable`.
- Shell exit status is authoritative. Classify as `passed`, `failed`, `not-run`,
  `blocked`, or `unavailable`; only passed satisfies a required check.
- Never use static success as behavior proof, or tests as visual/browser proof they did not exercise.
- Mock-backed behavior proves frontend rendering and state transitions only. It never
  proves backend readiness, transport compatibility, or real API integration.
- Unavailable commands remain gaps.
- `baseline-debt` is not lint passed. It requires
  `frontend-lint-assessment-v1` proving only pre-writer diagnostics on unchanged
  files. Report debt count, changed files, and raw evidence. Typecheck/build/test do
  not support debt.
- Use design and requirement evidence already bound inside
  `contracts/frontend-review-context.json`. Closeout must not query connectors,
  re-open task sources, OpenSpec, AI workspace, upstream model prose, or start new
  repository research.
- Separate Mock service/handler checks from page consumption and record the
  dev/test-only boundary; handler tests alone do not prove page use.

## Method And Output

Map required checks to fresh evidence, classify gaps, confirm review pass, and state
only proven changes.

Return Markdown headings:

- `Changes`: changed behavior and areas.
- `Mock Decision`, `Mock Files`, `Mock Verification`, `Production Boundary`.
- `Verification Evidence`: table of check, command/source, status, and artifact/result.
  Keep lint `baseline-debt` verbatim rather than converting it to `passed`.
- `Review Result`: exact review verdict and findings.
- `Known Risks`: missing optional checks and environment caveats.
- `Follow-up`: concrete work or `None`.

With only Mock evidence, state `Frontend status: mock-validated`; when default `auto`
skipped Mock without real API evidence, state `Frontend status: locally-validated`.
Both require `Real integration: pending` and explicit
`<task-id>-real-api-integration-verify` follow-up; it is not auto-created/executed.

Do not edit files. Do not claim complete when review is not pass or a required check
is failed, not-run, blocked, unavailable, stale, or contradicted.
