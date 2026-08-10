---
name: frontend-implementation
description: >-
  Use for frontend contract, scout, mock strategy, and plan DAG nodes.
references:
  - path: references/node-contracts.md
    required: true
    # Compact contract index must stay under skill total budget (~10k with body + other refs).
    # Headroom above current ~4k file; do not raise alone without checking totalMaxChars.
    maxChars: 6000
  - path: references/design-spec.md
    required: true
    maxChars: 3000
  - path: references/code-standards.md
    required: true
    maxChars: 3000
---

# Frontend Implementation

Read all required references before running any listed frontend node.

## Source And Evidence Rules

Use task sources/references, constraints, then `task.json`. Follow `design-spec.md`:
query the knowledge base when available and always inspect `openspec/schemas/`,
`openspec/project-specs/`, and `ai_workspace/`; then use repo evidence. Cite tight paths/symbols, and never invent APIs,
rules, commands, or retrievals. Scout/planners locate and explicitly read applicable
specs; only successful paired reads count. Lockfile-only, fixture-only, or unread
search hits do not prove a reusable Mock service.

This broad discovery rule applies only to contract, scout, and plan phases.
Implementation and repair use the separate `frontend-bounded-implement` skill.

## Implementation Discipline

- Reuse confirmed specs, components, tokens, helpers, APIs, mocks, schemas, and tests.
- Keep real requests enabled by default; never comment them out for a mock.
- Prefer native Mock support; otherwise use existing browser interception for e2e or
  a reversible request adapter/DI seam for local preview.
- Trace fixtures to API/schema evidence. Activation is explicit, dev/test-only,
  production-off; Mock evidence never proves real API integration.
- Add dependencies only when approved. Cover applicable success/loading/empty/error/
  permission/boundary states and justify N/A.
- Keep state testable. Stay in `writeSet`, preserve behavior, and update tests.
- Never relax lint/type/test/build config or write unauthorized generated output.

## Output And Failure Rules

- Follow `node-contracts.md`; read-only nodes never edit. Missing input blocks work
  when proceeding would guess behavior, bounds, or verification.
- Preserve tokens, commands, paths, IDs, and language. Completion needs fresh shell evidence.
