# Feature Workflow

This document describes how work should move through this target repository using loop-agent.

## Session Protocol

1. Orient: read `README.md`, `harness.json`, `AGENTS.md`, and this docs index.
2. Select: choose one bounded work block.
3. Contract: state deliverables, non-goals, completion criteria, verification commands, and failure conditions.
4. Implement: make the smallest coherent change and update required docs, scripts, and tests.
5. Verify: run governance checks plus target project verification.
6. Handoff: record evidence in docs/progress, docs/reports, an exec plan, or an ADR when useful.

## Agent DAG Path

```bash
loop-agent new-task <task-id> "Task title"
# write .harness/tasks/<task-id>/source/需求.md
# write .harness/tasks/<task-id>/source/执行约束.md
loop-agent dag run-task <task-id> --profile auto --strict-models --output <temp-dir>/<task-id>-dag.json
loop-agent dag validate --dag <temp-dir>/<task-id>-dag.json --strict-models --strict-governance
loop-agent run-dag --dag <temp-dir>/<task-id>-dag.json --cwd .
```

For changes that affect the project's public contract, execution surface, delivery pipeline, automation/governance, data model, security or permission model, cross-module behavior, or user-visible workflows, this is a hard pre-edit gate: create the task, write both source files, generate the DAG, and review the DAG/writeSet before editing implementation files.

Before executing a DAG, review profile routing, governance profile, writer writeSet, allowed paths, forbidden paths, shell verification, and decision gate mode.

## Verification

Use `docs/verification-matrix.md` to choose the narrowest command that proves the claim.
