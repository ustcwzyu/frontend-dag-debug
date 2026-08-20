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

Use `loop-agent task advance` / `loop-agent task status` for non-trivial implementation work; advanced arbitrary DagSpec uses `loop-agent dag execute`.

## Pi Model Matrix

New DAG work reads only `harness.json.executors.pi.LOW`, `MED`, and `HIGH`. Each tier must be a model string or `{ model, thinking? }`; use explicit `provider/model` references when choosing a provider. Fresh init does not write `defaultModel`, `models`, `modelProfiles`, or `modelRouting`. `defaultModel` remains a runtime fallback only for compatible older projects.

```json
{ "executors": { "pi": { "LOW": "provider/low", "MED": "provider/medium", "HIGH": "provider/high" } } }
```

## Adaptive Liveness

- Healthy Pi nodes are no longer stopped by a fixed 30-minute deadline. The default 4h absolute max is a final safety bound and cannot be extended by synthetic heartbeats.
- Runner heartbeat proves only the runner lease. Provider, tool, or output activity records meaningful progress; prolonged inactivity can surface as `quiet`, `suspected-stall`, `probing`, or `needs-attention` in `dag status`, `dag doctor`, and Observe.
- A silent transport is aborted in a controlled way. `termination-unconfirmed` means the old attempt may still exist, so loop-agent fails closed and does not start an automatic retry; inspect the run before any operator recovery.
- `agent-worker` does not set an outer `task advance` / `dag execute` wall-clock by default. An explicit `worker.timeout_ms` remains a hard timeout.

## Operator Recovery

After a run, use `loop-agent dag report --run-id <run-id> --markdown` to read canonical run facts and `loop-agent dag doctor --run-id <run-id> --markdown` to diagnose failed or paused runs. Failed DAG runs should produce a failure handoff via `loop-agent dag closeout-draft --run-id <run-id>` instead of a successful closeout.

Use `ai_workspace/loop-agent/templates/production-readiness-checklist.md` when claiming Production Readiness v0.1 for low/medium-risk single-repo DAG work.

For real product-line Worker samples, use `ai_workspace/loop-agent/templates/worker-dogfood-setup.md` and `ai_workspace/loop-agent/templates/worker-dogfood-evidence.md`. Explicit failed-task retries must preserve prior evidence and use a new worker run id.

## Script Matrix

`scripts/check-repo.sh` verifies loop-agent governance. `scripts/ci-tests.sh` handles target project verification through conservative language/toolchain detection and should be adapted after reading the project.
Copy or project only stack-agnostic governance scripts. For project-specific verification, packaging, release, or maintenance commands, generate the target-project version from templates plus the target repository's actual files instead of copying loop-agent's own TypeScript-specific scripts.
