# Feature Workflow

This document describes how work should move through this target repository using loop-agent.

## Session Protocol

1. Orient: read `README.md`, `harness.json`, `AGENTS.md`, and this docs index.
2. Select: choose one bounded work block.
3. Contract: state deliverables, non-goals, completion criteria, verification commands, and failure conditions.
4. Implement: make the smallest coherent change and update required docs, scripts, and tests.
5. Verify: run governance checks plus target project verification.
6. Handoff: record evidence in ai_workspace/loop-agent/progress, ai_workspace/loop-agent/reports, an exec plan, or an ADR when useful.

## Agent DAG Path

```bash
loop-agent task advance <task-id> "Task title" \
  --prd <prd.md> \
  --allowed-path "<glob>" \
  --verify "<label>:<command>" \
  --json
# Review writeSet gate digest, then:
loop-agent task advance <task-id> --approve-gate "write-set-review:<digest>" --json
loop-agent task status <task-id> --json
```

For changes that affect the project's public contract, execution surface, delivery pipeline, automation/governance, data model, security or permission model, cross-module behavior, or user-visible workflows, this is a hard pre-edit gate: create the task, write both source files, generate the DAG, and review the DAG/writeSet before editing implementation files.

Before executing a DAG, review profile routing, governance profile, writer writeSet, allowed paths, forbidden paths, shell verification, and decision gate mode.
Generated DAGs bind authoritative task-source paths, SHA-256 hashes, and explicit REQ/BR/AC identifiers. Frontend plans with explicit identifiers pass a deterministic coverage gate before final design review and implementation.
After an interrupted run, repair the task source and regenerate the complete DAG. Do not construct an impl-only recovery DAG from an upstream summary; strict governance rejects a v3 orphan writer without sourceBinding or a read-only planner ancestor.

## Specialized Task Kinds

- standard tasks first use the structured task type in `source/需求.md`, then combine `allowedPaths` with strong React/Next/Vue project evidence for deterministic routing.
- A frontend project defaults eligible implementation work to the frontend DAG without requirement keyword matching. Explicit backend, mixed, frontend-negated, and documentation/test-only scopes keep the template selected by the normal governance profile.
- `frontend-mock-assess-pi` reads Mock/API/schema evidence and selects `native|browser-intercept|request-adapter|not-needed|blocked` before frontend planning; its deterministic gate rejects blocked or malformed output, while the existing frontend implementer remains the only writer.
- Mock-backed verification never proves real API integration. When the backend was not exercised, closeout must retain the gap and name `<task-id>-real-api-integration-verify`; that follow-up is explicitly created/run after backend readiness, never automatic.
- Automatic frontend classification selects the frontend implementation workflow and persists taskKind; explicit profiles, workflowPolicy, and supervised quality gates record governance strength without switching the business workflow back to a generic DAG.
- A backend implementation does not select the backend test DAG. `backend-test` remains an explicit test-engineering workflow.
- Explicit specialized `taskKind` values remain compatible and take precedence over task-source classification.

Set an explicit specialized `taskKind` in `.harness/tasks/<task-id>/task.json` only when the dedicated workflow itself is part of the task contract:

- `taskKind: "frontend-implementation"` explicitly selects the frontend DAG for compatibility or intentional override. Optional `frontendMock` config sets `policy: auto|required|disabled`, an existing `serviceRoot`, and generation-time-frozen `verifyCommands`; an unsafe or incomplete explicit required contract produces an assessment-only DAG with no writer, while a complete required contract adds Mock-specific verification only when trusted commands exist. Auto API tasks without a native service may use an existing browser interception harness or reversible request adapter, then continue through static and behavior verification.
- `taskKind: "backend-test"` selects the dedicated backend test DAG. Its Pi nodes analyze requirements, generate and review backend cases, generate pytest, and retrospect on results; shell gate/execution nodes enforce the review verdict and run the target project's pytest. The backend test templates (`backend-test-dag.json` and the `backend-test-dag.*.prompt.md` files) ship inside the loop-agent package as static references and are projected to target projects under the governance `templates/` directory.
- `taskKind: "knowledge-sync"` selects the Feature-scoped test-knowledge write-back DAG (collect → draft → validate → apply → pointer). Bind `featureId` in `task.json` (or hardConstraints / requirement text). It writes only under `features/<featureId>/…` after final verification evidence exists.
- `taskKind: "knowledge-graph-bootstrap"` selects the business knowledge-graph bootstrap DAG (preflight → inventory → propose → validate → review → gate → promote → materialize). AI writes only `knowledge/bootstrap/staging/**`; promote is merge-new-only.
- `taskKind: "frontend-test"` selects the FE-test RAG DAG. It writes a traceable frontend RAG package and Markdown case manifest, then executes manifest cases serially with `playwright-cli` in isolated test environments and retains per-case evidence. It never generates pytest or Playwright source code. `frontendTest.maxCasesPerBatch` defaults to 20 (maximum 50); optional `maxTokensPerCase` and `maxTotalTokens` stop only later cases after a completed case's token usage is recorded, marking them `blocked: token-budget-exhausted`. Generated browser startup uses `playwright-cli open --browser=chrome <base-url>`; the generic playwright-cli skill is unchanged.
- Only eligible read-only Pi nodes (planner, scout, reviewer, verifier, closeout with no write-capable tool profile) receive the conservative automatic retry policy. Supervisor, implementer, writer, docs-only, dynamic, shell, static, and decision-gate nodes are not retried automatically. Eligible nodes cannot write repository files; the controller only records immutable attempt evidence under `.harness/dag-runs/<state>/<run-id>/<node-id>/attempt-<n>.json`.

Use the package-backed public knowledge CLI for graph operations. Do not require target projects to run package-only kb runtime scripts:

```bash
loop-agent knowledge graph-init --product-name <name>
# edit knowledge/bootstrap/scope.yaml, then:
loop-agent task advance <task-id> --task-kind knowledge-graph-bootstrap --json
loop-agent knowledge query --mode by_feature --feature F-2026-004 --json
loop-agent knowledge query --mode by_id --id SVC-order --json
loop-agent knowledge query --mode search --text "keyword" --json
loop-agent knowledge graph-incremental-prepare --feature F-2026-004 --service <service>
# review the prepared scope/staging; for a manual reviewed promotion:
loop-agent knowledge graph-promote
loop-agent knowledge graph-materialize
```

Daily Feature test-knowledge write-back still uses `taskKind: "knowledge-sync"` with a bound `featureId`, separate from graph bootstrap/incremental entry points.

## Verification

Use `ai_workspace/loop-agent/verification-matrix.md` to choose the narrowest command that proves the claim.
