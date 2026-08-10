---
name: frontend-bounded-implement
description: >-
  Use only for frontend implementation and repair writers after the canonical
  contract gate has authorized a bounded write set.
---

# Frontend Bounded Implement

## Authoritative Inputs

- For implementation, use the run-owned
  `contracts/frontend-implementation-contract.json`.
- For repair, also use `contracts/frontend-repair-assessment.json`.
- Treat requirement `expectedOutcome`, interaction `trigger` /
  `expectedBehavior`, target files, UI states, Mock/API strategy, and verification
  targets as closed decisions. Do not rediscover or reinterpret them.

## Exploration Boundary

- Read the canonical contract, its declared target files, and only directly
  imported/called local code needed to edit those targets safely.
- Do not open task sources, plans, reviews, OpenSpec, `ai_workspace/`, knowledge
  bases, or unrelated repository areas. Do not recursively search the repository.
- Start the bounded edit after confirming the contract and targets. Optional
  context is not a reason to postpone implementation.
- If behavior is still ambiguous or a required target is outside `writeSet`, stop
  with `IMPLEMENTATION_OUTCOME: blocked`; do not compensate with broader scouting.

## Implementation Discipline

- Work test-first where behavior changes. Preserve unrelated files and stay inside
  `allowedPaths` and `writeSet`.
- Implement every requirement outcome, interaction, and applicable UI state
  assigned to the writer. Keep the real request path enabled by default and use
  only the approved Mock/API strategy.
- Do not add dependencies unless the contract approves them. Never relax lint,
  type, test, or build configuration; never add `.skip` or `.only`.
- Run only the focused checks already frozen by the task. Leave full verification
  to downstream deterministic nodes.

## Required Outcome

The first non-empty response line must be exactly one of:

- `IMPLEMENTATION_OUTCOME: changed` — a non-empty bounded diff was produced.
- `IMPLEMENTATION_OUTCOME: already-satisfied` — the contract was already met and
  no file changed.
- `IMPLEMENTATION_OUTCOME: blocked` — implementation cannot proceed without
  guessing or exceeding the write boundary.

Then report changed files, requirements/interactions implemented, tests or focused
checks attempted, and residual risks. Never report `changed` for an empty diff.
