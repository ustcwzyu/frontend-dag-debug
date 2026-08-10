# loop-agent Harness

This target project, `frontend-dag-debug`, is initialized to use loop-agent for governed task execution.

## Runtime Layout

- `.harness/tasks/` stores task state and source materials.
- `.harness/dag-runs/` stores DAG run facts.
- `.harness/runs/` stores one-shot executor facts.
- `.harness/task-pool/` stores optional agent-worker Task Pool state, batch artifacts, failure handoffs, and local Observe events; it is runtime state and normally ignored by Git.
- `ai_workspace/loop-agent/` stores loop-agent generated governance, plans, reports, progress, and decisions.
- `.agents/skills/` stores project repo-local skill instructions; the CLI can fall back to bundled package skills when needed.

## Default Workflow

Use `loop-agent new-task`, `loop-agent dag run-task`, `loop-agent dag validate`, and `loop-agent run-dag` for non-trivial implementation work.

## Operator Recovery

After a run, use `loop-agent dag report --run-id <run-id> --markdown` to read canonical run facts and `loop-agent dag doctor --run-id <run-id> --markdown` to diagnose failed or paused runs. Failed DAG runs should produce a failure handoff via `loop-agent dag closeout-draft --run-id <run-id>` instead of a successful closeout.

Use `ai_workspace/loop-agent/templates/production-readiness-checklist.md` when claiming Production Readiness v0.1 for low/medium-risk single-repo DAG work.

For real product-line Worker samples, use `ai_workspace/loop-agent/templates/worker-dogfood-setup.md` and `ai_workspace/loop-agent/templates/worker-dogfood-evidence.md`. Explicit failed-task retries must preserve prior evidence and use a new worker run id.

## Script Matrix

`scripts/check-repo.sh` verifies loop-agent governance. `scripts/ci-tests.sh` handles target project verification through conservative language/toolchain detection and should be adapted after reading the project.
Copy or project only stack-agnostic governance scripts. For project-specific verification, packaging, release, or maintenance commands, generate the target-project version from templates plus the target repository's actual files instead of copying loop-agent's own TypeScript-specific scripts.
