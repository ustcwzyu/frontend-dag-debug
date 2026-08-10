# Frontend Review Findings Guide

## Severity

- **Critical**: blocks primary flow, corrupts data, violates security/privacy, writes forbidden paths, bypasses required verification.
- **Important**: acceptance/state/validation gap, material convention drift, missing behavior tests, unauthorized dependency, unsafe mock activation/import, mock-contract drift, misleading real-integration claim, or failed/missing required verification.
- **Minor**: non-blocking maintainability, copy, layout, or cleanup issue.

## Evidence

- Cite tight file locations, exact commands/results, or named DAG artifacts.
- Never invent evidence; name the missing check. An implementation summary is not the actual diff.
- Failed required static/behavior verification is at least Important. Lint may be
  `baseline-debt` only with a valid `frontend-lint-assessment-v1`; this is not a
  passed lint result. A changed-file lint diagnostic, new unmatched diagnostic,
  command drift, missing baseline, timeout, or unparseable output is Important.
- Treat knowledge base, `openspec/schemas/`, `openspec/project-specs/`, and `ai_workspace/` as
  parallel sources. Record connector/query/source/time plus openspec search terms and
  matched paths/headings; label fallback or unavailable accurately.

## Review Sequence

1. Establish changed-file inventory and write boundaries.
2. Compare original requirement with derived contract/constraints.
3. Map each criterion to code, states, tests, and evidence.
4. Inspect interactions, state/data/API behavior, failure paths, and regressions.
5. Check mock selection, contract-to-fixture mapping, activation/default path,
   handler/fixture/adapter and consumer diff, verification, production imports, and
   the real-integration gap.
6. Check design evidence, responsive/a11y behavior, dependencies, and maintenance.
7. Classify findings and derive the verdict mechanically.

Skipping either directory is Important when design compliance affects acceptance.

```text
- [Critical|Important|Minor] path:line — Problem; impact; required correction; evidence.
```

## Pass Rules

- No Critical or Important findings remain.
- Required static and behavior nodes ran and passed.
- Lint is `passed` or evidence-backed `baseline-debt`; typecheck, build, and test are
  passed. Any debt count and affected unchanged files remain disclosed.
- Changed files are authorized.
- Criteria and applicable states have implementation and evidence.
- Required Mock-backed behavior passed; any generated Mock-specific verification also
  passed; Mock is not enabled by default in production. For default-auto skipped
  Mock, the real request remains default and the Real Integration Gap is preserved.
- Optional unavailable knowledge/browser/visual/manual checks remain explicit risks.
