---
name: frontend-review
description: Use to review completed frontend code and verification before closeout.
references:
  - path: references/review-findings.md
    required: true
    maxChars: 2800
---

# Frontend Review

Use for `frontend-review-pi`; read the findings guide first. Required inputs are
original task/reference material, effective plan/design branch, implementation summary,
and `contracts/frontend-review-context.json`. That canonical context binds the validated
implementation contract, effective verification trace, repair assessment, optional
`frontend-lint-assessment-v1`, and run-owned diff. The diff is authoritative.

## Verdict Contract

The first non-empty line must be exactly `VERDICT: pass` or
`VERDICT: request-revision`. Any Critical/Important finding, failed or missing
required check, forbidden write, or unmet acceptance criterion forces revision.

## Review Scope

- Compare intent, contract, plan, diff, and evidence; report altered requirements.
- Inspect every changed file against allowed, forbidden, and approved write scope.
- Map criteria to behavior, applicable UI states, tests, and shell evidence.
- Review state/data flow, validation, async/error behavior, design, responsive/a11y,
  dependencies, maintenance, and regression risk when applicable.
- Inspect static, behavior, and available Mock-specific artifacts directly. For Mock
  strategies, compare the endpoint matrix, handler/fixture/adapter and consumer diff;
  require the real request as default, contract-aligned fixtures, production isolation,
  and no false real-integration claim. `not-needed` needs applicable real/no-remote
  evidence, or an explicit default-auto skipped-Mock rationale with the Real
  Integration Gap preserved when no project Mock capability is confirmed.
- Inspect lint assessment directly. `baseline-debt` requires intact evidence, only
  baseline-matched diagnostics on unchanged files, and none on writer-changed files.
  Report debt, never `lint passed`; `failed`/`unavailable` blocks. Typecheck, build,
  and test still require successful final exits.
- Component/design claims need both knowledge-base and local openspec evidence. Query
  the connector when available and always read task-relevant files under
  `<repoRoot>/openspec/schemas/`, `<repoRoot>/openspec/project-specs/`, and `<repoRoot>/ai_workspace/`.
  Connector format is TODO; never invent evidence. Only successful `read` calls are
  observable as "已读取规范文件".
- Treat shell exit status as authoritative. Do not edit files.

## Evidence And Output

Findings cite a tight file location, exact command/result, or named DAG artifact.
Separate confirmed defects, missing evidence, and residual risks using Findings,
Verification Assessment, UX Assessment, and Residual Risks headings.

A pass requires no Critical/Important findings and all required shell checks passed.
Still report knowledge-source status and optional browser/manual gaps.
