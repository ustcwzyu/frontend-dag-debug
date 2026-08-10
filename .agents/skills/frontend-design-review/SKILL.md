---
name: frontend-design-review
description: Use for the frontend plan design gate before any writer runs.
references:
  - path: references/review-checklist.md
    required: true
    maxChars: 3600
---

# Frontend Design Review

For frontend design review nodes. Read the checklist; audit contract, scout, Mock
strategy, effective plan, task bounds, and traceable design evidence.
Knowledge base, OpenSpec, and `ai_workspace/` are parallel sources. Query the
knowledge-base connector when available; always search/read `openspec/schemas/**`,
`openspec/project-specs/**`, and `ai_workspace/**` before accepting conventions.
Connector format is TODO: never invent results.

## Verdict Contract

First non-empty line: exactly `VERDICT: pass` or `VERDICT: request-revision`.
Any blocker requires request-revision. An initial pass is the effective verdict;
there is no intermediate first-design shell gate.

In standard/full topology, revision and final review run only after initial
`VERDICT: request-revision`. Verify every Required Plan Correction against the
complete revision; reject remaining, incomplete, or new gaps. An initial pass uses
the original plan and skips both conditional nodes.

Small-risk topology instead removes initial review and revision, then runs
`frontend-final-design-review-pi` as the sole review of the original plan. Do not
expect initial findings or a revision there.

The deterministic gate prefers final-review output and falls back to initial review
only when no current-run final output exists. Existing malformed/non-pass primary
output fails closed.

## Blocking Conditions

- Any criterion lacks implementation/verification; UI states lack reasons; a
  dependency lacks permission; confirmed primitives/rules are ignored; design claims
  lack knowledge-base or required openspec specification evidence; paths cross
  write bounds; commands are missing/non-deterministic; or
  interaction, responsive, accessibility, data, or failure behavior requires guessing.
- `MOCK_STRATEGY: blocked`; missing permitted target paths, endpoint/schema-to-fixture
  mapping, fixed verification, or dev/test-only activation; a second Mock framework;
  inline fake data; commented real requests; Mock-on production defaults; test-only
  production imports; or Mock evidence reported as real integration.

Knowledge-base absence is advisory if relevant rules from either openspec
specification directory were read and applied. Block skipped fallback, unresolved
conflict, or unresolved UI decisions.

## Method And Output

Map criteria to steps/files/states/checks, audit paths/evidence, classify Blocking
or Advisory, and never edit files.

### Spec Evidence Rules

Run `grep`/`find`, then explicit `read` calls for applicable specs/checklist. Only
successful paired reads count as “已读取规范文件”; summaries do not. List each path/
section in `Checked Items`; search/read both openspec specification directories
before accepting conventions.

```markdown
VERDICT: pass

## Findings
- None blocking.

## Required Plan Corrections
- None.

## Checked Items
- ...
```

Each correction names its criterion/section, gap, and exact plan change.
